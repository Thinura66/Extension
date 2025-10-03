const Highlight = require("../models/Highlight");

exports.saveHighlight = async (req, res) => {
  try {
    const { userId, url, text } = req.body;
    const highlight = new Highlight({ userId, url, text });
    await highlight.save();
    res.status(201).json(highlight);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getHighlights = async (req, res) => {
  try {
    const { url, userId } = req.params;
    const highlights = await Highlight.find({ url, userId });
    res.json(highlights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteHighlight = async (req, res) => {
  try {
    await Highlight.findByIdAndDelete(req.params.id);
    res.json({ message: "Highlight deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
