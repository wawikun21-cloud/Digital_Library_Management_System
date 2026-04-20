// ─────────────────────────────────────────────────────────
//  controllers/lexoraController.js
//
//  BULK IMPORT AUDIT STRATEGY:
//  The frontend (Lexoraimport.jsx) sends books in chunks of 10
//  per request. To avoid one audit log entry per chunk, the frontend
//  passes running totals (acc_imported, acc_updated, acc_errors,
//  acc_skippedCopies) alongside each chunk. The server writes ONE
//  audit entry only on the final chunk by adding its own chunk results
//  on top of those totals — fully stateless, no req.session required.
// ─────────────────────────────────────────────────────────

const LexoraBookModel = require("../models/LexoraBook");
const auditService    = require("../services/auditService");
const { successResponse, errorResponse } = require("../utils/responseFormatter");

/**
 * POST /api/books/lexora-import
 * Bulk import Lexora Excel books — chunked by frontend.
 */
const bulkLexoraImport = async (req, res) => {
  try {
    const {
      books,
      is_first_chunk      = false,
      is_last_chunk       = false,
      // Running totals accumulated by the frontend BEFORE this chunk.
      // Default to 0 so old clients (no flags) still work gracefully.
      acc_imported        = 0,
      acc_updated         = 0,
      acc_errors          = 0,
      acc_skippedCopies   = 0,
    } = req.body;

    const result = await LexoraBookModel.bulkImport(books);
    if (!result.success) {
      return res.status(400).json(errorResponse(result.error, 400));
    }

    const chunkImported      = result.imported      ?? 0;
    const chunkUpdated       = result.updated       ?? 0;
    const chunkErrors        = result.errors        ?? 0;
    const chunkSkippedCopies = result.skippedCopies ?? 0;

    // ── Audit: write ONE entry only on the last chunk ────
    if (is_last_chunk) {
      // Grand totals = everything BEFORE this chunk + this chunk's results
      await auditService.logAction(req, {
        entity_type : "lexora_book",
        entity_id   : null,
        action      : "BULK_IMPORT",
        old_data    : null,
        new_data    : {
          imported      : acc_imported      + chunkImported,
          updated       : acc_updated       + chunkUpdated,
          errors        : acc_errors        + chunkErrors,
          skippedCopies : acc_skippedCopies + chunkSkippedCopies,
        },
      });
    }
    // All other chunks (first, middle): no audit log — just process data.

    res.json({
      success:       true,
      imported:      chunkImported,
      updated:       chunkUpdated,
      errors:        chunkErrors,
      data:          result.data         || [],
      updatedBooks:  result.updatedBooks  || [],
      errorsDetail:  result.errorsDetail  || [],
      skippedCopies: chunkSkippedCopies,
    });

  } catch (error) {
    console.error("[LexoraController.bulkImport]", error.message);
    res.status(500).json(errorResponse("Failed to import Lexora books", 500));
  }
};

/**
 * GET /api/books/lexora
 */
const getLexoraBooks = async (req, res) => {
  try {
    const { program, resourceType, subjectCourse, search } = req.query;

    const result = await LexoraBookModel.getAll({
      program:       program       || null,
      resourceType:  resourceType  || null,
      subjectCourse: subjectCourse || null,
      search:        search        || null,
    });

    if (!result.success) {
      return res.status(400).json(errorResponse(result.error, 400));
    }

    res.json({
      success:        true,
      data:           result.data,
      programs:       result.programs,
      resourceTypes:  result.resourceTypes,
      subjectCourses: result.subjectCourses,
    });
  } catch (error) {
    console.error("[LexoraController.getLexoraBooks]", error.message);
    res.status(500).json(errorResponse("Failed to fetch Lexora books", 500));
  }
};

/**
 * POST /api/books/lexora
 */
const createLexoraBook = async (req, res) => {
  try {
    const result = await LexoraBookModel.create(req.body);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

    await auditService.logAction(req, {
      entity_type : "lexora_book",
      entity_id   : result.data?.id ?? null,
      action      : "CREATE",
      old_data    : null,
      new_data    : {
        title  : result.data?.title  ?? req.body.title,
        author : result.data?.author ?? req.body.author,
      },
    });

    res.status(201).json(successResponse(result.data, "Lexora book created successfully", 201));
  } catch (error) {
    console.error("[LexoraController.create]", error.message);
    res.status(500).json(errorResponse("Failed to create Lexora book", 500));
  }
};

/**
 * PUT /api/books/lexora/:id
 */
const updateLexoraBook = async (req, res) => {
  try {
    const result = await LexoraBookModel.update(req.params.id, req.body);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

    await auditService.logAction(req, {
      entity_type : "lexora_book",
      entity_id   : Number(req.params.id),
      action      : "UPDATE",
      old_data    : null,
      new_data    : {
        title  : req.body.title,
        author : req.body.author,
      },
    });

    res.json(successResponse(result.data, "Lexora book updated successfully"));
  } catch (error) {
    console.error("[LexoraController.update]", error.message);
    res.status(500).json(errorResponse("Failed to update Lexora book", 500));
  }
};

/**
 * DELETE /api/books/lexora/:id
 */
const deleteLexoraBook = async (req, res) => {
  try {
    const result = await LexoraBookModel.delete(req.params.id);
    if (!result.success) return res.status(404).json(errorResponse(result.error, 404));

    await auditService.logAction(req, {
      entity_type : "lexora_book",
      entity_id   : Number(req.params.id),
      action      : "DELETE",
      old_data    : null,
      new_data    : null,
    });

    res.json(successResponse(result.data, "Lexora book deleted successfully"));
  } catch (error) {
    console.error("[LexoraController.delete]", error.message);
    res.status(500).json(errorResponse("Failed to delete Lexora book", 500));
  }
};

module.exports = {
  bulkLexoraImport,
  getLexoraBooks,
  createLexoraBook,
  updateLexoraBook,
  deleteLexoraBook,
};