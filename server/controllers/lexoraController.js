const LexoraBookModel = require("../models/LexoraBook");
const { successResponse, errorResponse } = require("../utils/responseFormatter");

/**
 * POST /api/books/lexora-import
 * Bulk import Lexora Excel books
 */
const bulkLexoraImport = async (req, res) => {
  try {
    const { books } = req.body;
    const result = await LexoraBookModel.bulkImport(books);

    if (!result.success) {
      return res.status(400).json(errorResponse(result.error, 400));
    }

    res.json({
      success:       true,
      imported:      result.imported,
      updated:       result.updated,
      errors:        result.errors,
      data:          result.data,
      updatedBooks:  result.updatedBooks || [],
      errorsDetail:  result.errorsDetail || [],
      skippedCopies: result.skippedCopies || 0,
    });

  } catch (error) {
    console.error("[LexoraController.bulkImport]", error.message);
    res.status(500).json(errorResponse("Failed to import Lexora books", 500));
  }
};

/**
 * GET /api/books/lexora
 * Fetch Lexora books with optional filters:
 *   ?program=BSIT&resourceType=Ebook&subjectCourse=Keyboarding+Applications&search=python
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
 * Create a single Lexora book manually.
 */
const createLexoraBook = async (req, res) => {
  try {
    const result = await LexoraBookModel.create(req.body);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.status(201).json(successResponse(result.data, "Lexora book created successfully", 201));
  } catch (error) {
    console.error("[LexoraController.create]", error.message);
    res.status(500).json(errorResponse("Failed to create Lexora book", 500));
  }
};

/**
 * PUT /api/books/lexora/:id
 * Update an existing Lexora book.
 */
const updateLexoraBook = async (req, res) => {
  try {
    const result = await LexoraBookModel.update(req.params.id, req.body);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(result.data, "Lexora book updated successfully"));
  } catch (error) {
    console.error("[LexoraController.update]", error.message);
    res.status(500).json(errorResponse("Failed to update Lexora book", 500));
  }
};

/**
 * DELETE /api/books/lexora/:id
 * Delete a Lexora book.
 */
const deleteLexoraBook = async (req, res) => {
  try {
    const result = await LexoraBookModel.delete(req.params.id);
    if (!result.success) return res.status(404).json(errorResponse(result.error, 404));
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