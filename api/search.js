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

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0].message.content;

let results;
try {
  results = JSON.parse(text);
} catch (e) {
  results = [];
}

res.status(200).json({ results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
