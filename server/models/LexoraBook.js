const { pool } = require("../config/db");

// ── Sanitize helper ─────────────────────────────────────
// Strips/collapses embedded newlines and trims whitespace.
// Applies to both title and author so LIKE searches are reliable.
function sanitize(str) {
  if (!str) return null;
  return String(str).replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

const LexoraBookModel = {

  async bulkImport(books) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const results = [];
      const errors  = [];

      for (const bookData of books) {
        const result = await this.upsertBook(conn, bookData);
        if (result.success) {
          results.push(result);
        } else {
          errors.push({ title: bookData.title || "Unknown", error: result.error });
        }
      }

      await conn.commit();

      return {
        success:      true,
        imported:     results.filter(r => r.isNewBook).length,
        updated:      results.filter(r => !r.isNewBook).length,
        errors:       errors.length,
        data:         results.map(r => r.data),
        errorsDetail: errors,
      };
    } catch (error) {
      await conn.rollback();
      console.error("[LexoraBookModel.bulkImport]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },

  async upsertBook(conn, bookData) {
    try {
      const {
        title,
        author         = null,
        source         = null,
        year           = null,
        resourceType   = null,
        resource_type  = null,   // accept snake_case too
        format         = null,
        subject_course = null,
        program        = null,
        collection     = null,
      } = bookData;

      // Accept both camelCase (resourceType) and snake_case (resource_type)
      const resourceTypeVal = resourceType ?? resource_type;

      // Sanitize: strip embedded newlines from both title and author
      const titleVal  = sanitize(title);
      const authorVal = sanitize(author);
      const programVal = program || collection || null;

      let bookId    = null;
      let isNewBook = false;

      if (authorVal) {
        const [rows] = await conn.query(
          `SELECT id FROM lexora_books
            WHERE LOWER(TRIM(title)) = LOWER(TRIM(?))
              AND LOWER(TRIM(COALESCE(author, ''))) = LOWER(TRIM(?))
            LIMIT 1`,
          [titleVal, authorVal]
        );
        if (rows.length) bookId = rows[0].id;
      }

      if (!bookId) {
        const [rows] = await conn.query(
          `SELECT id FROM lexora_books
            WHERE LOWER(TRIM(title)) = LOWER(TRIM(?))
            LIMIT 1`,
          [titleVal]
        );
        if (rows.length) bookId = rows[0].id;
      }

      if (!bookId) {
        isNewBook = true;
        const [result] = await conn.query(
          `INSERT INTO lexora_books
             (title, author, source, year, resource_type, format, subject_course, program, collection)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [titleVal, authorVal, source, year, resourceTypeVal, format, subject_course, programVal, programVal]
        );
        bookId = result.insertId;
      } else {
        await conn.query(
          `UPDATE lexora_books
              SET author         = ?,
                  source         = ?,
                  year           = ?,
                  resource_type  = ?,
                  format         = ?,
                  subject_course = ?,
                  program        = ?,
                  collection     = ?
            WHERE id = ?`,
          [authorVal, source, year, resourceTypeVal, format, subject_course, programVal, programVal, bookId]
        );
      }

      const [bookRows] = await conn.query(
        "SELECT * FROM lexora_books WHERE id = ?",
        [bookId]
      );

      const action = isNewBook ? "INSERT" : "UPDATE";
      console.log(`✅ Lexora ${action}: "${titleVal}" (ID: ${bookId})`);

      return { success: true, isNewBook, data: bookRows[0] };

    } catch (error) {
      console.error("[LexoraBookModel.upsertBook]", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all Lexora books with optional filters.
   * @param {Object} filters
   * @param {string} [filters.program]      - Filter by program/category
   * @param {string} [filters.resourceType] - Filter by resource_type (Ebook/Journal)
   * @param {string} [filters.search]       - Search by title or author
   */
  async getAll(filters = {}) {
    try {
      const conditions = [];
      const params     = [];

      if (filters.program) {
        conditions.push("program = ?");
        params.push(filters.program);
      }

      if (filters.resourceType) {
        conditions.push("resource_type = ?");
        params.push(filters.resourceType);
      }

      if (filters.subjectCourse) {
        conditions.push("LOWER(subject_course) LIKE ?");
        params.push(`%${filters.subjectCourse.toLowerCase()}%`);
      }

      if (filters.search) {
        // Use REPLACE in SQL so already-stored titles with embedded newlines still match
        conditions.push(`(
          LOWER(REPLACE(REPLACE(title, '\\n', ' '), '\\r', ' ')) LIKE ?
          OR LOWER(REPLACE(REPLACE(COALESCE(author,''), '\\n', ' '), '\\r', ' ')) LIKE ?
        )`);
        const term = `%${sanitize(filters.search).toLowerCase()}%`;
        params.push(term, term);
      }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const [rows] = await pool.query(
        `SELECT * FROM lexora_books ${where} ORDER BY created_at DESC`,
        params
      );

      // Build distinct filter option lists from the full table (not filtered)
      const [programs]      = await pool.query(
        "SELECT DISTINCT program FROM lexora_books WHERE program IS NOT NULL ORDER BY program"
      );
      const [resourceTypes] = await pool.query(
        "SELECT DISTINCT resource_type FROM lexora_books WHERE resource_type IS NOT NULL ORDER BY resource_type"
      );
      const [subjectCourses] = await pool.query(
        "SELECT DISTINCT subject_course FROM lexora_books WHERE subject_course IS NOT NULL ORDER BY subject_course"
      );

      return {
        success:        true,
        data:           rows,
        programs:       programs.map(r => r.program),
        resourceTypes:  resourceTypes.map(r => r.resource_type),
        subjectCourses: subjectCourses.map(r => r.subject_course),
      };
    } catch (error) {
      console.error("[LexoraBookModel.getAll]", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = LexoraBookModel;