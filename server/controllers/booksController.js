// ─────────────────────────────────────────────────────────
//  controllers/booksController.js
//  createBook / updateBook now handle the `copies` array
//  coming from BookForm and insert/sync book_copies rows.
// ─────────────────────────────────────────────────────────

const BookModel        = require("../models/Book");
const analyticsService = require("../services/analyticsService");
const { successResponse, errorResponse } = require("../utils/responseFormatter");
const { validateBookData } = require("../utils/validation");

// ── GET /api/books ────────────────────────────────────────────────────────────
const getBooks = async (req, res) => {
  try {
    const { status, genre, search } = req.query;
    let result;
    if (search)             result = await BookModel.search(search);
    else if (status||genre) result = await BookModel.filter(status, genre);
    else                    result = await BookModel.getAll();

    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(result.data));
  } catch (error) {
    console.error("[BooksController] GET /", error.message);
    res.status(500).json(errorResponse("Failed to fetch books", 500));
  }
};

// ── GET /api/books/:id ────────────────────────────────────────────────────────
const getBookById = async (req, res) => {
  try {
    const result = await BookModel.getById(req.params.id);
    if (!result.success) return res.status(404).json(errorResponse(result.error, 404));
    res.json(successResponse(result.data));
  } catch (error) {
    console.error("[BooksController] GET /:id", error.message);
    res.status(500).json(errorResponse("Failed to fetch book", 500));
  }
};

// ── POST /api/books ───────────────────────────────────────────────────────────
const createBook = async (req, res) => {
  try {
    // Basic metadata validation (title required, etc.)
    const validation = validateBookData(req.body);
    if (!validation.valid) {
      return res.status(400).json(errorResponse("Validation failed", 400, validation.errors));
    }

    // Validate copies array — at least one copy with an accession number
    const copies = Array.isArray(req.body.copies) ? req.body.copies : [];
    const validCopies = copies.filter((c) => c.accession_number?.trim());

    if (validCopies.length === 0) {
      return res.status(400).json(
        errorResponse("Validation failed", 400, {
          copies: "At least one accession number is required for a physical copy.",
        })
      );
    }

    // Check for duplicate accession numbers within the submitted list
    const accessionSet = new Set();
    for (const copy of validCopies) {
      const acc = copy.accession_number.trim();
      if (accessionSet.has(acc)) {
        return res.status(400).json(
          errorResponse("Validation failed", 400, {
            copies: `Duplicate accession number in form: "${acc}". Each copy must have a unique accession number.`,
          })
        );
      }
      accessionSet.add(acc);
    }

    const result = await BookModel.createWithCopies(
      { ...req.body, sublocation: req.body.sublocation || null, quantity: validCopies.length },
      validCopies
    );

    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

    res.status(201).json(successResponse(result.data, "Book created successfully", 201));
  } catch (error) {
    console.error("[BooksController] POST /", error.message);
    res.status(500).json(errorResponse("Failed to create book", 500));
  }
};

// ── PUT /api/books/:id ────────────────────────────────────────────────────────
const updateBook = async (req, res) => {
  try {
    const validation = validateBookData(req.body);
    if (!validation.valid) {
      return res.status(400).json(errorResponse("Validation failed", 400, validation.errors));
    }

    // If copies were sent, validate them
    const copies = Array.isArray(req.body.copies) ? req.body.copies : null;
    if (copies !== null) {
      const validCopies = copies.filter((c) => c.accession_number?.trim());

      if (validCopies.length === 0) {
        return res.status(400).json(
          errorResponse("Validation failed", 400, {
            copies: "At least one accession number is required.",
          })
        );
      }

      const accessionSet = new Set();
      for (const copy of validCopies) {
        const acc = copy.accession_number.trim();
        if (accessionSet.has(acc)) {
          return res.status(400).json(
            errorResponse("Validation failed", 400, {
              copies: `Duplicate accession number in form: "${acc}".`,
            })
          );
        }
        accessionSet.add(acc);
      }

      const result = await BookModel.updateWithCopies(
        req.params.id,
        { ...req.body, sublocation: req.body.sublocation || null, quantity: validCopies.length },
        validCopies
      );

      if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
      return res.json(successResponse(result.data, "Book updated successfully"));
    }

    // No copies sent — update book metadata only (backwards-compat)
    const result = await BookModel.update(req.params.id, {
      ...req.body,
      sublocation: req.body.sublocation || null,
    });
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(result.data, "Book updated successfully"));
  } catch (error) {
    console.error("[BooksController] PUT /:id", error.message);
    res.status(500).json(errorResponse("Failed to update book", 500));
  }
};

// ── DELETE /api/books/:id ─────────────────────────────────────────────────────
const deleteBook = async (req, res) => {
  try {
    const result = await BookModel.delete(req.params.id);
    if (!result.success) return res.status(404).json(errorResponse(result.error, 404));
    res.json(successResponse(result.data, "Book deleted successfully"));
  } catch (error) {
    console.error("[BooksController] DELETE /:id", error.message);
    res.status(500).json(errorResponse("Failed to delete book", 500));
  }
};

// ── GET /api/books/count/all ──────────────────────────────────────────────────
const getBookCount = async (req, res) => {
  try {
    const result = await BookModel.getCount();
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse({ count: result.count }));
  } catch (error) {
    res.status(500).json(errorResponse("Failed to get book count", 500));
  }
};

// ── GET /api/books/stats ──────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const result = await analyticsService.getBookStats();
    if (!result.success) return res.status(500).json(errorResponse(result.error, 500));
    res.json(successResponse(result.data));
  } catch (error) {
    console.error("[BooksController] GET /stats", error.message);
    res.status(500).json(errorResponse("Failed to get stats", 500));
  }
};

// ── POST /api/books/check-duplicates ─────────────────────────────────────────
const checkDuplicates = async (req, res) => {
  try {
    const result = await BookModel.checkDuplicatesBatch(req.body.books);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json({
      success:             true,
      hasDuplicates:       result.hasDuplicates       || false,
      duplicateTitles:     result.duplicateTitles     || [],
      duplicateAccessions: result.duplicateAccessions || [],
    });
  } catch (error) {
    res.status(500).json(errorResponse("Failed to check duplicates", 500));
  }
};

// ── POST /api/books/bulk-import ───────────────────────────────────────────────
const bulkImport = async (req, res) => {
  try {
    const result = await BookModel.bulkImport(req.body.books);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json({
      success:      true,
      imported:     result.imported     || 0,
      updated:      result.updated      || 0,
      errors:       result.errors       || 0,
      data:         result.data         || [],
      errorsDetail: result.errorsDetail || [],
    });
  } catch (error) {
    res.status(500).json(errorResponse("Failed to bulk import", 500));
  }
};

module.exports = {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getBookCount,
  getStats,
  checkDuplicates,
  bulkImport,
};