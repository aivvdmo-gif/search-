export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { threadId, message } = req.body;

  if (!threadId) {
    return res.status(400).json({ error: "no threadId" });
  }

  if (message && message.length > 100) {
    return res.status(400).json({ error: "message too long" });
  }

  const baseUrl = process.env.STORAGE_REST_API_URL;
  const token = process.env.STORAGE_REST_API_TOKEN;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  const countKey = `count:${threadId}`;
  const listKey = `list:${threadId}`;

  try {
    // 現在の人数を取得
    const countRes = await fetch(`${baseUrl}/get/${countKey}`, {
      headers
    });
    const countJson = await countRes.json();
    let count = Number(countJson.result) || 0;

    // 初回：AIが補助
    if (count === 0) {
      await fetch(`${baseUrl}/rpush/${listKey}`, {
        method: "POST",
        headers,
        body: JSON.stringify(["こんにちは、人間。"])
      });

      await fetch(`${baseUrl}/incr/${countKey}`, {
        method: "POST",
        headers
      });

      count = 1;
    }

    // 1000人でリセット
    if (count >= 1000) {
      await fetch(`${baseUrl}/del/${listKey}`, {
        method: "POST",
        headers
      });
      await fetch(`${baseUrl}/del/${countKey}`, {
        method: "POST",
        headers
      });

      return res.status(200).json({
        reset: true,
        message: "thread reset"
      });
    }

    // 投稿があれば追加
    if (message) {
      await fetch(`${baseUrl}/rpush/${listKey}`, {
        method: "POST",
        headers,
        body: JSON.stringify([message])
      });

      await fetch(`${baseUrl}/incr/${countKey}`, {
        method: "POST",
        headers
      });

      count += 1;
    }

    // 最新2件取得
    const listRes = await fetch(
      `${baseUrl}/lrange/${listKey}/-2/-1`,
      { headers }
    );
    const listJson = await listRes.json();
    const messages = listJson.result || [];

    // 前の前は化け文字
    const display = messages.map((m, i) =>
      i === 0 && messages.length === 2
        ? "▒▒▒▒▒▒▒▒▒▒"
        : m
    );

    res.status(200).json({
      count,
      messages: display
    });

  } catch (e) {
    res.status(500).json({ error: "failed", detail: String(e) });
  }
}
