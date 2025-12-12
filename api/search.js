export default async function handler(req, res) {
  try {
    const { query } = req.body || {};
    if (!query) {
      return res.status(200).json({ results: [] });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `
「${query}」を検索した人が
無意識に期待していないが
概念的に逆だと考えられる検索テーマを
Google検索結果形式で3件、日本語JSONで出してください。

形式:
[
  { "title": "", "url": "https://example.com", "description": "" }
]
`
          }
        ]
      })
    });

    const data = await response.json();
    const text = data.choices[0].message.content;
    const results = JSON.parse(text);

    res.status(200).json({ results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "OpenAI error" });
  }
}
