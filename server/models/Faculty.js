// ─────────────────────────────────────────────────────────
//  models/Faculty.js
//  Faculty Model - MySQL CRUD Operations
//
//  Faculty management is school-scoped (school_id /
//  department_id bridge to the organization tables). The
//  BORROWER lookup (TransactionModel.searchFaculty) is
//  deliberately unscoped — faculty may borrow at any school.
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

const VALID_DEPARTMENTS = ['CIT', 'CCJE', 'CEAS', 'CBE', 'HS'];

/** Scope predicate for the faculty list (alias f). */
function scopeSql(scope) {
  if (!scope || !scope.scoped || scope.schoolId == null) return { sql: "", params: [] };
  return {
    sql: "AND (f.school_id IS NULL OR f.school_id = ?)",
    params: [scope.schoolId],
  };
}

const FacultyModel = {

  async getAll(scope = null) {
    try {
      const { sql, params } = scopeSql(scope);
      const [rows] = await pool.query(
        `SELECT f.*, s.name AS school_name, d.name AS department_name
         FROM faculty f
         LEFT JOIN schools s     ON s.id = f.school_id
         LEFT JOIN departments d ON d.id = f.department_id
         WHERE f.is_active = 1 AND f.deleted_at IS NULL ${sql}
         ORDER BY f.faculty_name ASC`,
        params
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[FacultyModel.getAll]", error.message);
      return { success: false, error: error.message };
    }
  },

  async getById(id, scope = null) {
    try {
      const { sql, params } = scopeSql(scope);
      const [rows] = await pool.query(
        `SELECT f.* FROM faculty f
         WHERE f.id = ? AND f.is_active = 1 AND f.deleted_at IS NULL ${sql}
         LIMIT 1`,
        [id, ...params]
      );
      return rows.length ? { success: true, data: rows[0] } : { success: false, error: "Faculty not found" };
    } catch (error) {
      console.error("[FacultyModel.getById]", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Validate the school/department pairing, applying the caller's
   * scope. Scoped callers are pinned to their own school
   * ("first touch assigns" for legacy rows created by them).
   */
  async _resolveScope(payload, scope) {
    let schoolId = payload.school_id ?? null;
    let departmentId = payload.department_id ?? null;

    if (scope && scope.scoped) {
      if (schoolId != null && Number(schoolId) !== Number(scope.schoolId)) {
        return { error: "Faculty must belong to your school" };
      }
      schoolId = scope.schoolId;
    }
    if (departmentId != null) {
      if (schoolId == null) {
        return { error: "Assign a school before assigning a department" };
      }
      const [rows] = await pool.query(
        "SELECT id FROM departments WHERE id = ? AND school_id = ? LIMIT 1",
        [departmentId, schoolId]
      );
      if (!rows.length) {
        return { error: "Department must belong to the faculty member's school" };
      }
    }
    return { schoolId, departmentId };
  },

  async create(payload, scope = null) {
    try {
      if (!payload.faculty_name?.trim()) return { success: false, error: "Faculty name is required" };
      if (!VALID_DEPARTMENTS.includes(payload.department)) return { success: false, error: "Invalid department" };

      const resolved = await this._resolveScope(payload, scope);
      if (resolved.error) return { success: false, error: resolved.error };

      const [result] = await pool.query(
        "INSERT INTO faculty (faculty_name, department, school_id, department_id) VALUES (?, ?, ?, ?)",
        [payload.faculty_name.trim(), payload.department, resolved.schoolId, resolved.departmentId]
      );
      const [rows] = await pool.query("SELECT * FROM faculty WHERE id = ?", [result.insertId]);
      console.log(`✅ Faculty created: ${payload.faculty_name}`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[FacultyModel.create]", error.message);
      return { success: false, error: error.message };
    }
  },

  async update(id, payload, scope = null) {
    try {
      if (!payload.faculty_name?.trim()) return { success: false, error: "Faculty name is required" };
      if (!VALID_DEPARTMENTS.includes(payload.department)) return { success: false, error: "Invalid department" };

      const [existing] = await pool.query("SELECT * FROM faculty WHERE id = ?", [id]);
      if (!existing.length) return { success: false, error: "Faculty not found" };

      // Scoped callers may only edit faculty of their own school.
      if (scope && scope.scoped && scope.schoolId != null
          && existing[0].school_id != null && existing[0].school_id !== scope.schoolId) {
        return { success: false, error: "Faculty belongs to another school" };
      }

      const resolved = await this._resolveScope(payload, scope);
      if (resolved.error) return { success: false, error: resolved.error };

      await pool.query(
        "UPDATE faculty SET faculty_name = ?, department = ?, school_id = ?, department_id = ?, updated_at = NOW() WHERE id = ?",
        [payload.faculty_name.trim(), payload.department, resolved.schoolId, resolved.departmentId, id]
      );
      const [rows] = await pool.query("SELECT * FROM faculty WHERE id = ?", [id]);
      if (!rows.length) return { success: false, error: "Faculty not found" };
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[FacultyModel.update]", error.message);
      return { success: false, error: error.message };
    }
  },

  async delete(id, scope = null) {
    try {
      const [existing] = await pool.query("SELECT * FROM faculty WHERE id = ?", [id]);
      if (!existing.length) return { success: false, error: "Faculty not found" };

      // Scoped callers may only delete faculty of their own school.
      if (scope && scope.scoped && scope.schoolId != null
          && existing[0].school_id != null && existing[0].school_id !== scope.schoolId) {
        return { success: false, error: "Faculty belongs to another school" };
      }

      const TrashModel = require("./Trash");
      return TrashModel.softDelete("faculty", Number(id), null, existing[0].school_id ?? null);
    } catch (error) {
      console.error("[FacultyModel.delete]", error.message);
      return { success: false, error: error.message };
    }
  },

  async bulkImport(facultyData, scope = null) {
    const results = { successful: 0, failed: 0, errors: [] };
    for (let i = 0; i < facultyData.length; i++) {
      const row    = facultyData[i];
      const result = await this.create(row, scope);
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push({ index: i, error: result.error, data: row });
      }
    }
    console.log(`✅ Faculty bulk import: ${results.successful} ok, ${results.failed} failed`);
    return { success: true, data: results };
  },
};

module.exports = FacultyModel;
