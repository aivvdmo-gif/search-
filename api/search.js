export default async function handler(req, res) {
  try {
    const { query } = req.body;

    if (!query || query.trim() === "") {
      return res.status(200).json({ results: [] });
    }

    // ★ ここで強制的にログを返す
    return res.status(200).json({
      results: [
        {
          title: "APIは生きている",
          url: "https://example.com",
          description: `query = ${query}`
        }
      ]
    });

  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({
      error: err.message || "unknown error"
    });
  }
}
