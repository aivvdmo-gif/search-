import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { query } = req.body;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: `「${query}」について一言だけ日本語で答えてください`
        }
      ],
    });

    res.status(200).json({
      ok: true,
      message: completion.choices[0].message.content,
    });

  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
