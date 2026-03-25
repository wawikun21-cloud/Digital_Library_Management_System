// ─────────────────────────────────────────────────────────
//  routes/books.js
//  Books CRUD API Routes
// ─────────────────────────────────────────────────────────

const express          = require("express");
const router           = express.Router();
const BookModel        = require("../models/Book");
const booksController  = require("../controllers/booksController");
const lexoraController = require("../controllers/lexoraController");

// ── GET /api/books ────────────────────────────────────────
router.get("/", booksController.getBooks);

// ── STATIC routes — MUST be before /:id ──────────────────

// GET /api/books/public-search?title=...&author=...
// Public endpoint — no auth required — searches NEMCO + Lexora collections
router.get("/public-search", async (req, res) => {
  try {
    const { title, author } = req.query;

    if (!title && !author) {
      return res.status(400).json({ success: false, error: "Please provide at least a title to search." });
    }

    const conditions = [];
    const params = [];

    if (title) {
      conditions.push("(LOWER(b.title) LIKE ?)");
      params.push(`%${title.toLowerCase()}%`);
    }
    if (author) {
      conditions.push("(LOWER(b.author) LIKE ?)");
      params.push(`%${author.toLowerCase()}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Search NEMCO library books — includes sublocation
    const [nemcoRows] = await require("../config/db").pool.query(
      `SELECT
         b.id, b.title, b.author, b.genre, b.year, b.publisher,
         b.shelf, b.status, b.cover, b.isbn, b.edition,
         b.accessionNumber, b.callNumber, b.pages,
         b.sublocation,
         COALESCE(cc.total_copies, b.quantity) AS total_copies,
         COALESCE(cc.avail_copies, 0)          AS available_copies,
         'nemco' AS source
       FROM books b
       LEFT JOIN (
         SELECT book_id,
           COUNT(*)                  AS total_copies,
           SUM(status = 'Available') AS avail_copies
         FROM book_copies GROUP BY book_id
       ) cc ON cc.book_id = b.id
       ${whereClause}
       ORDER BY b.title ASC
       LIMIT 50`,
      params
    );

    // Build lexora conditions separately (same logic, different table alias)
    const lexConditions = [];
    const lexParams = [];
    if (title) {
      lexConditions.push("LOWER(REPLACE(REPLACE(title, '\\n', ' '), '\\r', ' ')) LIKE ?");
      lexParams.push(`%${title.toLowerCase()}%`);
    }
    if (author) {
      lexConditions.push("LOWER(REPLACE(REPLACE(COALESCE(author,''), '\\n', ' '), '\\r', ' ')) LIKE ?");
      lexParams.push(`%${author.toLowerCase()}%`);
    }
    const lexWhere = lexConditions.length ? `WHERE ${lexConditions.join(" AND ")}` : "";

    // Search Lexora digital books
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
router.get("/count/all", async (req, res) => {
  try {
    const result = await BookModel.getCount();
    if (!result.success) return res.status(400).json({ success:false, error:result.error });
    res.json({ success:true, count:result.count });
  } catch (err) {
    console.error("[GET /api/books/count/all]", err.message);
    res.status(500).json({ success:false, error:"Internal server error" });
  }
});

// GET  /api/books/lexora
router.get("/lexora", lexoraController.getLexoraBooks);

// POST /api/books/lexora-import
router.post("/lexora-import", lexoraController.bulkLexoraImport);

// POST /api/books/check-duplicates
router.post("/check-duplicates", async (req, res) => {
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
router.post("/bulk-import", async (req, res) => {
  try {
    const { books } = req.body;

    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ success:false, error:"No books provided" });
    }

    const imported      = [];
    const existingBooks = [];
    const skippedBooks  = [];
    const skippedCopies = [];

    for (const bookData of books) {
      const result = await BookModel.importWithCopies(bookData);

      if (result.success) {
        if (result.isNewBook) {
          imported.push(result.data);
        } else {
          existingBooks.push(result.data);
        }
        if (result.skippedCopies?.length) {
          skippedCopies.push(...result.skippedCopies.map(s => ({
            book: bookData.title, ...s
          })));
        }
      } else {
        skippedBooks.push({ title: bookData.title, error: result.error });
      }
    }

    res.json({
      success:       true,
      imported:      imported.length,
      existing:      existingBooks.length,
      failedBooks:   skippedBooks.length,
      skippedCopies: skippedCopies.length,
      data:          [...imported, ...existingBooks],
      newBooks:      imported,
      existingBooks,
      errors:        skippedBooks,
      skippedCopies,
    });
  } catch (err) {
    console.error("[POST /api/books/bulk-import]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── DYNAMIC routes — AFTER all static routes ─────────────

// GET /api/books/:id
router.get("/:id", async (req, res) => {
  try {
    const result = await BookModel.getById(req.params.id);
    if (!result.success) return res.status(404).json({ success:false, error:result.error });
    res.json({ success:true, data:result.data });
  } catch (err) {
    console.error("[GET /api/books/:id]", err.message);
    res.status(500).json({ success:false, error:"Internal server error" });
  }
});

// GET /api/books/:id/copies
router.get("/:id/copies", async (req, res) => {
  try {
    const result = await BookModel.getCopies(req.params.id);
    if (!result.success) return res.status(400).json({ success:false, error:result.error });
    res.json({ success:true, data:result.data });
  } catch (err) {
    console.error("[GET /api/books/:id/copies]", err.message);
    res.status(500).json({ success:false, error:"Internal server error" });
  }
});

// PUT  /api/books/:id
router.put("/:id", booksController.updateBook);

// DELETE /api/books/:id
router.delete("/:id", booksController.deleteBook);

module.exports = router;