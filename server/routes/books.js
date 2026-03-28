// ─────────────────────────────────────────────────────────
//  routes/books.js
//  Books CRUD API Routes
// ─────────────────────────────────────────────────────────

const express    = require("express");
const router     = express.Router();
const BookModel  = require("../models/Book");
const { pool }   = require("../config/db");

// GET /api/books
router.get("/", async (req, res) => {
  try {
    const { status, genre, search } = req.query;
    let result;

    if (search)          result = await BookModel.search(search);
    else if (status||genre) result = await BookModel.filter(status, genre);
    else                 result = await BookModel.getAll();

    if (!result.success) return res.status(400).json({ success:false, error:result.error });
    res.json({ success:true, data:result.data });
  } catch (err) {
    console.error("[GET /api/books]", err.message);
    res.status(500).json({ success:false, error:"Internal server error" });
  }
});

// GET /api/books/count/all  ← must be BEFORE /:id
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

// GET /api/books/:id  (returns book + copies[])
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

// POST /api/books  (single book, manual add)
router.post("/", async (req, res) => {
  try {
    const result = await BookModel.create(req.body);
    if (!result.success) return res.status(400).json({ success:false, error:result.error });
    res.status(201).json({ success:true, data:result.data });
  } catch (err) {
    console.error("[POST /api/books]", err.message);
    res.status(500).json({ success:false, error:"Internal server error" });
  }
});

// POST /api/books/check-duplicates
// Pre-flight: check which books/accessions already exist before importing
router.post("/check-duplicates", async (req, res) => {
  try {
    const { books } = req.body;
    if (!Array.isArray(books) || !books.length) {
      return res.status(400).json({ success: false, error: "No books provided" });
    }

    const duplicateTitles     = [];
    const duplicateAccessions = [];

    for (const book of books) {
      // Check title
      const [titleMatch] = await pool.query(
        "SELECT id, title FROM books WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) LIMIT 1",
        [book.title]
      );
      if (titleMatch.length) {
        duplicateTitles.push({ title: book.title, existingId: titleMatch[0].id });
      }

      // Check each accession number
      for (const acc of (book.accessionNumbers || [])) {
        if (!acc) continue;
        const [accMatch] = await pool.query(
          "SELECT id, accession_number FROM book_copies WHERE accession_number = ? LIMIT 1",
          [acc.trim()]
        );
        if (accMatch.length) {
          duplicateAccessions.push({ accession: acc.trim(), book: book.title });
        }
      }
    }

    res.json({
      success:              true,
      hasDuplicates:        duplicateTitles.length > 0 || duplicateAccessions.length > 0,
      duplicateTitles,
      duplicateAccessions,
    });
  } catch (err) {
    console.error("[POST /api/books/check-duplicates]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Body: { books: [{ title, author, accessionNumbers: [...], ... }] }
router.post("/bulk-import", async (req, res) => {
  try {
    const { books } = req.body;

    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ success:false, error:"No books provided" });
    }

    const imported      = [];   // truly new book rows inserted
    const existingBooks = [];   // books that already existed (title matched)
    const skippedBooks  = [];   // books that failed entirely
    const skippedCopies = [];   // individual accessions that were duplicates

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
      success:        true,
      imported:       imported.length,
      existing:       existingBooks.length,
      failedBooks:    skippedBooks.length,
      skippedCopies:  skippedCopies.length,
      data:           [...imported, ...existingBooks],
      newBooks:       imported,
      existingBooks,
      errors:         skippedBooks,
      skippedCopies,
    });
  } catch (err) {
    console.error("[POST /api/books/bulk-import]", err.message);
    res.status(500).json({ success:false, error:"Internal server error" });
  }
});

// PUT /api/books/:id
router.put("/:id", async (req, res) => {
  try {
    const result = await BookModel.update(req.params.id, req.body);
    if (!result.success) return res.status(400).json({ success:false, error:result.error });
    res.json({ success:true, data:result.data });
  } catch (err) {
    console.error("[PUT /api/books/:id]", err.message);
    res.status(500).json({ success:false, error:"Internal server error" });
  }
});

// DELETE /api/books/:id
router.delete("/:id", async (req, res) => {
  try {
    const result = await BookModel.delete(req.params.id);
    if (!result.success) return res.status(404).json({ success:false, error:result.error });
    res.json({ success:true, data:result.data });
  } catch (err) {
    console.error("[DELETE /api/books/:id]", err.message);
    res.status(500).json({ success:false, error:"Internal server error" });
  }
});

module.exports = router;