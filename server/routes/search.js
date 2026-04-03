// ─────────────────────────────────────────────────────────
//  routes/search.js
//  Public search endpoints — no auth required
// ─────────────────────────────────────────────────────────

const express          = require("express");
const { search, suggestions } = require("../controllers/searchController");

const router = express.Router();

// GET /api/search?q=keyword
router.get("/", search);

// GET /api/suggestions?q=keyword
router.get("/suggestions", suggestions);

module.exports = router;