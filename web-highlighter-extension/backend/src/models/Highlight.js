const mongoose = require("mongoose");

const highlightSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  url: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Highlight", highlightSchema);
