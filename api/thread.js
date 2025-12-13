// api/thread.js
// 検索語 × 変換語 ごとに独立した会話スレッド
// Upstash KV（Vercel KV）使用前提

export default async function handler(req, res) {
  const method = req.method;

  const key = (req.query.key || "").toString();
  if (!key) {
    return res.status(400).json({ error: "no key" });
  }

  const storeKey = `thread:${key}`;

  try {
    if (method === "GET") {
      const state = await load(storeKey);

      // 1人目用 AI 補助（保存しない）
      let aiHint = null;
      if (state.count === 0) {
        aiHint = await aiBootstrap(key);
      }

      return res.status(200).json({
        count: state.count,
        prev: state.prev,
        prevBroken: state.prevBroken,
        aiHint
      });
    }

    if (method === "POST") {
      const body = await readJson(req);
      const text = (body.text || "").trim();

      if (!text) {
        return res.status(400).json({ error: "empty text" });
      }
      if (text.length > 100) {
        return res.status(400).json({ error: "text too long" });
      }

      let state = await load(storeKey);

      // 1000人でリセット
      if (state.count >= 1000) {
        state = emptyState();
      }

      const nextCount = state.count + 1;

      const newBroken =
        state.prev ? breakJapanese(state.prev, nextCount) : state.prevBroken;

      const nextState = {
        count: nextCount,
        prev: text,
        prevBroken: newBroken
      };

      await save(storeKey, nextState);

      return res.status(200).json({
        ok: true,
        count: nextCount
      });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "failed", detail: String(e) });
  }
}

/* ================= helpers ================= */

function emptyState() {
  return {
    count: 0,
    prev: null,
    prevBroken: null
  };
}

async function load(key) {
  const raw = await kvGet(key);
  if (!raw) return emptyState();
  try {
    return JSON.parse(raw);
  } catch {
    return emptyState();
  }
}

async function save(key, state) {
  await kvSet(key, JSON.stringify(state));
}

/* -------- 日本語を「読めそうで読めない」状態に壊す -------- */

function breakJapanese(text, seed) {
  const chars = [...text];
  let s = seed * 9301 + 49297;

  return chars
    .map((ch, i) => {
      // 句読点・空白は残す
      if (/[ \n\r\t、。！？.,]/.test(ch)) return ch;

      s = (s * 233 + i) % 100;

      if (s < 40) return ch;        // 残る
      if (s < 70) return "…"        // 曖昧
      return randomKana(s);         // 誤読
    })
    .join("");
}

function randomKana(n) {
  const pool = "あいうえおかきくけこさしすせそなにぬねのまみむめも";
  return pool[n % pool.length];
}

/* -------- AI：1人目用の起動ノイズ -------- */

async function aiBootstrap(key) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "（まだ誰もここにいない）";

  const [input, opposite] = key.split("__");

  const prompt = `
テーマ：
「${input}」と「${opposite}」の関係とは何か。

あなたは説明しない。
結論も言わない。
最初の人が書き込みたくなるような
短い違和感だけを1つ出す。
50文字以内。
`;

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
        { role: "system", content: "短く。説明禁止。" },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!r.ok) return "（ここから始めていい）";

  const j = await r.json();
  return (j.choices?.[0]?.message?.content || "").slice(0, 60);
}

/* -------- リクエスト body 読み込み -------- */

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;

  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => (data += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch (e) {
        reject(e);
      }
    });
  });
}

/* -------- Upstash KV -------- */

async function kvGet(key) {
  const url =
    process.env.STORAGE_REST_API_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;

  const token =
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!r.ok) return null;

  const j = await r.json();
  return j?.result ?? null;
}

async function kvSet(key, value) {
  const url =
    process.env.STORAGE_REST_API_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;

  const token =
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return;

  await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ value })
  });
}
