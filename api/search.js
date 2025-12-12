export default async function handler(req, res) {
  try {
    const { query } = req.body;

    if (!query || query.trim() === "") {
      return res.status(200).json({ results: [] });
    }

    const prompt = `
「${query}」を検索した人が、
無意識に期待していないが、
概念的に“逆”だと考えられる検索テーマを考えてください。

Google検索結果の形式で、
以下を3件、日本語で出力してください。

- title
- url（https://example.com でOK）
- description

JSONのみで返してください。
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    const text = data.choices[0].message.content;
    const json = JSON.parse(text);

    res.status(200).json({ results: json });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OpenAI API error" });
  }
}
