// api/thread.js
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  const { key } = req.query;
  if (!key) {
    return res.status(400).json({ error: "no key" });
  }

  // ===== 投稿を保存する =====
  if (req.method === "POST") {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "no text" });
    }

    // 既存ログを取得
    const logs = (await redis.get(key)) || [];

    // 最大1000人でリセット
    const nextLogs = [...logs.slice(-999), text];

    await redis.set(key, nextLogs);

    return res.status(200).json({ ok: true });
  }

  // ===== 表示用（読む） =====
  if (req.method === "GET") {
    const logs = (await redis.get(key)) || [];

    const prev = logs[logs.length - 1] || null;
    const prev2 = logs[logs.length - 2] || null;

    return res.status(200).json({
      count: logs.length,
      prev,
      prev2,
    });
  }

  res.status(405).end();
}
