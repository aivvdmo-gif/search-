// api/thread.js
// Upstash KV を使った 1スレッド型の記憶（Vercel KV対応）

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

export default async function handler(req, res) {
  const key = req.query.key;

  if (!key) {
    return res.status(400).json({ error: "no key" });
  }

  const baseKey = `thread:${key}`;

  try {
    // ===== GET（読み込み）=====
    if (req.method === "GET") {
      const data = (await redis.get(baseKey)) || {
        count: 0,
        messages: []
      };

      const msgs = data.messages || [];

      return res.status(200).json({
        prev: msgs[msgs.length - 1] || null,
        prev2: msgs[msgs.length - 2] || null,
        count: data.count || 0
      });
    }

    // ===== POST（書き込み）=====
    if (req.method === "POST") {
      const { text } = req.body || {};

      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "no text" });
      }

      let data = (await redis.get(baseKey)) || {
        count: 0,
        messages: []
      };

      // 最大1000人でリセット
      if (data.count >= 1000) {
        data = { count: 0, messages: [] };
      }

      data.messages.push(text);
      data.count += 1;

      // 最新2件だけ保持
      data.messages = data.messages.slice(-2);

      await redis.set(baseKey, data);

      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();

  } catch (e) {
    return res.status(500).json({
      error: "thread failed",
      detail: String(e)
    });
  }
}
