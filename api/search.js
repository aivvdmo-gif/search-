import fetch from "node-fetch";

export default async function handler(req, res) {
  const q = req.query.q;
  if (!q) {
    return res.status(400).json({ error: "no query" });
  }

  try {
    // 1️⃣ AIで「反対概念を1語だけ」決める
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
            content: "あなたは概念変換装置です。説明は禁止。必ず名詞1語だけ返してください。"
          },
          {
            role: "user",
            content: `「${q}」の反対概念を1語で`
          }
        ],
        temperature: 1
      })
    });

    const aiData = await aiRes.json();
    const oppositeWord = aiData.choices[0].message.content.trim();

    // 2️⃣ Serperでその語を検索
    const searchRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        q: oppositeWord,
        gl: "jp",
        hl: "ja"
      })
    });

    const searchData = await searchRes.json();

    // 3️⃣ 必要な形だけ返す
    const results = (searchData.organic || []).slice(0, 5).map(r => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet
    }));

    res.status(200).json({
      input: q,
      opposite: oppositeWord,
      results
    });

  } catch (e) {
    res.status(500).json({ error: "failed" });
  }
}
