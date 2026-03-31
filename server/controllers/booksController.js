// ─────────────────────────────────────────────────────────
//  controllers/booksController.js  (updated)
//  Added: getStats() — delegates to analyticsService so the
//  Dashboard's existing GET /api/books/stats call keeps working.
// ─────────────────────────────────────────────────────────

const BookModel           = require("../models/Book");
const analyticsService    = require("../services/analyticsService");
const { successResponse, errorResponse } = require("../utils/responseFormatter");
const { validateBookData } = require("../utils/validation");

const getBooks = async (req, res) => {
  try {
    const { status, genre, search } = req.query;
    let result;
    if (search)            result = await BookModel.search(search);
    else if (status||genre) result = await BookModel.filter(status, genre);
    else                   result = await BookModel.getAll();

    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(result.data));
  } catch (error) {
    console.error("[BooksController] GET /", error.message);
    res.status(500).json(errorResponse("Failed to fetch books", 500));
  }
};

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

const createBook = async (req, res) => {
  try {
    const validation = validateBookData(req.body);
    if (!validation.valid) return res.status(400).json(errorResponse("Validation failed", 400, validation.errors));

    const result = await BookModel.create({ ...req.body, sublocation: req.body.sublocation || null });
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

    res.status(201).json(successResponse(result.data, "Book created successfully", 201));
  } catch (error) {
    console.error("[BooksController] POST", error.message);
    res.status(500).json(errorResponse("Failed to create book", 500));
  }
};

const updateBook = async (req, res) => {
  try {
    const validation = validateBookData(req.body);
    if (!validation.valid) return res.status(400).json(errorResponse("Validation failed", 400, validation.errors));

    const result = await BookModel.update(req.params.id, { ...req.body, sublocation: req.body.sublocation || null });
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

    res.json(successResponse(result.data, "Book updated successfully"));
  } catch (error) {
    console.error("[BooksController] PUT", error.message);
    res.status(500).json(errorResponse("Failed to update book", 500));
  }
};

const deleteBook = async (req, res) => {
  try {
    const result = await BookModel.delete(req.params.id);
    if (!result.success) return res.status(404).json(errorResponse(result.error, 404));
    res.json(successResponse(result.data, "Book deleted successfully"));
  } catch (error) {
    console.error("[BooksController] DELETE", error.message);
    res.status(500).json(errorResponse("Failed to delete book", 500));
  }
};

const getBookCount = async (req, res) => {
  try {
    const result = await BookModel.getCount();
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse({ count: result.count }));
  } catch (error) {
    res.status(500).json(errorResponse("Failed to get book count", 500));
  }
};

/**
 * GET /api/books/stats
 * Dashboard KPI endpoint — delegates to analyticsService.
 * Kept in booksController so the existing route file (/routes/books.js)
 * can register it at the correct path without touching index.js.
 */
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

const checkDuplicates = async (req, res) => {
  try {
    const result = await BookModel.checkDuplicatesBatch(req.body.books);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json({ success: true, hasDuplicates: result.hasDuplicates || false, duplicateTitles: result.duplicateTitles || [], duplicateAccessions: result.duplicateAccessions || [] });
  } catch (error) {
    res.status(500).json(errorResponse("Failed to check duplicates", 500));
  }
};

const bulkImport = async (req, res) => {
  try {
    const result = await BookModel.bulkImport(req.body.books);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json({ success: true, imported: result.imported || 0, updated: result.updated || 0, errors: result.errors || 0, data: result.data || [], errorsDetail: result.errorsDetail || [] });
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