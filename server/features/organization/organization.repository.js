// ─────────────────────────────────────────────────────────
//  features/organization/organization.repository.js
//
//  ALL SQL for the school organization feature: schools,
//  departments, categories, hierarchy, and category↔book
//  assignment reads. No HTTP, no business rules.
// ─────────────────────────────────────────────────────────

const { pool } = require("../../config/db");
const sharedBookFilters = require("../../shared/bookFilterSql");

const OrganizationRepository = {

  // ── Schools ─────────────────────────────────────────────

  async listSchools(scope) {
    // super_admin / legacy caller → every school; others → own school.
    if (scope?.scoped) {
      const [rows] = await pool.query(
        `SELECT s.*, u.full_name AS created_by_name
         FROM schools s
         LEFT JOIN users u ON u.id = s.created_by
         WHERE s.id = ?
         ORDER BY s.name ASC`,
        [scope.schoolId]
      );
      return rows;
    }
    const [rows] = await pool.query(
      `SELECT s.*, u.full_name AS created_by_name
       FROM schools s
       LEFT JOIN users u ON u.id = s.created_by
       ORDER BY s.name ASC`
    );
    return rows;
  },

  async getSchoolById(id) {
    const [rows] = await pool.query(
      `SELECT s.*, u.full_name AS created_by_name
       FROM schools s
       LEFT JOIN users u ON u.id = s.created_by
       WHERE s.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findSchoolByCode(code) {
    const [rows] = await pool.query(
      "SELECT id FROM schools WHERE code = ? LIMIT 1", [code]
    );
    return rows[0] || null;
  },

  async findSchoolByName(name) {
    const [rows] = await pool.query(
      "SELECT id FROM schools WHERE name = ? LIMIT 1", [name]
    );
    return rows[0] || null;
  },

  async createSchool(schoolData, createdBy) {
    const [result] = await pool.query(
      `INSERT INTO schools (code, name, description, status, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        schoolData.code,
        schoolData.name,
        schoolData.description || null,
        schoolData.status || "active",
        createdBy ?? null,
      ]
    );
    return result.insertId;
  },

  async updateSchool(id, schoolData) {
    const fields = [];
    const params = [];
    for (const key of ["code", "name", "description", "status"]) {
      if (schoolData[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(schoolData[key] || null);
      }
    }
    if (!fields.length) return;
    params.push(id);
    await pool.query(`UPDATE schools SET ${fields.join(", ")} WHERE id = ?`, params);
  },

  async deleteSchool(id) {
    await pool.query("DELETE FROM schools WHERE id = ?", [id]);
  },

  async schoolReferenceCounts(schoolId) {
    const [[{ departments }]] = await pool.query(
      "SELECT COUNT(*) AS departments FROM departments WHERE school_id = ?", [schoolId]
    );
    const [[{ users }]] = await pool.query(
      "SELECT COUNT(*) AS users FROM users WHERE school_id = ?", [schoolId]
    );
    const [[{ faculty }]] = await pool.query(
      "SELECT COUNT(*) AS faculty FROM faculty WHERE school_id = ?", [schoolId]
    );
    return { departments, users, faculty };
  },

  // ── Departments ─────────────────────────────────────────

  async listDepartments(schoolId) {
    const [rows] = await pool.query(
      `SELECT d.*, s.name AS school_name, u.full_name AS created_by_name,
              (SELECT COUNT(*) FROM categories c
                WHERE c.department_id = d.id AND c.deleted_at IS NULL) AS category_count
       FROM departments d
       JOIN schools s ON s.id = d.school_id
       LEFT JOIN users u ON u.id = d.created_by
       WHERE d.school_id = ?
       ORDER BY d.name ASC`,
      [schoolId]
    );
    return rows;
  },

  async getDepartmentById(id) {
    const [rows] = await pool.query(
      `SELECT d.*, s.name AS school_name
       FROM departments d
       JOIN schools s ON s.id = d.school_id
       WHERE d.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findDepartmentByName(schoolId, name) {
    const [rows] = await pool.query(
      "SELECT id FROM departments WHERE school_id = ? AND name = ? LIMIT 1",
      [schoolId, name]
    );
    return rows[0] || null;
  },

  async findDepartmentByCode(schoolId, code) {
    const [rows] = await pool.query(
      "SELECT id FROM departments WHERE school_id = ? AND code = ? LIMIT 1",
      [schoolId, code]
    );
    return rows[0] || null;
  },

  async createDepartment(deptData, createdBy) {
    const [result] = await pool.query(
      `INSERT INTO departments (school_id, name, code, description, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        deptData.school_id,
        deptData.name,
        deptData.code,
        deptData.description || null,
        deptData.is_active ?? 1,
        createdBy ?? null,
      ]
    );
    return result.insertId;
  },

  async updateDepartment(id, deptData) {
    const fields = [];
    const params = [];
    for (const key of ["name", "code", "description", "is_active"]) {
      if (deptData[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(key === "is_active" ? (deptData[key] ? 1 : 0) : (deptData[key] || null));
      }
    }
    if (!fields.length) return;
    params.push(id);
    await pool.query(`UPDATE departments SET ${fields.join(", ")} WHERE id = ?`, params);
  },

  async deleteDepartment(id) {
    await pool.query("DELETE FROM departments WHERE id = ?", [id]);
  },

  async departmentReferenceCounts(departmentId) {
    const [[{ categories }]] = await pool.query(
      "SELECT COUNT(*) AS categories FROM categories WHERE department_id = ? AND deleted_at IS NULL",
      [departmentId]
    );
    const [[{ users }]] = await pool.query(
      "SELECT COUNT(*) AS users FROM users WHERE department_id = ?", [departmentId]
    );
    const [[{ faculty }]] = await pool.query(
      "SELECT COUNT(*) AS faculty FROM faculty WHERE department_id = ?", [departmentId]
    );
    return { categories, users, faculty };
  },

  // ── Categories ──────────────────────────────────────────

  async listCategories(departmentId) {
    const [rows] = await pool.query(
      `SELECT c.*, d.name AS department_name, d.school_id,
              u.full_name AS created_by_name,
              (SELECT COUNT(*) FROM book_category_assignments a WHERE a.category_id = c.id) AS book_count,
              (SELECT COUNT(*) FROM lexora_book_assignments a WHERE a.category_id = c.id) AS lexora_book_count
       FROM categories c
       JOIN departments d ON d.id = c.department_id
       LEFT JOIN users u ON u.id = c.created_by
       WHERE c.department_id = ? AND c.deleted_at IS NULL
       ORDER BY c.name ASC`,
      [departmentId]
    );
    return rows;
  },

  async listCategoriesBySchool(schoolId) {
    const [rows] = await pool.query(
      `SELECT c.*, d.name AS department_name, d.school_id,
              (SELECT COUNT(*) FROM book_category_assignments a WHERE a.category_id = c.id) AS book_count,
              (SELECT COUNT(*) FROM lexora_book_assignments a WHERE a.category_id = c.id) AS lexora_book_count
       FROM categories c
       JOIN departments d ON d.id = c.department_id
       WHERE d.school_id = ? AND c.deleted_at IS NULL
       ORDER BY d.name ASC, c.name ASC`,
      [schoolId]
    );
    return rows;
  },

  async getCategoryById(id) {
    const [rows] = await pool.query(
      `SELECT c.*, d.name AS department_name, d.school_id
       FROM categories c
       JOIN departments d ON d.id = c.department_id
       WHERE c.id = ? AND c.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findCategoryByName(departmentId, name) {
    const [rows] = await pool.query(
      "SELECT id FROM categories WHERE department_id = ? AND name = ? LIMIT 1",
      [departmentId, name]
    );
    return rows[0] || null;
  },

  async createCategory(catData, createdBy) {
    const [result] = await pool.query(
      `INSERT INTO categories (department_id, name, description, is_active, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        catData.department_id,
        catData.name,
        catData.description || null,
        catData.is_active ?? 1,
        createdBy ?? null,
      ]
    );
    return result.insertId;
  },

  async updateCategory(id, catData) {
    const fields = [];
    const params = [];
    for (const key of ["name", "description", "is_active"]) {
      if (catData[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(key === "is_active" ? (catData[key] ? 1 : 0) : (catData[key] || null));
      }
    }
    if (!fields.length) return;
    params.push(id);
    await pool.query(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`, params);
  },

  async softDeleteCategory(id) {
    await pool.query(
      "UPDATE categories SET deleted_at = NOW(), is_active = 0 WHERE id = ? AND deleted_at IS NULL",
      [id]
    );
  },

  async moveCategory(id, departmentId) {
    await pool.query("UPDATE categories SET department_id = ? WHERE id = ?", [departmentId, id]);
  },

  // ── Hierarchy ───────────────────────────────────────────

  async getHierarchy(schoolId) {
    // Batched: schools → departments in one query → categories in one query.
    const schoolFilter = schoolId ? "WHERE s.id = ?" : "WHERE s.status = 'active'";
    const schoolParams = schoolId ? [schoolId] : [];

    const [schools] = await pool.query(
      `SELECT id, code, name, status FROM schools s ${schoolFilter} ORDER BY s.name ASC`,
      schoolParams
    );
    if (!schools.length) return [];

    const [departments] = await pool.query(
      `SELECT id, school_id, name, code, is_active
       FROM departments
       WHERE school_id IN (${schools.map(() => "?").join(", ")})
       ORDER BY name ASC`,
      schools.map((s) => s.id)
    );

    const [categories] = await pool.query(
      `SELECT c.id, c.department_id, c.name,
              (SELECT COUNT(*) FROM book_category_assignments a WHERE a.category_id = c.id) AS book_count,
              (SELECT COUNT(*) FROM lexora_book_assignments a WHERE a.category_id = c.id) AS lexora_book_count
       FROM categories c
       WHERE c.department_id IN (${departments.map(() => "?").join(", ") || "NULL"})
         AND c.deleted_at IS NULL
       ORDER BY c.name ASC`,
      departments.length ? departments.map((d) => d.id) : []
    );

    const categoryByDept = new Map();
    for (const cat of categories) {
      if (!categoryByDept.has(cat.department_id)) categoryByDept.set(cat.department_id, []);
      categoryByDept.get(cat.department_id).push(cat);
    }
    const deptBySchool = new Map();
    for (const dept of departments) {
      if (!deptBySchool.has(dept.school_id)) deptBySchool.set(dept.school_id, []);
      deptBySchool.get(dept.school_id).push({
        ...dept,
        categories: categoryByDept.get(dept.id) || [],
      });
    }

    return schools.map((school) => ({
      ...school,
      departments: deptBySchool.get(school.id) || [],
    }));
  },

  // ── Assignment reads (organization views) ───────────────

  async listBooksForCategory(categoryId, scopeSql, scopeParams) {
    const [rows] = await pool.query(
      `SELECT b.id, b.title, b.author, b.accessionNumber, b.status, b.quantity,
              a.created_at AS assigned_at
       FROM book_category_assignments a
       JOIN books b ON b.id = a.book_id
       WHERE a.category_id = ? ${scopeSql}
       ORDER BY b.title ASC`,
      [categoryId, ...scopeParams]
    );
    return rows;
  },

  async listLexoraBooksForCategory(categoryId, scopeSql, scopeParams) {
    const [rows] = await pool.query(
      `SELECT lb.id, lb.title, lb.author, lb.resource_type, lb.status,
              a.created_at AS assigned_at
       FROM lexora_book_assignments a
       JOIN lexora_books lb ON lb.id = a.lexora_book_id
       WHERE a.category_id = ? ${scopeSql}
       ORDER BY lb.title ASC`,
      [categoryId, ...scopeParams]
    );
    return rows;
  },

  async getBookCategoryIds(bookId) {
    const [rows] = await pool.query(
      "SELECT category_id FROM book_category_assignments WHERE book_id = ?",
      [bookId]
    );
    return rows.map((r) => r.category_id);
  },

  async getLexoraBookCategoryIds(lexoraBookId) {
    const [rows] = await pool.query(
      "SELECT category_id FROM lexora_book_assignments WHERE lexora_book_id = ?",
      [lexoraBookId]
    );
    return rows.map((r) => r.category_id);
  },

  // ── Bulk assignment (filter-driven or explicit ids) ─────
  //
  // Idempotent: the assignment tables' unique keys make a re-run a
  // no-op, so affectedRows is exactly the number of NEW assignments
  // and `skipped` = matched − assigned. The filter predicates come
  // from shared/bookFilterSql — the same builder the catalog list
  // endpoints use — so "everything matching these filters" always
  // means what the book list shows.

  /** Books a filter would select — the dry-run / preview count. */
  async countBooksMatching(filters, excludeIds, type, categoryId) {
    const { where, params } = this._buildBulkWhere(filters, excludeIds, type);
    const isLexora = type === "lexora";
    const table = isLexora ? "lexora_books lb" : `books b ${sharedBookFilters.BOOK_COPIES_JOIN}`;
    const assignmentTable = isLexora ? "lexora_book_assignments" : "book_category_assignments";
    const assignmentBookColumn = isLexora ? "lexora_book_id" : "book_id";
    const bookColumn = isLexora ? "lb.id" : "b.id";

    const [[row]] = await pool.query(
      `SELECT COUNT(*) AS matched,
              COALESCE(SUM(CASE WHEN a.${assignmentBookColumn} IS NOT NULL THEN 1 ELSE 0 END), 0) AS already_assigned
       FROM   ${table}
       LEFT JOIN ${assignmentTable} a
              ON a.${assignmentBookColumn} = ${bookColumn} AND a.category_id = ?
       WHERE  ${where.join(" AND ")}`,
      [categoryId, ...params]
    );
    return {
      matched: Number(row?.matched) || 0,
      already_assigned: Number(row?.already_assigned) || 0,
    };
  },

  /** WHERE builder shared by the count and the insert (same params order). */
  _buildBulkWhere(filters, excludeIds, type) {
    const isLexora = type === "lexora";
    const built = isLexora
      ? sharedBookFilters.lexoraBookFilters(filters, "lb")
      : sharedBookFilters.physicalBookFilters(filters, "b");

    const exclude = (excludeIds || []).map(Number).filter(Number.isFinite);
    const where = [
      isLexora ? "lb.deleted_at IS NULL" : "b.is_deleted = 0",
      ...built.conditions,
    ];
    const params = [...built.params];

    if (exclude.length) {
      where.push(`${isLexora ? "lb" : "b"}.id NOT IN (${exclude.map(() => "?").join(",")})`);
      params.push(...exclude);
    }
    return { where, params };
  },

  async assignBooksByFilter(categoryId, filters, excludeIds, assignedBy, type) {
    const { where, params } = this._buildBulkWhere(filters, excludeIds, type);
    const isLexora = type === "lexora";
    const table      = isLexora ? "lexora_books lb" : `books b ${sharedBookFilters.BOOK_COPIES_JOIN}`;
    const bookColumn = isLexora ? "lb.id" : "b.id";
    const assignmentTable = isLexora ? "lexora_book_assignments" : "book_category_assignments";
    const assignmentBookColumn = isLexora ? "lexora_book_id" : "book_id";

    const [[counts]] = await pool.query(
      `SELECT COUNT(*) AS matched,
              COALESCE(SUM(CASE WHEN a.${assignmentBookColumn} IS NOT NULL THEN 1 ELSE 0 END), 0) AS already_assigned
       FROM   ${table}
       LEFT JOIN ${assignmentTable} a
              ON a.${assignmentBookColumn} = ${bookColumn} AND a.category_id = ?
       WHERE  ${where.join(" AND ")}`,
      [categoryId, ...params]
    );

    // Placeholder order in this SQL is (category_id, assigned_by,
    // <WHERE params…>) — the params MUST follow that order. Binding the
    // filter values first made category_id receive a LIKE pattern and
    // INSERT IGNORE silently skipped every row (assigned: 0).
    const [insert] = await pool.query(
      `INSERT IGNORE INTO ${isLexora ? "lexora_book_assignments (lexora_book_id, category_id, assigned_by)" : "book_category_assignments (book_id, category_id, assigned_by)"}
       SELECT ${bookColumn}, ?, ? FROM ${table} WHERE ${where.join(" AND ")}`,
      [categoryId, assignedBy ?? null, ...params]
    );

    return {
      matched: Number(counts?.matched) || 0,
      assigned: insert.affectedRows || 0,
    };
  },

  async assignBooksByIds(categoryId, bookIds, assignedBy, type) {
    const isLexora = type === "lexora";
    const ids = (bookIds || []).map(Number).filter(Number.isFinite);
    if (!ids.length) return { matched: 0, assigned: 0 };

    const [insert] = await pool.query(
      `INSERT IGNORE INTO ${isLexora ? "lexora_book_assignments (lexora_book_id, category_id, assigned_by)" : "book_category_assignments (book_id, category_id, assigned_by)"}
       VALUES ${ids.map(() => "(?, ?, ?)").join(",")}`,
      ids.flatMap((id) => [id, categoryId, assignedBy ?? null])
    );

    return {
      matched: ids.length,
      assigned: insert.affectedRows || 0,
    };
  },
};

module.exports = OrganizationRepository;
