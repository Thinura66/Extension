const cors = require("cors");
const Highlight = require("../src/models/Highlight");
const connectDB = require("../src/config/db");

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', corsOptions.origin);
    res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', corsOptions.origin);
  res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));

  try {
    await connectDB();

    if (req.method === 'POST') {
      const { userId, url, text, color } = req.body;
      if (!userId || !url || !text)
        return res.status(400).json({ error: "Missing required fields" });

      const highlight = new Highlight({ userId, url, text, color });
      await highlight.save();
      return res.status(201).json(highlight);

    } else if (req.method === 'GET') {
      const { userId, url } = req.query;
      if (!userId || !url)
        return res.status(400).json({ error: "Missing required fields" });

      const highlights = await Highlight.find({ userId, url }).sort({ createdAt: -1 });
      return res.json(highlights);

    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id)
        return res.status(400).json({ error: "Missing highlight ID" });

      const deleted = await Highlight.findByIdAndDelete(id);
      if (!deleted)
        return res.status(404).json({ error: "Highlight not found" });
      return res.json({ message: "Deleted", id });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'OPTIONS']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
