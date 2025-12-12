import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

JSON配列のみで返してください。
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices[0].message.content;
    const results = JSON.parse(text);

    res.status(200).json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
