export default async function handler(req, res) {
  const q = req.query.q;
  if (!q) {
    return res.status(400).json({ error: "no query" });
  }

  try {
    // 1️⃣ 「成立条件を裏切る語」をAIで取得（必ず1語）
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
入力語に対して、
それが“自然に存在しているように見える理由”を壊す
日本語の名詞を1語だけ返してください。

常識的な対義語・分類上の反対語は禁止。
説明・比喩・修飾語は禁止。
人間があまり結びつけたくない語を優先してください。
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

    // 2️⃣ Serper検索
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

    const results = (searchJson.organic || []).slice(0, 5).map(r => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet
    }));

    res.status(200).json({
      input: q,
      opposite,
      results
    });

  } catch (e) {
    res.status(500).json({ error: "failed", detail: String(e) });
  }
}
