// ─────────────────────────────────────────────────────────
//  routes/books.js
//  Books CRUD API Routes
// ─────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const BookModel = require("../models/Book");

/**
 * GET /api/books
 * Get all books with optional filters
 * Query params: status, genre, search
 */
router.get("/", async (req, res) => {
  try {
    const { status, genre, search } = req.query;

    let result;

    if (search) {
      // Search books
      result = await BookModel.search(search);
    } else if (status || genre) {
      // Filter books
      result = await BookModel.filter(status, genre);
    } else {
      // Get all books
      result = await BookModel.getAll();
    }

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[GET /api/books] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/books/:id
 * Get a single book by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await BookModel.getById(id);

    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[GET /api/books/:id] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * POST /api/books
 * Create a new book
 */
router.post("/", async (req, res) => {
  try {
    const bookData = req.body; // Pass full data - model handles all fields

    const result = await BookModel.create(bookData);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    console.error("[POST /api/books] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * PUT /api/books/:id
 * Update an existing book
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const bookData = req.body; // Pass full data - model handles all fields

    const result = await BookModel.update(id, bookData);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[PUT /api/books/:id] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * DELETE /api/books/:id
 * Delete a book
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await BookModel.delete(id);

    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[DELETE /api/books/:id] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/books/count/all
 * Get total book count
 */
router.get("/count/all", async (req, res) => {
  try {
    const result = await BookModel.getCount();

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error("[GET /api/books/count/all] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});


/**
 * POST /api/books/bulk-import
 * Bulk import books from parsed Excel data
 * Expects: { books: [...] }
 */
router.post("/bulk-import", async (req, res) => {
  try {
    const { books } = req.body;

    if (!Array.isArray(books) || books.length === 0) {
      return res.status(400).json({ success: false, error: "No books provided" });
    }

    const results = { success: [], failed: [] };

    for (const bookData of books) {
      try {
        const result = await BookModel.create(bookData);
        if (result.success) {
          results.success.push(result.data);
        } else {
          results.failed.push({ title: bookData.title, error: result.error });
        }
      } catch (err) {
        results.failed.push({ title: bookData.title, error: err.message });
      }
    }

    res.json({
      success: true,
      imported: results.success.length,
      failed: results.failed.length,
      data: results.success,
      errors: results.failed,
    });
  } catch (error) {
    console.error("[POST /api/books/bulk-import] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;