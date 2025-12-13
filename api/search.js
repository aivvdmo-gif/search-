import OpenAI from "openai";

export default async function handler(req, res) {
  const q = req.query.q;
  if (!q) {
    return res.status(400).json({ error: "query required" });
  }

  try {
    // ① OpenAI：象徴的に最も遠い概念を1語だけ出させる
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "あなたは詩人です。論理や辞書的対義語は禁止。入力された単語から、象徴的・世界観的に最も遠い概念を、日本語の名詞1語だけで返してください。説明は禁止。",
        },
        {
          role: "user",
          content: q,
        },
      ],
      temperature: 1.0,
    });

    const oppositeWord = completion.choices[0].message.content.trim();

    // ② Serper：AIが出した1語で現実検索
    const serperRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.SERPER_API_KEY,
      },
      body: JSON.stringify({
        q: oppositeWord,
        gl: "jp",
        hl: "ja",
      }),
    });

    const serperData = await serperRes.json();

    const results =
      serperData.organic?.map((item) => ({
        title: item.title,
        link: item.link,
        description: item.snippet,
      })) || [];

    // ③ フロントに返す
    res.status(200).json({
      original: q,
      opposite: oppositeWord,
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "search failed" });
  }
}
