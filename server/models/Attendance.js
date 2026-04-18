// ─────────────────────────────────────────────────────────
//  models/Attendance.js
//  Attendance Model - MySQL CRUD Operations
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

const AttendanceModel = {
  /**
   * Get all attendance records
   */
  async getAll() {
    try {
      const [rows] = await pool.query(`
        SELECT a.*,
               s.first_name,
               s.last_name
        FROM attendance a
        LEFT JOIN students s ON s.student_id_number = a.student_id_number
        WHERE a.is_deleted = 0
        ORDER BY a.check_in_time DESC
      `);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getAll] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get attendance record by ID
   */
  async getById(id) {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM attendance WHERE id = ? AND is_deleted = 0
      `, [id]);
      if (rows.length === 0) {
        return { success: false, error: "Attendance record not found" };
      }
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[AttendanceModel.getById] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get active attendance records (checked in but not checked out)
   */
  async getActiveAttendance() {
    try {
      const [rows] = await pool.query(`
        SELECT a.*,
               s.first_name,
               s.last_name
        FROM attendance a
        LEFT JOIN students s ON s.student_id_number = a.student_id_number
        WHERE a.status = 'checked_in' AND a.is_deleted = 0
        ORDER BY a.check_in_time DESC
      `);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getActiveAttendance] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get attendance records by student ID
   */
  async getByStudentId(studentIdNumber) {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM attendance 
        WHERE student_id_number = ? AND is_deleted = 0
        ORDER BY check_in_time DESC
      `, [studentIdNumber]);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getByStudentId] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Tap logic: first tap = check in, second tap = check out.
   * Looks up student from the master `students` table automatically.
   * Returns { action: 'checked_in' | 'checked_out', data } on success.
   */
  async tap(studentIdNumber) {
    try {
      // ── 1. Verify student exists in master table ─────────────────────
      const [studentRecords] = await pool.query(`
        SELECT 
          student_name,
          display_name,
          first_name,
          last_name,
          student_course,
          student_yr_level,
          student_school_year
        FROM students 
        WHERE student_id_number = ? AND is_active = 1
        LIMIT 1
      `, [studentIdNumber]);

      if (studentRecords.length === 0) {
        return { success: false, error: "Student ID not found in the system." };
      }

      const student = studentRecords[0];
      const studentName    = student.display_name || student.student_name;
      const firstName      = student.first_name        || '';
      const lastName       = student.last_name         || '';
      const studentCourse  = student.student_course    || '';
      const studentYrLevel = student.student_yr_level  || '';
      const schoolYear     = student.student_school_year || '';

      // ── 2. Check for an open (checked_in) record today ───────────────
      const [existing] = await pool.query(`
        SELECT * FROM attendance 
        WHERE student_id_number = ? 
          AND status = 'checked_in'
          AND is_deleted = 0
        ORDER BY check_in_time DESC
        LIMIT 1
      `, [studentIdNumber]);

      // ── 3a. Already checked in → check out ──────────────────────────
      if (existing.length > 0) {
        const record = existing[0];

        // Use MySQL TIMESTAMPDIFF to avoid JS↔MySQL timezone mismatch.
        // NOW() and check_in_time are both stored/compared in the same
        // MySQL session timezone, so the difference is always correct.
        await pool.query(`
          UPDATE attendance 
          SET check_out_time = NOW(),
              duration = GREATEST(0, TIMESTAMPDIFF(MINUTE, check_in_time, NOW())),
              status = 'checked_out'
          WHERE id = ?
        `, [record.id]);

        const [updated] = await pool.query(
          `SELECT * FROM attendance WHERE id = ?`, [record.id]
        );

        console.log(`✅ Checked OUT: ${studentName} (${studentIdNumber})`);
        return { success: true, action: 'checked_out', data: { ...updated[0], first_name: firstName, last_name: lastName } };
      }

      // ── 3b. Not checked in → check in ───────────────────────────────
      const [result] = await pool.query(`
        INSERT INTO attendance 
          (student_name, student_id_number, student_course, student_yr_level, school_year, check_in_time, status)
        VALUES (?, ?, ?, ?, ?, NOW(), 'checked_in')
      `, [studentName, studentIdNumber, studentCourse, studentYrLevel, schoolYear]);

      const [inserted] = await pool.query(
        `SELECT * FROM attendance WHERE id = ?`, [result.insertId]
      );

      console.log(`✅ Checked IN: ${studentName} (${studentIdNumber})`);
      return { success: true, action: 'checked_in', data: { ...inserted[0], first_name: firstName, last_name: lastName } };

    } catch (error) {
      console.error("[AttendanceModel.tap] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Explicit check-in (kept for compatibility / direct API use)
   */
  async checkIn(attendanceData) {
    try {
      const { student_id_number } = attendanceData;

      const [studentRecords] = await pool.query(`
        SELECT 
          student_name,
          display_name,
          student_course,
          student_yr_level,
          student_school_year
        FROM students 
        WHERE student_id_number = ? AND is_active = 1
        LIMIT 1
      `, [student_id_number]);

      if (studentRecords.length === 0) {
        return { success: false, error: "Student ID not found in the system." };
      }

      const student = studentRecords[0];
      const studentName    = student.display_name || student.student_name;
      const studentCourse  = student.student_course    || '';
      const studentYrLevel = student.student_yr_level  || '';
      const schoolYear     = student.student_school_year || '';

      // Prevent double check-in
      const [existing] = await pool.query(`
        SELECT id FROM attendance 
        WHERE student_id_number = ? AND status = 'checked_in' AND is_deleted = 0
        LIMIT 1
      `, [student_id_number]);

      if (existing.length > 0) {
        return { success: false, error: "Student is already checked in." };
      }

      const [result] = await pool.query(`
        INSERT INTO attendance 
          (student_name, student_id_number, student_course, student_yr_level, school_year, check_in_time, status)
        VALUES (?, ?, ?, ?, ?, NOW(), 'checked_in')
      `, [studentName, student_id_number, studentCourse, studentYrLevel, schoolYear]);

      const [rows] = await pool.query(
        `SELECT * FROM attendance WHERE id = ?`, [result.insertId]
      );

      console.log(`✅ Checked IN: ${studentName} (${student_id_number})`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[AttendanceModel.checkIn] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Explicit check-out by student ID
   */
  async checkOut(studentIdNumber) {
    try {
      const [attendance] = await pool.query(`
        SELECT * FROM attendance 
        WHERE student_id_number = ? AND status = 'checked_in' AND is_deleted = 0
        ORDER BY check_in_time DESC
        LIMIT 1
      `, [studentIdNumber]);

      if (attendance.length === 0) {
        return { success: false, error: "Student is not currently checked in." };
      }

      const record = attendance[0];

      // Use MySQL TIMESTAMPDIFF to avoid JS↔MySQL timezone mismatch.
      await pool.query(`
        UPDATE attendance 
        SET check_out_time = NOW(),
            duration = GREATEST(0, TIMESTAMPDIFF(MINUTE, check_in_time, NOW())),
            status = 'checked_out'
        WHERE id = ?
      `, [record.id]);

      const [rows] = await pool.query(
        `SELECT * FROM attendance WHERE id = ?`, [record.id]
      );

      console.log(`✅ Checked OUT: ${rows[0].student_name} (${studentIdNumber}) — ${duration} min`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[AttendanceModel.checkOut] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Attendance statistics
   */
  async getStats() {
    try {
      const [total]     = await pool.query("SELECT COUNT(*) as count FROM attendance WHERE is_deleted = 0");
      const [active]    = await pool.query("SELECT COUNT(*) as count FROM attendance WHERE status = 'checked_in' AND is_deleted = 0");
      const [checkedOut]= await pool.query("SELECT COUNT(*) as count FROM attendance WHERE status = 'checked_out' AND is_deleted = 0");
      const [totalDur]  = await pool.query(`
        SELECT SUM(duration) as total FROM attendance 
        WHERE status = 'checked_out' AND duration IS NOT NULL AND is_deleted = 0
      `);

      return {
        success: true,
        data: {
          total:         total[0].count,
          active:        active[0].count,
          checkedOut:    checkedOut[0].count,
          totalDuration: totalDur[0].total || 0,
        },
      };
    } catch (error) {
      console.error("[AttendanceModel.getStats] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Soft-delete an attendance record
   */
  async delete(id) {
    try {
      const TrashModel = require("./Trash");
      const [attendance] = await pool.query(
        "SELECT * FROM attendance WHERE id = ? AND is_deleted = 0", [id]
      );
      if (attendance.length === 0) {
        return { success: false, error: "Attendance record not found" };
      }
      return TrashModel.softDelete("attendance", Number(id));
    } catch (error) {
      console.error("[AttendanceModel.delete] Error:", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = AttendanceModel;