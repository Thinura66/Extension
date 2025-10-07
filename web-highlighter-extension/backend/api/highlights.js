const Highlight = require("../src/models/Highlight");
const connectDB = require("../src/config/db");

export default async function handler(req, res) {
  await connectDB();

  const { method } = req;
  if (method === "POST") {
    const { userId, url, text, color } = req.body;
    if (!userId || !url || !text)
      return res.status(400).json({ error: "Missing required fields" });
    const highlight = new Highlight({ userId, url, text, color });
    await highlight.save();
    return res.status(201).json(highlight);
  }

  if (method === "GET") {
    const { userId, url } = req.query;
    if (!userId || !url)
      return res.status(400).json({ error: "Missing required fields" });
    const highlights = await Highlight.find({ userId, url }).sort({ createdAt: -1 });
    return res.json(highlights);
  }

  return res.status(405).json({ error: `Method ${method} not allowed` });
}
