// ─────────────────────────────────────────────────────────
//  models/Faculty.js
//  Faculty Model - MySQL CRUD Operations
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

const VALID_DEPARTMENTS = ['CIT', 'CCJE', 'CEAS', 'CBE', 'HS'];

const FacultyModel = {

  async getAll() {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM faculty WHERE is_active = 1 AND deleted_at IS NULL ORDER BY faculty_name ASC"
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[FacultyModel.getAll]", error.message);
      return { success: false, error: error.message };
    }
  },

  async create({ faculty_name, department }) {
    try {
      if (!faculty_name?.trim()) return { success: false, error: "Faculty name is required" };
      if (!VALID_DEPARTMENTS.includes(department)) return { success: false, error: "Invalid department" };

      const [result] = await pool.query(
        "INSERT INTO faculty (faculty_name, department) VALUES (?, ?)",
        [faculty_name.trim(), department]
      );
      const [rows] = await pool.query("SELECT * FROM faculty WHERE id = ?", [result.insertId]);
      console.log(`✅ Faculty created: ${faculty_name}`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[FacultyModel.create]", error.message);
      return { success: false, error: error.message };
    }
  },

  async update(id, { faculty_name, department }) {
    try {
      if (!faculty_name?.trim()) return { success: false, error: "Faculty name is required" };
      if (!VALID_DEPARTMENTS.includes(department)) return { success: false, error: "Invalid department" };

      await pool.query(
        "UPDATE faculty SET faculty_name = ?, department = ?, updated_at = NOW() WHERE id = ?",
        [faculty_name.trim(), department, id]
      );
      const [rows] = await pool.query("SELECT * FROM faculty WHERE id = ?", [id]);
      if (!rows.length) return { success: false, error: "Faculty not found" };
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[FacultyModel.update]", error.message);
      return { success: false, error: error.message };
    }
  },

  async delete(id) {
    try {
      const TrashModel = require("./Trash");
      const [existing] = await pool.query("SELECT * FROM faculty WHERE id = ?", [id]);
      if (!existing.length) return { success: false, error: "Faculty not found" };
      return TrashModel.softDelete("faculty", Number(id));
    } catch (error) {
      console.error("[FacultyModel.delete]", error.message);
      return { success: false, error: error.message };
    }
  },

  async bulkImport(facultyData) {
    const results = { successful: 0, failed: 0, errors: [] };
    for (let i = 0; i < facultyData.length; i++) {
      const row    = facultyData[i];
      const result = await this.create(row);
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