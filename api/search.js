export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.body;

  if (!query || query.trim() === "") {
    return res.status(200).json({ results: [] });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: `
「${query}」を検索した人が、
無意識に期待していないが、
概念的に「逆」だと考えられる検索テーマを考えてください。

以下を3件、日本語でJSON配列として出力してください。

[
  { "title": "...", "url": "https://example.com", "description": "..." }
]
`
          }
        ],
      }),
    });

    const data = await response.json();
    const text = data.choices[0].message.content;
    const results = JSON.parse(text);

    res.status(200).json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "API error" });
  }
}
