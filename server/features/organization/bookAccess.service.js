// ─────────────────────────────────────────────────────────
//  features/organization/bookAccess.service.js
//
//  Shared book-access rules — the single authoritative
//  implementation used by physical books, digital books, the
//  borrow flow, the loans list, search, the media middleware
//  and both analytics dashboards. Never re-implement the rule
//  elsewhere: import this service.
//
//  Visibility predicate (for a scoped caller u):
//    • super_admin or legacy (school_id NULL) caller → all books
//    • book has NO category assignments → visible (legacy fallback;
//      strict mode flips this to hidden)
//    • assignment → category → department → school = u.school
//      AND (u.department IS NULL OR category.department = u.department)
// ─────────────────────────────────────────────────────────

const { pool } = require("../../config/db");
const { isScoped } = require("./schoolScope");

// ── SQL fragments ─────────────────────────────────────────

/** Physical books — caller's model must alias the books table as `b`. */
function physicalBookScopeSql(scope) {
  if (!isScoped(scope)) return { sql: "", params: [] };
  return {
    sql: `AND (
      NOT EXISTS (
        SELECT 1 FROM book_category_assignments a WHERE a.book_id = b.id
      )
      OR EXISTS (
        SELECT 1
        FROM book_category_assignments a
        JOIN categories c  ON c.id = a.category_id AND c.deleted_at IS NULL
        JOIN departments d ON d.id = c.department_id
        WHERE a.book_id = b.id
          AND d.school_id = ?
          AND (? IS NULL OR c.department_id = ?)
      )
    )`,
    params: [scope.schoolId, scope.departmentId, scope.departmentId],
  };
}

/** Digital books — caller's model must alias lexora_books as `lb`. */
function lexoraBookScopeSql(scope) {
  if (!isScoped(scope)) return { sql: "", params: [] };
  return {
    sql: `AND (
      NOT EXISTS (
        SELECT 1 FROM lexora_book_assignments a WHERE a.lexora_book_id = lb.id
      )
      OR EXISTS (
        SELECT 1
        FROM lexora_book_assignments a
        JOIN categories c  ON c.id = a.category_id AND c.deleted_at IS NULL
        JOIN departments d ON d.id = c.department_id
        WHERE a.lexora_book_id = lb.id
          AND d.school_id = ?
          AND (? IS NULL OR c.department_id = ?)
      )
    )`,
    params: [scope.schoolId, scope.departmentId, scope.departmentId],
  };
}

// ── Assignment summary (badge data for list queries) ──────
//
// Additive columns only (`org_*` — never shadows a book's own
// columns). One aggregated derived table per query, so a 1000-row
// list costs one extra join over the (small) assignment tables, not a
// subquery per row. NULL names = no assignments (the "Unassigned"
// badge the UI renders).

const ASSIGNMENT_SUMMARY_COLUMNS = `,
       ass.org_category_names   AS org_category_names,
       ass.org_department_names AS org_department_names,
       ass.org_school_names     AS org_school_names`;

function assignmentSummaryJoin(assignmentTable, bookColumn, bookAlias) {
  return `
       LEFT JOIN (
         SELECT a.${bookColumn}                AS book_id,
                GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ', ') AS org_category_names,
                GROUP_CONCAT(DISTINCT d.name ORDER BY d.name SEPARATOR ', ') AS org_department_names,
                GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS org_school_names
         FROM   ${assignmentTable} a
         JOIN   categories  c ON c.id = a.category_id AND c.deleted_at IS NULL
         JOIN   departments d ON d.id = c.department_id
         JOIN   schools     s ON s.id = d.school_id
         GROUP  BY a.${bookColumn}
       ) ass ON ass.book_id = ${bookAlias}.id`;
}

/** Physical books — caller's query must alias the books table as `b`. */
function physicalBookAssignmentSummary() {
  return {
    columns: ASSIGNMENT_SUMMARY_COLUMNS,
    join: assignmentSummaryJoin("book_category_assignments", "book_id", "b"),
  };
}

/** Digital books — caller's query must alias lexora_books as `lb`. */
function lexoraBookAssignmentSummary() {
  return {
    columns: ASSIGNMENT_SUMMARY_COLUMNS,
    join: assignmentSummaryJoin("lexora_book_assignments", "lexora_book_id", "lb"),
  };
}

// ── Row-level checks ──────────────────────────────────────

/**
 * Is this physical book accessible to the caller?
 * Returns { success, accessible }. Never throws on "not accessible".
 */
