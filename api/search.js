export default async function handler(req, res) {
  const q = req.query.q;
  if (!q) {
    return res.status(400).json({ error: "no query" });
  }

  try {
    // 1️⃣ 反転語をAIで取得（必ず文字列）
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
            content: "説明禁止。必ず日本語の名詞を1語だけ返せ。"
          },
          {
            role: "user",
            content: `「${q}」の反対概念を1語で`
          }
        ],
        temperature: 1
      })
    });

    const aiJson = await aiRes.json();

    const opposite =
      aiJson?.choices?.[0]?.message?.content
        ?.replace(/\s/g, "")
        ?.split(/[、。\n]/)[0] || "無機物";

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
