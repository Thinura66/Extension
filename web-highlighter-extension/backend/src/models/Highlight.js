const mongoose = require("mongoose");

const highlightSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  url: { type: String, required: true },
  text: { type: String, required: true },
  color: { type: String, default: "yellow" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Highlight || mongoose.model("Highlight", highlightSchema);
