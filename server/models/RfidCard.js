// ─────────────────────────────────────────────────────────
//  models/RfidCard.js
//  RFID Card Model - MySQL CRUD Operations
//
//  CONSOLIDATION: RFID cards map to student USERS (the students
//  table is retired) — `users WHERE role = 'student'` joined on
//  student_id_number. Registration search and the tap path are
//  school-scoped through the resolveSchoolScope middleware.
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

const RfidCardModel = {
  /**
   * Find a registered RFID card by rfid_code (student user joined).
   */
  async findByCode(rfidCode, scope = null) {
    try {
      const params = [rfidCode];
      let scopeSql = "";
      if (scope && scope.scoped && scope.schoolId != null) {
        scopeSql = "AND (u.school_id IS NULL OR u.school_id = ?)";
        params.push(scope.schoolId);
      }
      const [rows] = await pool.query(
        `SELECT rc.*,
                u.full_name AS student_name, u.full_name AS display_name,
                null AS first_name, null AS last_name,
                u.student_course, u.student_yr_level, u.student_school_year,
                u.school_id, u.is_active
         FROM rfid_cards rc
         JOIN users u ON u.student_id_number = rc.student_id_number AND u.role = 'student'
         WHERE rc.rfid_code = ?
         ${scopeSql}
         LIMIT 1`,
        params
      );
      if (rows.length === 0) return { success: false, found: false };
      return { success: true, found: true, data: rows[0] };
    } catch (error) {
      console.error("[RfidCardModel.findByCode] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Register a new RFID card to a student user.
   * The student must belong to the registering operator's school.
   */
  async register(rfidCode, studentIdNumber, scope = null) {
    try {
      // Verify the student user exists (and is in scope).
      const studentParams = [studentIdNumber];
      let studentScope = "";
      if (scope && scope.scoped && scope.schoolId != null) {
        studentScope = "AND (school_id = ? OR school_id IS NULL)";
        studentParams.push(scope.schoolId);
      }
      const [students] = await pool.query(
        `SELECT student_id_number FROM users
         WHERE student_id_number = ? AND role = 'student' AND is_active = 1 ${studentScope}
         LIMIT 1`,
        studentParams
      );
      if (students.length === 0) {
        return { success: false, error: "Student not found or inactive." };
      }

      // Check if rfid_code is already registered
      const [existing] = await pool.query(
        `SELECT id FROM rfid_cards WHERE rfid_code = ? LIMIT 1`,
        [rfidCode]
      );
      if (existing.length > 0) {
        return { success: false, error: "This RFID card is already registered." };
      }

      // Check if student already has a card
      const [studentCard] = await pool.query(
        `SELECT id FROM rfid_cards WHERE student_id_number = ? LIMIT 1`,
        [studentIdNumber]
      );
      if (studentCard.length > 0) {
        return { success: false, error: "This student already has a registered RFID card." };
      }

      const [result] = await pool.query(
        `INSERT INTO rfid_cards (rfid_code, student_id_number) VALUES (?, ?)`,
        [rfidCode, studentIdNumber]
      );

      const [inserted] = await pool.query(
        `SELECT rc.*, u.full_name AS student_name, u.student_course, u.student_yr_level
         FROM rfid_cards rc
         JOIN users u ON u.student_id_number = rc.student_id_number AND u.role = 'student'
         WHERE rc.id = ?`,
        [result.insertId]
      );

      console.log(`✅ RFID registered: ${rfidCode} → ${studentIdNumber}`);
      return { success: true, data: inserted[0] };
    } catch (error) {
      console.error("[RfidCardModel.register] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Handle RFID tap — if registered, do attendance tap (with the
   * kiosk fail-closed school check); if not, return unregistered.
   */
  async tap(rfidCode, scope = null) {
    try {
      const cardResult = await this.findByCode(rfidCode, scope);

      if (!cardResult.found) {
        // Distinguish "card unregistered" from "card registered to a
        // student of another school" without leaking existence.
        const [plain] = await pool.query(
          "SELECT rc.student_id_number FROM rfid_cards rc WHERE rc.rfid_code = ? LIMIT 1",
          [rfidCode]
        );
        if (plain.length) {
          return { success: false, outOfScope: true, rfid_code: rfidCode };
        }
        return { success: false, unregistered: true, rfid_code: rfidCode };
      }

      // Card is registered — delegate to attendance tap
      const AttendanceModel = require("./Attendance");
      const tapResult = await AttendanceModel.tap(cardResult.data.student_id_number, scope);

      if (tapResult.outOfScope) {
        return { success: false, outOfScope: true, rfid_code: rfidCode };
      }

      return { ...tapResult, rfid_code: rfidCode };
    } catch (error) {
      console.error("[RfidCardModel.tap] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all registered RFID cards — school-scoped.
   */
  async getAll(scope = null) {
    try {
      const params = [];
      let scopeSql = "";
      if (scope && scope.scoped && scope.schoolId != null) {
        scopeSql = "AND (u.school_id IS NULL OR u.school_id = ?)";
        params.push(scope.schoolId);
      }
      const [rows] = await pool.query(
        `SELECT rc.*, u.full_name AS student_name, u.student_course, u.student_yr_level
         FROM rfid_cards rc
         JOIN users u ON u.student_id_number = rc.student_id_number AND u.role = 'student'
         WHERE 1=1 ${scopeSql}
         ORDER BY rc.registered_at DESC`,
        params
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[RfidCardModel.getAll] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get RFID cards for a specific student user (scoped).
   */
  async getByStudent(studentIdNumber, scope = null) {
    try {
      const params = [studentIdNumber];
      let scopeSql = "";
      if (scope && scope.scoped && scope.schoolId != null) {
        scopeSql = "AND (u.school_id = ? OR u.school_id IS NULL)";
        params.push(scope.schoolId);
      }
      const [rows] = await pool.query(
        `SELECT rc.*, u.full_name AS student_name
         FROM rfid_cards rc
         JOIN users u ON u.student_id_number = rc.student_id_number AND u.role = 'student'
         WHERE rc.student_id_number = ? ${scopeSql}`,
        params
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[RfidCardModel.getByStudent] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete an RFID card by id (scoped through its student user).
   */
  async delete(id, scope = null) {
    try {
      const params = [id];
      let scopeSql = "";
      if (scope && scope.scoped && scope.schoolId != null) {
        scopeSql = `AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.student_id_number = rc.student_id_number AND u.role = 'student'
            AND (u.school_id = ? OR u.school_id IS NULL)
        )`;
        params.push(scope.schoolId);
      }
      const [result] = await pool.query(
        `DELETE rc FROM rfid_cards rc WHERE rc.id = ? ${scopeSql}`,
        params
      );
      if (!result.affectedRows) {
        return { success: false, error: "RFID card not found" };
      }
      return { success: true };
    } catch (error) {
      console.error("[RfidCardModel.delete] Error:", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = RfidCardModel;
