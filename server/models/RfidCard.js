// ─────────────────────────────────────────────────────────
//  models/RfidCard.js
//  RFID Card Model - MySQL CRUD Operations
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

const RfidCardModel = {
  /**
   * Find a registered RFID card by rfid_code
   */
  async findByCode(rfidCode) {
    try {
      const [rows] = await pool.query(
        `SELECT rc.*, s.student_name, s.display_name, s.first_name, s.last_name,
                s.student_course, s.student_yr_level, s.student_school_year, s.is_active
         FROM rfid_cards rc
         JOIN students s ON s.student_id_number = rc.student_id_number
         WHERE rc.rfid_code = ?
         LIMIT 1`,
        [rfidCode]
      );
      if (rows.length === 0) return { success: false, found: false };
      return { success: true, found: true, data: rows[0] };
    } catch (error) {
      console.error("[RfidCardModel.findByCode] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Register a new RFID card to a student
   */
  async register(rfidCode, studentIdNumber) {
    try {
      // Verify student exists
      const [students] = await pool.query(
        `SELECT student_id_number FROM students WHERE student_id_number = ? AND is_active = 1 LIMIT 1`,
        [studentIdNumber]
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
        `SELECT rc.*, s.student_name, s.display_name, s.first_name, s.last_name,
                s.student_course, s.student_yr_level
         FROM rfid_cards rc
         JOIN students s ON s.student_id_number = rc.student_id_number
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
   * Handle RFID tap — if registered, do attendance tap; if not, return unregistered status
   */
  async tap(rfidCode) {
    try {
      const cardResult = await this.findByCode(rfidCode);

      if (!cardResult.found) {
        return { success: false, unregistered: true, rfid_code: rfidCode };
      }

      // Card is registered — delegate to attendance tap
      const AttendanceModel = require("./Attendance");
      const tapResult = await AttendanceModel.tap(cardResult.data.student_id_number);

      return { ...tapResult, rfid_code: rfidCode };
    } catch (error) {
      console.error("[RfidCardModel.tap] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all registered RFID cards
   */
  async getAll() {
    try {
      const [rows] = await pool.query(
        `SELECT rc.*, s.student_name, s.display_name, s.student_course, s.student_yr_level
         FROM rfid_cards rc
         JOIN students s ON s.student_id_number = rc.student_id_number
         ORDER BY rc.registered_at DESC`
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[RfidCardModel.getAll] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete an RFID card by id
   */
  async delete(id) {
    try {
      await pool.query(`DELETE FROM rfid_cards WHERE id = ?`, [id]);
      return { success: true };
    } catch (error) {
      console.error("[RfidCardModel.delete] Error:", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = RfidCardModel;
