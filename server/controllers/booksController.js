// ─────────────────────────────────────────────────────────
//  controllers/booksController.js
//  createBook / updateBook now handle the `copies` array
//  coming from BookForm and insert/sync book_copies rows.
//
//  AUDIT TRAIL: All mutating actions (create/update/delete/bulk)
//  call auditService.logAction() after the DB operation succeeds.
//
//  BULK IMPORT AUDIT STRATEGY:
//  The frontend sends books in chunks of 10 per request, passing
//  is_first_chunk / is_last_chunk flags and running totals
//  (acc_imported, acc_updated, acc_errors) with every chunk.
//  The server writes ONE audit entry only on the final chunk —
//  fully stateless, no req.session dependency required.
// ─────────────────────────────────────────────────────────

const BookModel        = require("../models/Book");
const analyticsService = require("../services/analyticsService");
const auditService     = require("../services/auditService");
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
    const validation = validateBookData(req.body);
    if (!validation.valid) {
      return res.status(400).json(errorResponse("Validation failed", 400, validation.errors));
    }

    const copies = Array.isArray(req.body.copies) ? req.body.copies : [];
    const validCopies = copies.filter((c) => c.accession_number?.trim());

    if (validCopies.length === 0) {
      return res.status(400).json(
        errorResponse("Validation failed", 400, {
          copies: "At least one accession number is required for a physical copy.",
        })
      );
    }

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

    // ── Audit: CREATE ─────────────────────────────────────
    await auditService.logAction(req, {
      entity_type : "book",
      entity_id   : result.data?.id ?? null,
      action      : "CREATE",
      old_data    : null,
      new_data    : {
        title  : req.body.title,
        author : req.body.author,
        copies : validCopies.map(c => c.accession_number),
      },
    });

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

    const oldResult = await BookModel.getById(req.params.id);
    const oldData   = oldResult.success ? oldResult.data : null;

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

      // ── Audit: UPDATE ──────────────────────────────────
      await auditService.logAction(req, {
        entity_type : "book",
        entity_id   : Number(req.params.id),
        action      : "UPDATE",
        old_data    : oldData ? { title: oldData.title, author: oldData.author } : null,
        new_data    : { title: req.body.title, author: req.body.author },
      });

      return res.json(successResponse(result.data, "Book updated successfully"));
    }

    const result = await BookModel.update(req.params.id, {
      ...req.body,
      sublocation: req.body.sublocation || null,
    });
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

    // ── Audit: UPDATE (metadata only) ─────────────────
    await auditService.logAction(req, {
      entity_type : "book",
      entity_id   : Number(req.params.id),
      action      : "UPDATE",
      old_data    : oldData ? { title: oldData.title, author: oldData.author } : null,
      new_data    : { title: req.body.title, author: req.body.author },
    });

    res.json(successResponse(result.data, "Book updated successfully"));
  } catch (error) {
    console.error("[BooksController] PUT /:id", error.message);
    res.status(500).json(errorResponse("Failed to update book", 500));
  }
};

// ── DELETE /api/books/:id ─────────────────────────────────────────────────────
const deleteBook = async (req, res) => {
  try {
    const oldResult = await BookModel.getById(req.params.id);
    const oldData   = oldResult.success ? { title: oldResult.data.title, author: oldResult.data.author } : null;

    const result = await BookModel.delete(req.params.id);
    if (!result.success) return res.status(404).json(errorResponse(result.error, 404));

    // ── Audit: DELETE ─────────────────────────────────
    await auditService.logAction(req, {
      entity_type : "book",
      entity_id   : Number(req.params.id),
      action      : "DELETE",
      old_data    : oldData,
      new_data    : null,
    });

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
//
//  Audit strategy — ONE log entry per full import session, not per chunk:
//
//  The frontend (BookImport.jsx) sends books in chunks of 10.
//  Each request includes:
//    { books, is_first_chunk, is_last_chunk, acc_imported, acc_updated, acc_errors }
//
//  acc_* are the CUMULATIVE totals BEFORE this chunk (sent by the frontend).
//  The server adds its own chunk results on top and writes ONE audit entry
//  only when is_last_chunk === true.
//  First and middle chunks are processed silently — no audit entry written.
// ─────────────────────────────────────────────────────────────────────────────
const bulkImport = async (req, res) => {
  try {
    const {
      books,
      is_first_chunk = false,
      is_last_chunk  = false,
      // Running totals accumulated by the frontend BEFORE this chunk.
      // Default to 0 so old clients (no flags) still work gracefully.
      acc_imported   = 0,
      acc_updated    = 0,
      acc_errors     = 0,
    } = req.body;

    const result = await BookModel.bulkImport(books);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

    const chunkImported = result.imported || 0;
    const chunkUpdated  = result.updated  || 0;
    const chunkErrors   = result.errors   || 0;

    // ── Audit: write ONE entry only on the last chunk ────
    if (is_last_chunk) {
      // Grand totals = everything BEFORE this chunk + this chunk's results
      await auditService.logAction(req, {
        entity_type : "book",
        entity_id   : null,
        action      : "BULK_IMPORT",
        old_data    : null,
        new_data    : {
          imported : acc_imported + chunkImported,
          updated  : acc_updated  + chunkUpdated,
          errors   : acc_errors   + chunkErrors,
        },
      });
    }
    // All other chunks (first, middle): no audit log — just process data.

    res.json({
      success:      true,
      imported:     chunkImported,
      updated:      chunkUpdated,
      errors:       chunkErrors,
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