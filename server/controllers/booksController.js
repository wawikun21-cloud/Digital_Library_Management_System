/**
 * Books Controller
 * Business logic for book-related operations
 */

const BookModel = require("../models/Book");
const { successResponse, errorResponse } = require("../utils/responseFormatter");
const { validateBookData } = require("../utils/validation");

/**
 * GET /api/books
 * Get all books with optional filters
 */
const getBooks = async (req, res) => {
  try {
    const { status, genre, search } = req.query;

    let result;

    if (search) {
      result = await BookModel.search(search);
    } else if (status || genre) {
      result = await BookModel.filter(status, genre);
    } else {
      result = await BookModel.getAll();
    }

    if (!result.success) {
      return res.status(400).json(errorResponse(result.error, 400));
    }

    res.json(successResponse(result.data));
  } catch (error) {
    console.error("[BooksController] GET / Error:", error.message);
    res.status(500).json(errorResponse("Failed to fetch books", 500));
  }
};

/**
 * GET /api/books/:id
 * Get a single book by ID
 */
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await BookModel.getById(id);

    if (!result.success) {
      return res.status(404).json(errorResponse(result.error, 404));
    }

    res.json(successResponse(result.data));
  } catch (error) {
    console.error("[BooksController] GET /:id Error:", error.message);
    res.status(500).json(errorResponse("Failed to fetch book", 500));
  }
};

/**
 * POST /api/books
 * Create a new book
 */
const createBook = async (req, res) => {
  try {
    const bookData = req.body;

    // Validate input
    const validation = validateBookData(bookData);
    if (!validation.valid) {
      return res.status(400).json(errorResponse("Validation failed", 400, validation.errors));
    }

    // sublocation is optional — pass through as-is (null if not provided)
    const result = await BookModel.create({
      ...bookData,
      sublocation: bookData.sublocation || null,
    });

    if (!result.success) {
      return res.status(400).json(errorResponse(result.error, 400));
    }

    res.status(201).json(successResponse(result.data, "Book created successfully", 201));
  } catch (error) {
    console.error("[BooksController] POST Error:", error.message);
    res.status(500).json(errorResponse("Failed to create book", 500));
  }
};

/**
 * PUT /api/books/:id
 * Update an existing book
 */
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const bookData = req.body;

    // Validate input
    const validation = validateBookData(bookData);
    if (!validation.valid) {
      return res.status(400).json(errorResponse("Validation failed", 400, validation.errors));
    }

    // sublocation is optional — pass through as-is (null if not provided)
    const result = await BookModel.update(id, {
      ...bookData,
      sublocation: bookData.sublocation || null,
    });

    if (!result.success) {
      return res.status(400).json(errorResponse(result.error, 400));
    }

    res.json(successResponse(result.data, "Book updated successfully"));
  } catch (error) {
    console.error("[BooksController] PUT Error:", error.message);
    res.status(500).json(errorResponse("Failed to update book", 500));
  }
};

/**
 * DELETE /api/books/:id
 * Delete a book
 */
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await BookModel.delete(id);

    if (!result.success) {
      return res.status(404).json(errorResponse(result.error, 404));
    }

    res.json(successResponse(result.data, "Book deleted successfully"));
  } catch (error) {
    console.error("[BooksController] DELETE Error:", error.message);
    res.status(500).json(errorResponse("Failed to delete book", 500));
  }
};

/**
 * GET /api/books/count/all
 * Get total book count
 */
const getBookCount = async (req, res) => {
  try {
    const result = await BookModel.getCount();

    if (!result.success) {
      return res.status(400).json(errorResponse(result.error, 400));
    }

    res.json(successResponse({ count: result.count }));
  } catch (error) {
    console.error("[BooksController] GET /count/all Error:", error.message);
    res.status(500).json(errorResponse("Failed to get book count", 500));
  }
};

/**
 * POST /api/books/check-duplicates
 * Pre-flight check for bulk import duplicates
 */
const checkDuplicates = async (req, res) => {
  try {
    const { books } = req.body;
    const result = await BookModel.checkDuplicatesBatch(books);

    if (!result.success) {
      return res.status(400).json(errorResponse(result.error, 400));
    }

    res.json({
      success: true,
      hasDuplicates: result.hasDuplicates || false,
      duplicateTitles: result.duplicateTitles || [],
      duplicateAccessions: result.duplicateAccessions || [],
    });
  } catch (error) {
    console.error("[BooksController] checkDuplicates Error:", error.message);
    res.status(500).json(errorResponse("Failed to check duplicates", 500));
  }
};

/**
 * POST /api/books/bulk-import
 * Bulk import books + copies
 */
const bulkImport = async (req, res) => {
  try {
    const { books } = req.body;
    const result = await BookModel.bulkImport(books);

    if (!result.success) {
      return res.status(400).json(errorResponse(result.error, 400));
    }

    res.json({
      success: true,
      imported: result.imported || 0,
      updated: result.updated || 0,
      errors: result.errors || 0,
      data: result.data || [],
      errorsDetail: result.errorsDetail || []
    });
  } catch (error) {
    console.error("[BooksController] bulkImport Error:", error.message);
    res.status(500).json(errorResponse("Failed to bulk import", 500));
  }
};

module.exports = {
  getBooks,        // ← was missing, now exported
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getBookCount,
  checkDuplicates,
  bulkImport,
};