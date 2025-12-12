export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { query } = req.body;

    if (!query || query.trim() === "") {
      return res.status(200).json({ results: [] });
    }

    const prompt = `
「${query}」を検索した人が、
無意識に期待していないが、
概念的に「逆」だと考えられる検索テーマを考えてください。

Google検索結果の形式で、以下を3件、日本語で出力してください。

必ずこのJSON形式だけで返してください。

{
  "results": [
    {
      "title": "",
      "url": "https://example.com",
      "description": ""
    }
  ]
}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9
      })
    });

    const data = await response.json();

    // 🔴 ここが修正ポイント
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    res.status(200).json({
      results: parsed.results
    });

  } catch (err) {
    console.error("API ERROR:", err);
    res.status(500).json({ error: "API error" });
  }
}
