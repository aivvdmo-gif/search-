export default async function handler(req, res) {
  const method = req.method || "GET";

  const q = (req.query.q || "").toString();
  const o = (req.query.o || "").toString();

  if (!q || !o) {
    return res.status(400).json({ error: "missing q or o" });
  }

  const key = makeThreadKey(q, o);

  try {
    if (method === "GET") {
      const state = await loadState(key);

      // 0人（=まだ投稿なし）のときだけAIが「起動ノイズ」を返す（保存しない）
      let aiHint = null;
      if ((state.count || 0) === 0) {
        aiHint = await makeAiHint(q, o);
      }

      return res.status(200).json({
        q, o,
        count: state.count || 0,
        last: state.last || null,
        prev: state.prev || null,
        prevGarbled: state.prevGarbled || null,
        aiHint
      });
    }

    if (method === "POST") {
      const body = await readJson(req);
      const text = (body?.text || "").toString().trim();

      if (!text) return res.status(400).json({ error: "empty" });
      if (text.length > 100) return res.status(400).json({ error: "too long (max 100)" });

      let state = await loadState(key);

      // 1000人でリセット：1000人目の投稿が入った時点で消す
      // ここでは「投稿を受け付ける前に count を見て」1000到達なら全消去→新規扱い
      if ((state.count || 0) >= 1000) {
        state = { count: 0, last: null, prev: null, prevGarbled: null };
      }

      const nextCount = (state.count || 0) + 1;

      // 劣化：前の前の人は「ギリギリ読めない」へ
      // 現在 state.prev が「前の人」、state.prevGarbled が「前の前の人（劣化済）」という扱い
      const newPrevGarbled = state.prev ? garble(state.prev, nextCount) : state.prevGarbled;

      const newState = {
        count: nextCount,
        last: text,              // 今回投稿した人（表示では「あなた」側に使ってもよい）
        prev: text,              // 次に来た人にとっての「前の人」
        prevGarbled: newPrevGarbled // 次に来た人にとっての「前の前の人（劣化）」
      };

      await saveState(key, newState);

      return res.status(200).json({
        ok: true,
        count: nextCount
      });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "failed", detail: String(e?.message || e) });
  }
}

/* ---------------- helpers ---------------- */

function makeThreadKey(q, o) {
  // 検索語×変換語ごとの別スレッド（露出はOKだが、キーは短く固定化）
  const raw = `q:${q}__o:${o}`;
  return "thread:" + fnv1a(raw);
}

// FNV-1a hash
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function garble(text, salt) {
  // 「ギリギリ読めない」：文字の一部だけ残し、句読点・空白は残す
  const keepPunct = /[ \n\r\t、。.,!?！？「」『』（）()\[\]【】…ー\-]/;
  const chars = [...text];
  let seed = (salt * 2654435761) >>> 0;

  return chars.map((ch, idx) => {
    if (keepPunct.test(ch)) return ch;

    // 疑似乱数（決定的）
    seed ^= (idx + 1) * 374761393;
    seed = (seed ^ (seed >>> 13)) >>> 0;
    const r = seed % 100;

    // 65%を潰す、35%を残す（ギリギリ読めない）
    if (r < 65) return "▒";
    return ch;
  }).join("");
}

async function makeAiHint(q, o) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "（AI補助：OPENAI_API_KEYが未設定です）";

  const prompt = `
テーマ：「検索語」と「検索結果語」の関係とは。
検索語: ${q}
検索結果語: ${o}

あなたは場を起動する存在です。
1人目に向けて、短い問い／断片／違和感だけを1つ返してください。
50文字以内。説明しない。
`.trim();

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 1,
      messages: [
        { role: "system", content: "短く。説明禁止。1つだけ。" },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!r.ok) return "（AI補助の取得に失敗しました）";
  const j = await r.json();
  const t = (j?.choices?.[0]?.message?.content || "").trim();
  return t.slice(0, 60) || "（ここには、まだ誰もいません。）";
}

async function readJson(req) {
  // Vercel Node runtime: req.body が既にオブジェクトの場合もある
  if (req.body && typeof req.body === "object") return req.body;

  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch (e) { reject(e); }
    });
  });
}

/* ---- KV storage (Vercel KV / Upstash REST) ---- */

async function loadState(key) {
  const json = await kvGet(key);
  if (!json) return { count: 0, last: null, prev: null, prevGarbled: null };
  try { return JSON.parse(json); }
  catch { return { count: 0, last: null, prev: null, prevGarbled: null }; }
}

async function saveState(key, state) {
  await kvSet(key, JSON.stringify(state));
}

function getKvEnv() {
  // Vercel KV (Upstash) でよく使われる変数名に対応
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;

  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  return { url, token };
}

async function kvGet(key) {
  const { url, token } = getKvEnv();
  if (!url || !token) {
    // ストレージ未設定だと永続化できない（ここは“壊す”より明示）
    return null;
  }

  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!r.ok) return null;

  const j = await r.json();
  return j?.result ?? null;
}

async function kvSet(key, value) {
  const { url, token } = getKvEnv();
  if (!url || !token) return;

  const r = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ value })
  });

  if (!r.ok) {
    // 失敗してもユーザー体験を止めない（ただし永続化されない）
    return;
  }
}
