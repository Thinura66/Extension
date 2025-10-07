const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Highlight = require("../src/models/Highlight");
const connectDB = require("../src/config/db");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Connect DB (only once)
if (mongoose.connection.readyState === 0) {
  connectDB();
}

// Routes
app.post("/api/highlights", async (req, res) => {
  try {
    const { userId, url, text, color } = req.body;
    if (!userId || !url || !text)
      return res.status(400).json({ error: "Missing required fields" });

    const highlight = new Highlight({ userId, url, text, color });
    await highlight.save();
    res.status(201).json(highlight);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/highlights", async (req, res) => {
  try {
    const { userId, url } = req.query;
    if (!userId || !url)
      return res.status(400).json({ error: "Missing required fields" });

    const highlights = await Highlight.find({ userId, url }).sort({ createdAt: -1 });
    res.json(highlights);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/highlights/:id", async (req, res) => {
  try {
    const deleted = await Highlight.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ error: "Highlight not found" });
    res.json({ message: "Deleted", id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 👇 Key difference for Vercel — export handler
module.exports = app;
