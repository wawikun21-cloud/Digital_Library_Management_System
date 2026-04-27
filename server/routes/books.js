// ─────────────────────────────────────────────────────────
//  routes/books.js
// ─────────────────────────────────────────────────────────

const express          = require("express");
const router           = express.Router();
const BookModel        = require("../models/Book");
const booksController  = require("../controllers/booksController");
const lexoraController = require("../controllers/lexoraController");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

// ── GET /api/books ────────────────────────────────────────
router.get("/", requireAuth, requireAdmin, booksController.getBooks);

// ── POST /api/books ───────────────────────────────────────
router.post("/", requireAuth, requireAdmin, booksController.createBook);

// ── STATIC routes — MUST be before /:id ──────────────────

// GET /api/books/public-search?title=...&author=...  (public — no auth needed)
router.get("/public-search", async (req, res) => {
  try {
    const { title, author } = req.query;

    if (!title && !author) {
      return res.status(400).json({ success: false, error: "Please provide at least a title to search." });
    }

    const conditions = [];
    const params     = [];

    if (title) {
      conditions.push("(LOWER(b.title) LIKE ?)");
      params.push(`%${title.toLowerCase()}%`);
    }
    if (author) {
      conditions.push("(LOWER(b.author) LIKE ?)");
      params.push(`%${author.toLowerCase()}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [nemcoRows] = await require("../config/db").pool.query(
      `SELECT
         b.id, b.title, b.author, b.genre, b.year, b.publisher,
         b.shelf, b.status, b.cover, b.isbn, b.edition,
         b.accessionNumber, b.callNumber, b.pages,
         b.sublocation,
         COALESCE(cc.total_copies, b.quantity) AS total_copies,
         COALESCE(cc.avail_copies, b.quantity) AS available_copies,
         CASE
           WHEN cc.total_copies IS NULL THEN b.status
           WHEN cc.avail_copies = 0     THEN 'OutOfStock'
           ELSE 'Available'
         END AS display_status,
         'nemco' AS source
       FROM books b
       LEFT JOIN (
         SELECT book_id,
           COUNT(*)                  AS total_copies,
           SUM(status = 'Available') AS avail_copies
         FROM book_copies WHERE is_deleted = 0 GROUP BY book_id
       ) cc ON cc.book_id = b.id
       ${whereClause}
       ORDER BY b.title ASC
       LIMIT 50`,
      params
    );

    const lexConditions = [];
    const lexParams     = [];
    if (title) {
      lexConditions.push("LOWER(REPLACE(REPLACE(title, '\\n', ' '), '\\r', ' ')) LIKE ?");
      lexParams.push(`%${title.toLowerCase()}%`);
    }
    if (author) {
      lexConditions.push("LOWER(REPLACE(REPLACE(COALESCE(author,''), '\\n', ' '), '\\r', ' ')) LIKE ?");
      lexParams.push(`%${author.toLowerCase()}%`);
    }
    const lexWhere = lexConditions.length ? `WHERE ${lexConditions.join(" AND ")}` : "";

    const [lexoraRows] = await require("../config/db").pool.query(
      `SELECT
         id, title, author, year,
         source AS source_url, collection, resource_type, program,
         subject_course, format,
         NULL AS shelf, 'Available' AS status, NULL AS cover, NULL AS isbn,
         NULL AS edition, NULL AS total_copies, NULL AS available_copies,
         NULL AS sublocation,
         'lexora' AS source
       FROM lexora_books
       ${lexWhere}
       ORDER BY title ASC
       LIMIT 50`,
      lexParams
    );

    const combined = [...nemcoRows, ...lexoraRows].sort((a, b) =>
      a.title.localeCompare(b.title)
    );

    res.json({ success: true, data: combined, total: combined.length });
  } catch (err) {
    console.error("[GET /api/books/public-search]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/books/count/all
router.get("/count/all", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await BookModel.getCount();
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error("[GET /api/books/count/all]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/books/stats
// FIX: the old inline handler only returned nemcoTotal/nemcoOutOfStock/lexoraTotal/returned
//      and never included borrowedBooks or overdueBooks — those KPI cards always showed 0.
//      Now delegates to booksController.getStats which calls analyticsService.getBookStats()
//      and returns the full payload: borrowedBooks, overdueBooks, totalCopies, availableCopies, etc.
router.get("/stats", requireAuth, requireAdmin, booksController.getStats);

// GET  /api/books/lexora
router.get("/lexora", requireAuth, requireAdmin, lexoraController.getLexoraBooks);

// POST /api/books/lexora
router.post("/lexora", requireAuth, requireAdmin, lexoraController.createLexoraBook);

// PUT  /api/books/lexora/:id
router.put("/lexora/:id", requireAuth, requireAdmin, lexoraController.updateLexoraBook);

// DELETE /api/books/lexora/:id
router.delete("/lexora/:id", requireAuth, requireAdmin, lexoraController.deleteLexoraBook);

// POST /api/books/lexora-import
router.post("/lexora-import", requireAuth, requireAdmin, lexoraController.bulkLexoraImport);

// POST /api/books/check-duplicates
router.post("/check-duplicates", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { books } = req.body;
    if (!Array.isArray(books) || !books.length) {
      return res.status(400).json({ success: false, error: "No books provided" });
    }
    const result = await BookModel.checkDuplicatesBatch(books);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({
      success:             true,
      hasDuplicates:       result.hasDuplicates       || false,
      duplicateTitles:     result.duplicateTitles     || [],
      duplicateAccessions: result.duplicateAccessions || [],
    });
  } catch (err) {
    console.error("[POST /api/books/check-duplicates]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/books/bulk-import
router.post("/bulk-import", requireAuth, requireAdmin, booksController.bulkImport);

// POST /api/books/lexora-check-duplicates
// Lightweight pre-import duplicate check — no writes, read-only.
router.post("/lexora-check-duplicates", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { books } = req.body;
    if (!Array.isArray(books) || !books.length) {
      return res.status(400).json({ success: false, error: "No books provided" });
    }
    const result = await LexoraBookModel.checkDuplicates(books);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, duplicates: result.duplicates });
  } catch (err) {
    console.error("[POST /api/books/lexora-check-duplicates]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── DYNAMIC routes — AFTER all static routes ─────────────

// GET /api/books/:id/copies/public  ← NO AUTH — used by the public landing page
// Returns only: accession_number, status, date_acquired for each live copy.
// Intentionally omits condition_notes and internal IDs.
router.get("/:id/copies/public", async (req, res) => {
  try {
    const { pool } = require("../config/db");
    const bookId   = req.params.id;

    // Verify the book exists and is not deleted
    const [[book]] = await pool.query(
      "SELECT id FROM books WHERE id = ? AND is_deleted = 0 LIMIT 1",
      [bookId]
    );
    if (!book) {
      return res.status(404).json({ success: false, error: "Book not found" });
    }

    const [rows] = await pool.query(
      `SELECT accession_number, status, date_acquired
       FROM   book_copies
       WHERE  book_id = ? AND is_deleted = 0
       ORDER  BY id ASC`,
      [bookId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[GET /api/books/:id/copies/public]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/books/:id
router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await BookModel.getById(req.params.id);
    if (!result.success) return res.status(404).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[GET /api/books/:id]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/books/:id/copies
router.get("/:id/copies", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await BookModel.getCopies(req.params.id);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[GET /api/books/:id/copies]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// PUT /api/books/:id
router.put("/:id", requireAuth, requireAdmin, booksController.updateBook);

// DELETE /api/books/:id
router.delete("/:id", requireAuth, requireAdmin, booksController.deleteBook);

module.exports = router;