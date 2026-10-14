// ─────────────────────────────────────────────────────────
//  routes/books.js  —  Permission-guarded catalog routes
//
//  CHANGE SUMMARY:
//    Role guards were replaced by permission guards so grants can be
//    edited per role and per user from /dashboard/roles.
//    • GET /, /:id, /:id/copies          → manage_books:view
//    • POST /, /bulk-import              → manage_books:create / import
//    • PUT /:id                          → manage_books:edit
//    • DELETE /:id                       → manage_books:delete
//    • /lexora*                          → manage_lexora_books:{view,create,edit,delete,import}
//    • GET /count/all, GET /stats        → unchanged (requireAdmin)
//
//  Public routes (/public-search, /:id/copies/public) stay open and
//  are registered BEFORE the guard middleware so it never runs for them.
//
//  School scoping: resolveSchoolScope is mounted after the guard;
//  every authenticated query is filtered by the book's category
//  assignments server-side (bookAccess). The PUBLIC routes are
//  deliberately unscoped (anonymous visitors have no scope).
// ─────────────────────────────────────────────────────────

const express          = require("express");
const router           = express.Router();
const BookModel        = require("../models/Book");
const booksController  = require("../controllers/booksController");
const lexoraController = require("../controllers/lexoraController");

const { requireAdmin } = require("../middleware/authMiddleware");
const {
  requireAuth,
  resolvePermissions,
  requirePermissionAction,
} = require("../features/roles");
const { resolveSchoolScope } = require("../features/organization");

// ── PUBLIC routes (no auth) — must precede router.use ──────

// GET /api/books/public-search  (public — no auth)
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

// GET /api/books/:id/copies/public  (public — no auth)
router.get("/:id/copies/public", async (req, res) => {
  try {
    const { pool } = require("../config/db");
    const bookId   = req.params.id;

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

// ── Everything below requires an authenticated caller with
//    resolved permissions attached to the request. ──────────
router.use(requireAuth, resolvePermissions, resolveSchoolScope);

// ── STATIC routes — MUST be before /:id ──────────────────

// GET /api/books/count/all
// Stats are admin-only (shown on the admin dashboard) — unchanged:
// mapping these to manage_books:view would newly grant librarians access.
router.get("/count/all", requireAdmin, async (req, res) => {
  try {
    const result = await BookModel.getCount();
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error("[GET /api/books/count/all]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/books/stats  (admin dashboard KPI — admin only, unchanged)
router.get("/stats", requireAdmin, booksController.getStats);

// ── Lexora catalog routes (manage_lexora_books) ───────────

// GET  /api/books/lexora
router.get("/lexora", requirePermissionAction("manage_lexora_books", "view"), lexoraController.getLexoraBooks);

// POST /api/books/lexora
router.post("/lexora", requirePermissionAction("manage_lexora_books", "create"), lexoraController.createLexoraBook);

// PUT  /api/books/lexora/:id
router.put("/lexora/:id", requirePermissionAction("manage_lexora_books", "edit"), lexoraController.updateLexoraBook);

// DELETE /api/books/lexora/:id
router.delete("/lexora/:id", requirePermissionAction("manage_lexora_books", "delete"), lexoraController.deleteLexoraBook);

// POST /api/books/lexora-import
router.post("/lexora-import", requirePermissionAction("manage_lexora_books", "import"), lexoraController.bulkLexoraImport);

// POST /api/books/check-duplicates
router.post("/check-duplicates", requirePermissionAction("manage_books", "import"), async (req, res) => {
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
router.post("/bulk-import", requirePermissionAction("manage_books", "import"), booksController.bulkImport);

// POST /api/books/lexora-check-duplicates
router.post("/lexora-check-duplicates", requirePermissionAction("manage_lexora_books", "import"), async (req, res) => {
  try {
    const { books } = req.body;
    if (!Array.isArray(books) || !books.length) {
      return res.status(400).json({ success: false, error: "No books provided" });
    }
    const LexoraBookModel = require("../models/LexoraBook");
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

// ── Books catalog ────────────────────────────────────────

// GET /api/books  — librarians need this to load the Books page.
router.get("/", requirePermissionAction("manage_books", "view"), booksController.getBooks);

// POST /api/books
router.post("/", requirePermissionAction("manage_books", "create"), booksController.createBook);

// ── DYNAMIC routes — AFTER all static routes ─────────────

// GET /api/books/:id
router.get("/:id", requirePermissionAction("manage_books", "view"), async (req, res) => {
  try {
    const result = await BookModel.getById(req.params.id, req.schoolScope);
    if (!result.success) return res.status(404).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[GET /api/books/:id]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/books/:id/copies
router.get("/:id/copies", requirePermissionAction("manage_books", "view"), async (req, res) => {
  try {
    const book = await BookModel.getById(req.params.id, req.schoolScope);
    if (!book.success) return res.status(404).json({ success: false, error: book.error });
    const result = await BookModel.getCopies(req.params.id);
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[GET /api/books/:id/copies]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// PUT /api/books/:id
router.put("/:id", requirePermissionAction("manage_books", "edit"), booksController.updateBook);

// DELETE /api/books/:id
router.delete("/:id", requirePermissionAction("manage_books", "delete"), booksController.deleteBook);

module.exports = router;
