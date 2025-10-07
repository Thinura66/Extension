const Highlight = require("../src/models/Highlight");
const connectDB = require("../src/config/db");

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectDB();

    const { method } = req;
    
    if (method === "POST") {
      const { userId, url, text, color } = req.body;
      if (!userId || !url || !text) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const highlight = new Highlight({ userId, url, text, color });
      await highlight.save();
      return res.status(201).json(highlight);
    }

    if (method === "GET") {
      const { userId, url } = req.query;
      if (!userId || !url) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const highlights = await Highlight.find({ userId, url }).sort({ createdAt: -1 });
      return res.json(highlights);
    }

    if (method === "DELETE") {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "Missing highlight ID" });
      }
      const deleted = await Highlight.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ error: "Highlight not found" });
      }
      return res.json({ message: "Deleted", id });
    }

    return res.status(405).json({ error: `Method ${method} not allowed` });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
