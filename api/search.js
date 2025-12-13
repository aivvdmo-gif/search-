// api/search.js
export default async function handler(req, res) {
  try {
    const q = req.query.q;

    if (!q) {
      return res.status(400).json({ error: "query missing" });
    }

    // 🔴 まずは動作確認用の仮レスポンス
    // ここが通れば「API構成は完全に正しい」
    const results = [
      {
        title: `「${q}」の反転概念（仮）`,
        description: "ここにAIで生成した反転概念を使った検索結果が入る",
        link: "https://example.com"
      }
    ];

    res.status(200).json({ results });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "internal server error" });
  }
}
