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

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" }, // ★超重要
      messages: [
        {
          role: "user",
          content: `
「${query}」を検索した人が
無意識に期待していないが
概念的に「逆」だと考えられる検索テーマを考えてください。

以下の形式のJSONのみで返してください。

{
  "results": [
    {
      "title": "",
      "url": "https://example.com",
      "description": ""
    }
  ]
}
`
        }
      ]
    });

    const json = JSON.parse(
      completion.choices[0].message.content
    );

    res.status(200).json(json);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
