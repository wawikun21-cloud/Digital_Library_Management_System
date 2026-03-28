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
        SELECT * FROM attendance 
        ORDER BY check_in_time DESC
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
        SELECT * FROM attendance WHERE id = ?
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
        SELECT * FROM attendance 
        WHERE status = 'checked_in'
        ORDER BY check_in_time DESC
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
        WHERE student_id_number = ?
        ORDER BY check_in_time DESC
      `, [studentIdNumber]);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getByStudentId] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check in a student
   */
  async checkIn(attendanceData) {
    try {
      const {
        student_id_number,
        student_name = '',
        student_course = '',
        student_yr_level = ''
      } = attendanceData;

      // Check if student is already checked in
      const [existing] = await pool.query(`
        SELECT * FROM attendance 
        WHERE student_id_number = ? AND status = 'checked_in'
      `, [student_id_number]);

      if (existing.length > 0) {
        return { success: false, error: "Student is already checked in" };
      }

      // Validate that student exists in students table
      const [studentRecords] = await pool.query(`
        SELECT student_name, student_course, student_yr_level FROM students 
        WHERE student_id_number = ? AND is_active = true
      `, [student_id_number]);

      if (studentRecords.length === 0) {
        return { success: false, error: "Student does not exist" };
      }

      // Use student information from students table
      let studentName = student_name || studentRecords[0].student_name;
      let studentCourse = student_course || studentRecords[0].student_course || '';
      let studentYrLevel = student_yr_level || studentRecords[0].student_yr_level || '';

      const [result] = await pool.query(
        `INSERT INTO attendance (student_name, student_id_number, student_course, student_yr_level, check_in_time, status)
         VALUES (?, ?, ?, ?, NOW(), 'checked_in')`,
        [studentName, student_id_number, studentCourse, studentYrLevel]
      );

      const [rows] = await pool.query(`
        SELECT * FROM attendance WHERE id = ?
      `, [result.insertId]);

      console.log(`✅ Student checked in: ${studentName} (${student_id_number})`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[AttendanceModel.checkIn] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check out a student
   */
  async checkOut(studentIdNumber) {
    try {
      // Find active attendance record
      const [attendance] = await pool.query(`
        SELECT * FROM attendance 
        WHERE student_id_number = ? AND status = 'checked_in'
      `, [studentIdNumber]);

      if (attendance.length === 0) {
        return { success: false, error: "Student is not checked in" };
      }

      const checkOutTime = new Date();
      const checkInTime = new Date(attendance[0].check_in_time);
      const duration = Math.floor((checkOutTime - checkInTime) / 1000 / 60); // in minutes

      await pool.query(
        `UPDATE attendance 
         SET check_out_time = ?, duration = ?, status = 'checked_out' 
         WHERE id = ?`,
        [checkOutTime, duration, attendance[0].id]
      );

      const [rows] = await pool.query(`
        SELECT * FROM attendance WHERE id = ?
      `, [attendance[0].id]);

      console.log(`✅ Student checked out: ${rows[0].student_name} (${studentIdNumber})`);
      console.log(`⏱️ Duration: ${duration} minutes`);
      
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[AttendanceModel.checkOut] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get attendance statistics
   */
  async getStats() {
    try {
      const [total] = await pool.query("SELECT COUNT(*) as count FROM attendance");
      const [active] = await pool.query("SELECT COUNT(*) as count FROM attendance WHERE status = 'checked_in'");
      const [checkedOut] = await pool.query("SELECT COUNT(*) as count FROM attendance WHERE status = 'checked_out'");
      
      const [totalDuration] = await pool.query(`
        SELECT SUM(duration) as total FROM attendance 
        WHERE status = 'checked_out' AND duration IS NOT NULL
      `);

      return { 
        success: true, 
        data: {
          total: total[0].count,
          active: active[0].count,
          checkedOut: checkedOut[0].count,
          totalDuration: totalDuration[0].total || 0
        }
      };
    } catch (error) {
      console.error("[AttendanceModel.getStats] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete an attendance record
   */
  async delete(id) {
    try {
      const [attendance] = await pool.query("SELECT * FROM attendance WHERE id = ?", [id]);
      if (attendance.length === 0) {
        return { success: false, error: "Attendance record not found" };
      }

      await pool.query("DELETE FROM attendance WHERE id = ?", [id]);
      
      console.log(`✅ Attendance record deleted: ID ${id}`);
      return { success: true, data: attendance[0] };
    } catch (error) {
      console.error("[AttendanceModel.delete] Error:", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = AttendanceModel;
