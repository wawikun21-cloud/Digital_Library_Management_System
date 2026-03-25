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

module.exports = {
  bulkLexoraImport,
  getLexoraBooks,
};