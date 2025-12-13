import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const q = req.query.q;

    if (!q) {
      return res.status(400).json({ results: [] });
    }

    /**
     * ここが肝
     * 入力語に対して「逆・対立・反転概念」を検索結果っぽく生成させる
     */
    const prompt = `
あなたは検索エンジンです。
次の単語の「反対・逆・対立する概念」に関する
実在しそうな検索結果を3件作ってください。

条件:
- title: 検索結果のタイトル
- url: 実在しそうなURL（example.comは禁止）
- description: 検索結果の説明文
- JSONのみで出力

検索語: ${q}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
    });

    const text = completion.choices[0].message.content;

    // JSONだけ抜き取る（保険）
    const json = JSON.parse(text);

    res.status(200).json(json);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      results: [],
      error: "search failed",
    });
  }
}