async function isPhysicalBookAccessible(scope, bookId) {
  try {
    if (!isScoped(scope)) return { success: true, accessible: true };

    const { sql, params } = physicalBookScopeSql(scope);
    const [rows] = await pool.query(
      `SELECT b.id FROM books b WHERE b.id = ? ${sql} LIMIT 1`,
      [bookId, ...params]
    );
    return { success: true, accessible: rows.length > 0 };
  } catch (error) {
    console.error("[bookAccess.isPhysicalBookAccessible]", error.message);
    return { success: false, error: error.message };
  }
}

/** Is this digital book accessible to the caller? */
async function isLexoraBookAccessible(scope, lexoraBookId) {
  try {
    if (!isScoped(scope)) return { success: true, accessible: true };

    const { sql, params } = lexoraBookScopeSql(scope);
    const [rows] = await pool.query(
      `SELECT lb.id FROM lexora_books lb WHERE lb.id = ? ${sql} LIMIT 1`,
      [lexoraBookId, ...params]
    );
    return { success: true, accessible: rows.length > 0 };
  } catch (error) {
    console.error("[bookAccess.isLexoraBookAccessible]", error.message);
    return { success: false, error: error.message };
  }
}

// ── Assignment management ─────────────────────────────────

/**
 * Replace a physical book's category assignments.
 * Every category must belong to the caller's school (super_admin:
 * any school). Uses a transaction so a partial write can't happen.
 */
async function setPhysicalBookCategories(bookId, categoryIds, assignedBy, scope) {
  const conn = await pool.getConnection();
  try {
    const ids = [...new Set((categoryIds || []).map(Number).filter(Boolean))];
    await conn.beginTransaction();

    if (ids.length) {
      const placeholders = ids.map(() => "?").join(", ");
      const params = [...ids];
      let schoolFilter = "";
      if (isScoped(scope)) {
        schoolFilter = "AND d.school_id = ?";
        params.push(scope.schoolId);
      }
      const [valid] = await conn.query(
        `SELECT c.id FROM categories c
         JOIN departments d ON d.id = c.department_id
         WHERE c.id IN (${placeholders}) AND c.deleted_at IS NULL ${schoolFilter}`,
        params
      );
      if (valid.length !== ids.length) {
        await conn.rollback();
        return {
          success: false,
          error: "One or more categories do not exist or belong to another school",
        };
      }
    }

    await conn.query("DELETE FROM book_category_assignments WHERE book_id = ?", [bookId]);
    for (const categoryId of ids) {
      await conn.query(
        "INSERT INTO book_category_assignments (book_id, category_id, assigned_by) VALUES (?, ?, ?)",
        [bookId, categoryId, assignedBy ?? null]
      );
    }
    await conn.commit();
    return { success: true, data: { bookId, categoryIds: ids } };
  } catch (error) {
    await conn.rollback();
    console.error("[bookAccess.setPhysicalBookCategories]", error.message);
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

/** Replace a digital book's category assignments (same rules). */
async function setLexoraBookCategories(lexoraBookId, categoryIds, assignedBy, scope) {
  const conn = await pool.getConnection();
  try {
    const ids = [...new Set((categoryIds || []).map(Number).filter(Boolean))];
    await conn.beginTransaction();

    if (ids.length) {
      const placeholders = ids.map(() => "?").join(", ");
      const params = [...ids];
      let schoolFilter = "";
      if (isScoped(scope)) {
        schoolFilter = "AND d.school_id = ?";
        params.push(scope.schoolId);
      }
      const [valid] = await conn.query(
        `SELECT c.id FROM categories c
         JOIN departments d ON d.id = c.department_id
         WHERE c.id IN (${placeholders}) AND c.deleted_at IS NULL ${schoolFilter}`,
        params
      );
      if (valid.length !== ids.length) {
        await conn.rollback();
        return {
          success: false,
          error: "One or more categories do not exist or belong to another school",
        };
      }
    }

    await conn.query("DELETE FROM lexora_book_assignments WHERE lexora_book_id = ?", [lexoraBookId]);
    for (const categoryId of ids) {
      await conn.query(
        "INSERT INTO lexora_book_assignments (lexora_book_id, category_id, assigned_by) VALUES (?, ?, ?)",
        [lexoraBookId, categoryId, assignedBy ?? null]
      );
    }
    await conn.commit();
    return { success: true, data: { lexoraBookId, categoryIds: ids } };
  } catch (error) {
    await conn.rollback();
    console.error("[bookAccess.setLexoraBookCategories]", error.message);
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

module.exports = {
  physicalBookScopeSql,
  lexoraBookScopeSql,
  physicalBookAssignmentSummary,
  lexoraBookAssignmentSummary,
  isPhysicalBookAccessible,
  isLexoraBookAccessible,
  setPhysicalBookCategories,
  setLexoraBookCategories,
};
