import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { query } = req.body;

    if (!query || query.trim() === "") {
      return res.status(200).json({ results: [] });
    }

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `
「${query}」を検索した人が
無意識に期待していないが
概念的に“逆”だと考えられる検索テーマを3つ考えてください。

次のJSON形式“のみ”で出力してください。

[
  {
    "title": "...",
    "url": "https://example.com",
    "description": "..."
  }
]
      `,
    });

    const text = response.output_text;

    const results = JSON.parse(text);

    return res.status(200).json({ results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
