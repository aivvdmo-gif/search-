export default async function handler(req, res) {
  const q = req.query.q;
  if (!q) {
    return res.status(400).json({ results: [] });
  }

  // 反語を作る（最初は固定ロジックでOK）
  const antonymQuery = `反対語 ${q}`;

  const apiKey = process.env.SERPER_API_KEY;

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey
    },
    body: JSON.stringify({
      q: antonymQuery,
      gl: "jp",
      hl: "ja",
      num: 5
    })
  });

  const data = await response.json();

  const results = (data.organic || []).map(item => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet
  }));

  res.status(200).json({ results });
}
