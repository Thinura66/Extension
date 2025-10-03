const express = require("express");
const cors = require("cors");
const connectDB = require("../config/db");
const Highlight = require("../models/Highlight");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

connectDB();

// POST /api/highlights → Save highlight
app.post("/", async (req, res) => {
  try {
    const { userId, url, text, color, context } = req.body;
    if (!userId || !url || !text) return res.status(400).json({ error: "Missing fields" });

    const highlight = new Highlight({ userId, url, text, color, context });
    await highlight.save();
    res.status(201).json(highlight);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/highlights?url=...&userId=...
app.get("/", async (req, res) => {
  try {
    const { url, userId } = req.query;
    if (!url || !userId) return res.status(400).json({ error: "Missing fields" });

    const highlights = await Highlight.find({ userId, url }).sort({ createdAt: -1 });
    res.json(highlights);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/highlights/:id
app.delete("/:id", async (req, res) => {
  try {
    const deleted = await Highlight.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Highlight not found" });
    res.json({ message: "Deleted", id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Export as serverless function
module.exports = app;
