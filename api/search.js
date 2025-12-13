// api/search.js
// 検索語 → AI変換 → 検索結果
// 2番目に「こんにちは、人間」スレッドへのリンクを混入

export default async function handler(req, res) {
  const q = req.query.q;
  if (!q) {
    return res.status(400).json({ error: "no query" });
  }

  try {
    // ① AIで変換語を取得
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
あなたは「言葉の前提を裏切る装置」です。
常識的な対義語は禁止。
説明せず、日本語の名詞を1語だけ返してください。
`
          },
          {
            role: "user",
            content: `入力語：「${q}」`
          }
        ],
        temperature: 1
      })
    });

    const aiJson = await aiRes.json();

    const opposite =
      aiJson?.choices?.[0]?.message?.content
        ?.replace(/\s/g, "")
        ?.split(/[、。\n]/)[0] || "制度";

    // ② Serperで検索
    const searchRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: opposite,
        gl: "jp",
        hl: "ja"
      })
    });

    const searchJson = await searchRes.json();

    let results = (searchJson.organic || []).slice(0, 5).map(r => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet
    }));

    // ③ 「こんにちは、人間」リンクを2番目に注入
    const threadKey = `${q}__${opposite}`;

    // ★★★ ここが修正点（thread → thread.html） ★★★
    const threadLink = `/thread.html?key=${encodeURIComponent(threadKey)}`;

    const injected = {
      title: "こんにちは、人間",
      link: threadLink,
      snippet: "（この検索結果は、検索の外側に触れています）"
    };

    if (results.length >= 2) {
      results.splice(1, 0, injected);
    } else {
      results.push(injected);
    }

    return res.status(200).json({
      input: q,
      opposite,
      results
    });

  } catch (e) {
    return res.status(500).json({
      error: "failed",
      detail: String(e)
    });
  }
}
