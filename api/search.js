export default async function handler(req, res) {
  try {
    const { query } = req.body;

    if (!query || query.trim() === "") {
      return res.status(200).json({ results: [] });
    }

    return res.status(200).json({
      results: [
        {
          title: "テスト結果",
          url: "https://example.com",
          description: `「${query}」の逆として返された仮の結果です`
        }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
