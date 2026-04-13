/**
 * server/routes/books.js  —  add these two lines to your existing router
 * ─────────────────────────────────────────────────────────────────
 * 1. Import the new handlers at the top of your books.js routes file:
 *
 *   const { checkDuplicates, bulkImport } = require("../controllers/booksController_bulkImport");
 *   // or if you merged into booksController.js:
 *   // const { ..., checkDuplicates, bulkImport } = require("../controllers/booksController");
 *
 * 2. Register the routes BEFORE any /:id catch-all routes:
 */

const express    = require("express");
const router     = express.Router();
const { verifyToken } = require("../middleware/authMiddleware"); // adjust path if needed

// ── existing imports (keep yours) ────────────────────────────────
// const { getBooks, addBook, ... } = require("../controllers/booksController");

// ── new bulk-import handlers ──────────────────────────────────────
const { checkDuplicates, bulkImport } = require("../controllers/booksController_bulkImport");

/**
 * POST /api/books/check-duplicates
 * Pre-flight: returns which titles / accession numbers already exist.
 * Must be defined BEFORE any /:id wildcard route.
 */
router.post("/check-duplicates", verifyToken, checkDuplicates);

/**
 * POST /api/books/bulk-import
 * Accepts up to ~10 books per request (chunked by the frontend).
 * Inserts new books + book_copies rows; skips duplicates gracefully.
 */
router.post("/bulk-import", verifyToken, bulkImport);

// ── rest of your existing routes ─────────────────────────────────
// router.get("/",    verifyToken, getBooks);
// router.post("/",   verifyToken, addBook);
// router.get("/:id", verifyToken, getBook);
// ...

module.exports = router;
