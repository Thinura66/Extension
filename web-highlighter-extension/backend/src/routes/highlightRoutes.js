const express = require("express");
const router = express.Router();
const { saveHighlight, getHighlights, deleteHighlight } = require("../controllers/highlightController");

router.post("/", saveHighlight);
router.get("/:url/:userId", getHighlights);
router.delete("/:id", deleteHighlight);

module.exports = router;
