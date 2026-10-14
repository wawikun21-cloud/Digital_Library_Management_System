// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  models/Attendance.js
//  Attendance Model
//
//  CONSOLIDATION: attendance records scope through the linked
//  student USER (students table retired). All student lookups
//  read `users WHERE student_id_number = ? AND role = 'student'`;
//  joins use `LEFT JOIN users st ... AND st.role = 'student'`.
//  Every read accepts an optional `scope` (from
//  features/organization) â€” null/unscoped means unrestricted
//  (super_admin and legacy users).
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const { pool } = require("../config/db");
const { studentScopeSql, canCheckInStudent } = require("../features/organization/attendanceAccess.service");

// Columns the attendance row snapshots at check-in time.
// users has no student_name column — full_name is aliased so the
// snapshot contract stays identical to the retired students table.
const STUDENT_SELECT = `
  student_id_number, full_name AS student_name, student_course,
  student_yr_level, student_school_year, school_id, department_id
`;

function scopeFragment(scope) {
  // The attendance model aliases the student-user join as `s`.
  const { sql, params } = studentScopeSql(scope, "s");
  return { sql, params };
}

const AttendanceModel = {

  /**
   * Get all attendance records â€” school-scoped via the student user link.
   */
  async getAll(scope = null) {
    try {
      const s = scopeFragment(scope);
      const [rows] = await pool.query(`
        SELECT a.*, s.full_name
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE a.is_deleted = 0 ${s.sql}
        ORDER BY a.check_in_time DESC
      `, s.params);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getAll] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getById(id, scope = null) {
    try {
      const s = scopeFragment(scope);
      const [rows] = await pool.query(`
        SELECT a.*, s.full_name
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE a.id = ? AND a.is_deleted = 0 ${s.sql}
        LIMIT 1
      `, [id, ...s.params]);
      if (rows.length === 0) {
        return { success: false, error: "Attendance record not found" };
      }
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[AttendanceModel.getById] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getByStudentId(studentIdNumber, scope = null) {
    try {
      const s = scopeFragment(scope);
      const [rows] = await pool.query(`
        SELECT a.*, s.full_name
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE a.student_id_number = ? AND a.is_deleted = 0 ${s.sql}
        ORDER BY a.check_in_time DESC
      `, [studentIdNumber, ...s.params]);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getByStudentId] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getSchoolYears(scope = null) {
    try {
      const s = scopeFragment(scope);
      const [rows] = await pool.query(
        `SELECT DISTINCT a.school_year
         FROM attendance a
         LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
         WHERE a.school_year IS NOT NULL AND a.school_year != '' ${s.sql}
         ORDER BY a.school_year DESC`,
        s.params
      );
      return { success: true, data: rows.map((r) => r.school_year) };
    } catch (error) {
      console.error("[AttendanceModel.getSchoolYears] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get students currently checked in (no check-out yet) â€” school-scoped.
   */
  async getActiveAttendance(scope = null) {
    try {
      const s = scopeFragment(scope);
      const [rows] = await pool.query(`
        SELECT
          a.id, a.student_id_number, a.student_name, a.check_in_time,
          a.student_course, a.student_yr_level, a.school_year, a.attendance_date,
          s.full_name
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE a.check_out_time IS NULL AND a.is_deleted = 0 ${s.sql}
        ORDER BY a.check_in_time DESC
      `, s.params);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getActiveAttendance] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Attendance-based ranking of students â€” school-scoped via the
   * same shared filter funnel as the rest of the feature.
   */
  async getTopStudents(limit = 5, scope = null, filters = {}) {
    try {
      const { whereSql, whereParams, orderSql } = buildAttendanceFilter(filters);
      const s = scopeFragment(scope);
      const [rows] = await pool.query(`
        SELECT
          a.student_id_number, a.student_name, a.student_course, a.student_yr_level,
          s.full_name AS display_name, NULL AS first_name, NULL AS last_name,
          COUNT(*) AS visit_count,
          SEC_TO_TIME(AVG(TIME_TO_SEC(TIMEDIFF(a.check_out_time, a.check_in_time)))) AS avg_duration
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE 1=1 ${whereSql} ${s.sql}
        GROUP BY a.student_id_number, a.student_name, a.student_course, a.student_yr_level,
                 s.full_name
         ORDER BY visit_count DESC
        LIMIT ${Number(limit) || 5}
      `, [...whereParams, ...s.params, ...orderSql.params]);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getTopStudents] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getAllTopStudents(limit = null, scope = null, filters = {}) {
    try {
      const { whereSql, whereParams } = buildAttendanceFilter(filters);
      const s = scopeFragment(scope);
      const lim = limit ? `LIMIT ${Number(limit)}` : "";
      const [rows] = await pool.query(`
        SELECT
          a.student_id_number, a.student_name, a.student_course, a.student_yr_level,
          s.full_name AS display_name, NULL AS first_name, NULL AS last_name,
          COUNT(*) AS visit_count,
          SEC_TO_TIME(AVG(TIME_TO_SEC(TIMEDIFF(a.check_out_time, a.check_in_time)))) AS avg_duration
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE 1=1 ${whereSql} ${s.sql}
        GROUP BY a.student_id_number, a.student_name, a.student_course, a.student_yr_level,
                 s.full_name
         ORDER BY visit_count DESC
        ${lim}
      `, [...whereParams, ...s.params]);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getAllTopStudents] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getProgramUsage(scope = null, filters = {}) {
    try {
      const { whereSql, whereParams } = buildAttendanceFilter(filters);
      const s = scopeFragment(scope);
      const [rows] = await pool.query(`
        SELECT
          a.student_course, a.student_yr_level, COUNT(*) AS count
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE 1=1 ${whereSql} ${s.sql}
        GROUP BY a.student_course, a.student_yr_level
        ORDER BY count DESC
      `, [...whereParams, ...s.params]);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getProgramUsage] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getVisitsOverTime(period = "daily", scope = null, filters = {}) {
    try {
      const { whereSql, whereParams } = buildAttendanceFilter(filters);
      const s = scopeFragment(scope);
      const [rows] = await pool.query(`
        SELECT
          DATE(a.attendance_date) AS visit_date,
          COUNT(DISTINCT a.student_id_number) AS visitor_count,
          COUNT(*) AS visit_count
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE 1=1 ${whereSql} ${s.sql}
        GROUP BY DATE(a.attendance_date)
        ORDER BY visit_date ASC
      `, [...whereParams, ...s.params]);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getVisitsOverTime] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getPeakHours(scope = null, filters = {}) {
    try {
      const { whereSql, whereParams } = buildAttendanceFilter(filters);
      const s = scopeFragment(scope);
      const [rows] = await pool.query(`
        SELECT HOUR(a.check_in_time) AS hour, COUNT(*) AS count
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE 1=1 ${whereSql} ${s.sql}
        GROUP BY HOUR(a.check_in_time)
        ORDER BY hour ASC
      `, [...whereParams, ...s.params]);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getPeakHours] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getVisitsByDay(scope = null, filters = {}) {
    try {
      const { whereSql, whereParams } = buildAttendanceFilter(filters);
      const s = scopeFragment(scope);
      const [rows] = await pool.query(`
        SELECT a.attendance_day_of_week AS day_name, COUNT(*) AS count
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE 1=1 ${whereSql} ${s.sql}
        GROUP BY a.attendance_day_of_week
        ORDER BY FIELD(a.attendance_day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
      `, [...whereParams, ...s.params]);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getVisitsByDay] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  // â”€â”€ Student-user lookup (attendance/kiosk) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /**
   * Look up a student user by student ID number. Returns the row
   * INCLUDING school_id / department_id so the caller can apply
   * the kiosk fail-closed rule before writing anything.
   */
  async getStudentByStudentIdNumber(studentIdNumber) {
    try {
      const [rows] = await pool.query(`
        SELECT ${STUDENT_SELECT}
        FROM users
        WHERE student_id_number = ? AND role = 'student' AND is_active = 1
        LIMIT 1
      `, [studentIdNumber]);
      if (rows.length === 0) {
        return { success: false, error: "Student not found" };
      }
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[AttendanceModel.getStudentByStudentIdNumber] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * RFID tap â€” looks up the student user, applies the kiosk
   * fail-closed school check, then records check-in/out.
   */
  async tap(studentIdNumber, scope = null) {
    try {
      const studentResult = await this.getStudentByStudentIdNumber(studentIdNumber);
      if (!studentResult.success) {
        return { success: false, error: "Student not found", notFound: true };
      }

      const student = studentResult.data;

      // Kiosk fail-closed: a scoped operator may only tap student
      // users of their own school.
      if (!canCheckInStudent(scope, student)) {
        return {
          success: false,
          error: "Student belongs to another school",
          outOfScope: true,
        };
      }

      const today = new Date().toISOString().split("T")[0];
      const [active] = await pool.query(
        `SELECT id FROM attendance
         WHERE student_id_number = ? AND attendance_date = ? AND check_out_time IS NULL AND is_deleted = 0
         LIMIT 1`,
        [studentIdNumber, today]
      );

      if (active.length > 0) {
        // Already checked in â†’ this tap is a check-out
        const checkOutTime = new Date();
        await pool.query(
          `UPDATE attendance
           SET check_out_time = ?, duration_minutes = TIMESTAMPDIFF(MINUTE, check_in_time, ?)
           WHERE id = ?`,
          [checkOutTime, checkOutTime, active[0].id]
        );

        const [rows] = await pool.query(
          "SELECT * FROM attendance WHERE id = ?",
          [active[0].id]
        );
        return {
          success: true,
          action: "check_out",
          student_id_number: student.student_id_number,
          student_name: student.student_name,
          data: rows[0],
        };
      }

      // Not checked in â†’ this tap is a check-in
      const checkInTime = new Date();
      const dayOfWeek = checkInTime.toLocaleDateString("en-US", { weekday: "long" });

      const [result] = await pool.query(
        `INSERT INTO attendance
         (student_id_number, student_name, student_course, student_yr_level,
          school_year, attendance_date, attendance_day_of_week, check_in_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Present')`,
        [
          student.student_id_number, student.student_name, student.student_course,
          student.student_yr_level, student.student_school_year, today, dayOfWeek, checkInTime,
        ]
      );

      const [rows] = await pool.query(
        "SELECT * FROM attendance WHERE id = ?",
        [result.insertId]
      );
      return {
        success: true,
        action: "check_in",
        student_id_number: student.student_id_number,
        student_name: student.student_name,
        data: rows[0],
      };
    } catch (error) {
      console.error("[AttendanceModel.tap] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async checkIn(studentIdNumber, scope = null) {
    try {
      const studentResult = await this.getStudentByStudentIdNumber(studentIdNumber);
      if (!studentResult.success) {
        return { success: false, error: "Student not found" };
      }
      const student = studentResult.data;

      if (!canCheckInStudent(scope, student)) {
        return { success: false, error: "Student belongs to another school" };
      }

      const [active] = await pool.query(
        `SELECT id FROM attendance
         WHERE student_id_number = ? AND check_out_time IS NULL AND is_deleted = 0
         LIMIT 1`,
        [studentIdNumber]
      );
      if (active.length > 0) {
        return { success: false, error: "Student is already checked in" };
      }

      const today = new Date().toISOString().split("T")[0];
      const checkInTime = new Date();

      const [result] = await pool.query(
        `INSERT INTO attendance
         (student_id_number, student_name, student_course, student_yr_level,
          school_year, attendance_date, attendance_day_of_week, check_in_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Present')`,
        [student.student_id_number, student.student_name, student.student_course,
         student.student_yr_level, student.student_school_year, today,
         checkInTime.toLocaleDateString("en-US", { weekday: "long" }), checkInTime]
      );

      const [rows] = await pool.query("SELECT * FROM attendance WHERE id = ?", [result.insertId]);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[AttendanceModel.checkIn] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async checkOut(studentIdNumber, scope = null) {
    try {
      const [rows] = await pool.query(
        `SELECT a.* FROM attendance a
         LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
         WHERE a.student_id_number = ? AND a.check_out_time IS NULL AND a.is_deleted = 0
         LIMIT 1`,
        [studentIdNumber]
      );
      if (rows.length === 0) {
        return { success: false, error: "Attendance record not found" };
      }

      if (rows[0].check_out_time) {
        return { success: false, error: "Student is already checked out" };
      }

      const checkOutTime = new Date();
      await pool.query(
        `UPDATE attendance SET check_out_time = ?,
         duration_minutes = TIMESTAMPDIFF(MINUTE, check_in_time, ?) WHERE id = ?`,
        [checkOutTime, checkOutTime, rows[0].id]
      );

      const [updated] = await pool.query("SELECT * FROM attendance WHERE id = ?", [rows[0].id]);
      return { success: true, data: updated[0] };
    } catch (error) {
      console.error("[AttendanceModel.checkOut] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async delete(id, scope = null) {
    try {
      const s = scopeFragment(scope);
      const [rows] = await pool.query(
        `SELECT a.* FROM attendance a
         LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
         WHERE a.id = ? ${s.sql} LIMIT 1`,
        [id, ...s.params]
      );
      if (rows.length === 0) {
        return { success: false, error: "Attendance record not found" };
      }
      const TrashModel = require("./Trash");
      return TrashModel.softDelete("attendance", Number(id), null, rows[0].school_id ?? null);
    } catch (error) {
      console.error("[AttendanceModel.delete] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  // â”€â”€ Analytics (all school-scoped) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getDashboardStats(scope = null) {
    try {
      const s = scopeFragment(scope);
      const [totalVisits] = await pool.query(
        `SELECT COUNT(*) AS count FROM attendance a
         LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
         WHERE a.is_deleted = 0 ${s.sql}`,
        s.params
      );
      const [todayCount] = await pool.query(
        `SELECT COUNT(*) AS count FROM attendance a
         LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
         WHERE a.is_deleted = 0 AND a.attendance_date = CURDATE() ${s.sql}`,
        s.params
      );
      const [avgDuration] = await pool.query(
        `SELECT AVG(a.duration_minutes) AS avg_minutes FROM attendance a
         LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
         WHERE a.is_deleted = 0 ${s.sql}`,
        s.params
      );
      const [uniqueStudents] = await pool.query(
        `SELECT COUNT(DISTINCT a.student_id_number) AS count FROM attendance a
         LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
         WHERE a.is_deleted = 0 ${s.sql}`,
        s.params
      );

      return {
        success: true,
        data: {
          totalVisits: totalVisits[0].count,
          todayCount: todayCount[0].count,
          avgDuration: Math.round(avgDuration[0].avg_minutes || 0),
          uniqueStudents: uniqueStudents[0].count,
        },
      };
    } catch (error) {
      console.error("[AttendanceModel.getDashboardStats] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getStats(scope = null, filters = {}) {
    try {
      const { whereSql, whereParams } = buildAttendanceFilter(filters);
      const s = scopeFragment(scope);
      const [total] = await pool.query(
        `SELECT COUNT(*) AS count FROM attendance a
         LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
         WHERE 1=1 ${whereSql} ${s.sql}`,
        [...whereParams, ...s.params]
      );
      const [today] = await pool.query(
        `SELECT COUNT(*) AS count FROM attendance a
         LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
         WHERE a.is_deleted = 0 AND a.attendance_date = CURDATE() ${whereSql} ${s.sql}`,
        [...whereParams, ...s.params]
      );
      const [checkedIn] = await pool.query(
        `SELECT COUNT(*) AS count FROM attendance a
         LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
         WHERE a.check_out_time IS NULL AND a.is_deleted = 0 ${whereSql} ${s.sql}`,
        [...whereParams, ...s.params]
      );
      const [avgDuration] = await pool.query(
        `SELECT AVG(a.duration_minutes) AS avg_minutes FROM attendance a
         LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
         WHERE a.is_deleted = 0 ${whereSql} ${s.sql}`,
        [...whereParams, ...s.params]
      );

      return {
        success: true,
        data: {
          total: total[0].count,
          today: today[0].count,
          checkedIn: checkedIn[0].count,
          avgDuration: Math.round(avgDuration[0].avg_minutes || 0),
        },
      };
    } catch (error) {
      console.error("[AttendanceModel.getStats] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  // â”€â”€ Low-usage analysis (attendance + student users) â”€â”€â”€â”€â”€â”€

  async getLowUsageStudents(scope = null, filters = {}) {
    try {
      const { whereSql, whereParams } = buildAttendanceFilter(filters);
      const s = scopeFragment(scope);
      const [rows] = await pool.query(`
        SELECT
          a.student_id_number, a.student_name, a.student_course, a.student_yr_level,
          s.full_name AS display_name, NULL AS first_name, NULL AS last_name,
          COUNT(*) AS visit_count,
          MAX(a.attendance_date) AS last_visit_date,
          DATEDIFF(CURDATE(), MAX(a.attendance_date)) AS days_since_last_visit
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE 1=1 ${whereSql} ${s.sql}
        GROUP BY a.student_id_number, a.student_name, a.student_course, a.student_yr_level,
                 s.full_name
        HAVING days_since_last_visit >= 30 OR visit_count <= 2
        ORDER BY last_visit_date ASC
      `, [...whereParams, ...s.params]);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[AttendanceModel.getLowUsageStudents] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Low-usage across ALL student users (includes zero-visit students
   * who have never attended). Both halves are school-scoped.
   */
  async getAllLowUsageStudents(scope = null, filters = {}) {
    try {
      const s = scopeFragment(scope);
      const { whereSql, whereParams } = buildAttendanceFilter(filters);

      const [attendanceRows] = await pool.query(`
        SELECT
          a.student_id_number, a.student_name, a.student_course, a.student_yr_level,
          s.full_name AS display_name, NULL AS first_name, NULL AS last_name,
          COUNT(*) AS visit_count,
          MAX(a.attendance_date) AS last_visit_date,
          DATEDIFF(CURDATE(), MAX(a.attendance_date)) AS days_since_last_visit
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE 1=1 ${whereSql} ${s.sql}
        GROUP BY a.student_id_number, a.student_name, a.student_course, a.student_yr_level,
                 s.full_name
      `, [...whereParams, ...s.params]);

      // Zero-visit student users (in scope).
      const studentConditions = ["u.role = 'student'", "u.is_active = 1"];
      const studentParams = [];
      if (scope && scope.scoped && scope.schoolId != null) {
        studentConditions.push("u.school_id = ?");
        studentParams.push(scope.schoolId);
      }
      const [zeroVisitRows] = await pool.query(`
        SELECT
          u.student_id_number, u.full_name AS student_name,
          u.student_course, u.student_yr_level,
          NULL AS display_name, NULL AS first_name, NULL AS last_name,
          0 AS visit_count,
          NULL AS last_visit_date,
          NULL AS days_since_last_visit
        FROM users u
        WHERE ${studentConditions.join(" AND ")}
          AND NOT EXISTS (
            SELECT 1 FROM attendance a WHERE a.student_id_number = u.student_id_number AND a.is_deleted = 0
          )
      `, studentParams);

      const combined = [...attendanceRows, ...zeroVisitRows];
      // Low-usage definition: 30+ days since last visit, <= 2 visits,
      // or never visited at all.
      const filtered = combined.filter(
        (r) => r.visit_count === 0
          || r.days_since_last_visit === null || r.days_since_last_visit === undefined
          || r.days_since_last_visit >= 30
          || r.visit_count <= 2
      );
      filtered.sort((a, b) => (a.last_visit_date || "0000-00-00").localeCompare(b.last_visit_date || "0000-00-00"));

      return { success: true, data: filtered };
    } catch (error) {
      console.error("[AttendanceModel.getAllLowUsageStudents] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getSessionDistribution(scope = null, filters = {}) {
    try {
      const { whereSql, whereParams } = buildAttendanceFilter(filters);
      const s = scopeFragment(scope);
      const [rows] = await pool.query(`
        SELECT
          CASE
            WHEN a.duration_minutes IS NULL THEN 'Still Active'
            WHEN a.duration_minutes <= 60 THEN '0-60 min'
            WHEN a.duration_minutes <= 120 THEN '1-2 hours'
            WHEN a.duration_minutes <= 180 THEN '2-3 hours'
            WHEN a.duration_minutes <= 300 THEN '3-5 hours'
            ELSE '5+ hours'
          END AS session_range,
          COUNT(*) AS count
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE 1=1 ${whereSql} ${s.sql}
        GROUP BY session_range
        ORDER BY count DESC
      `, [...whereParams, ...s.params]);
      const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
      return { success: true, data: rows.map((r) => ({ ...r, total })) };
    } catch (error) {
      console.error("[AttendanceModel.getSessionDistribution] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  async getOtherInsights(scope = null, filters = {}) {
    try {
      const { whereSql, whereParams } = buildAttendanceFilter(filters);
      const s = scopeFragment(scope);

      const [busiestDay] = await pool.query(`
        SELECT a.attendance_day_of_week AS day_name, COUNT(*) AS count
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE 1=1 ${whereSql} ${s.sql}
        GROUP BY a.attendance_day_of_week
        ORDER BY count DESC LIMIT 1
      `, [...whereParams, ...s.params]);

      const [busiestHour] = await pool.query(`
        SELECT HOUR(a.check_in_time) AS hour, COUNT(*) AS count
        FROM attendance a
        LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
        WHERE 1=1 ${whereSql} ${s.sql}
        GROUP BY HOUR(a.check_in_time)
        ORDER BY count DESC LIMIT 1
      `, [...whereParams, ...s.params]);

      // Freshmen count now comes from student USERS (students table retired).
      const studentConditions = ["u.role = 'student'", "u.is_active = 1", "(u.student_yr_level = '1st Year' OR u.student_yr_level = 'Grade 11' OR u.student_yr_level = 'Grade 12')"];
      const studentParams = [];
      if (scope && scope.scoped && scope.schoolId != null) {
        studentConditions.push("u.school_id = ?");
        studentParams.push(scope.schoolId);
      }
      const [totalFreshmen] = await pool.query(
        `SELECT COUNT(*) AS count FROM users u WHERE ${studentConditions.join(" AND ")}`,
        studentParams
      );

      const [repeatVisitors] = await pool.query(`
        SELECT COUNT(*) AS count FROM (
          SELECT a.student_id_number, COUNT(*) AS visits
          FROM attendance a
          LEFT JOIN users s ON s.student_id_number = a.student_id_number AND s.role = 'student'
          WHERE 1=1 ${whereSql} ${s.sql}
          GROUP BY a.student_id_number
          HAVING visits > 1
        ) AS repeated
      `, [...whereParams, ...s.params]);

      return {
        success: true,
        data: {
          busiestDay:  busiestDay[0]?.day_name || "â€”",
          busiestHour: busiestHour[0]?.hour ?? null,
          totalFreshmen: totalFreshmen[0].count,
          repeatVisitors: repeatVisitors[0].count,
        },
      };
    } catch (error) {
      console.error("[AttendanceModel.getOtherInsights] Error:", error.message);
      return { success: false, error: error.message };
    }
  },
};

/**
 * Shared filter funnel for attendance analytics â€” the same WHERE
 * builder every dashboard query passes through, so school scoping
 * composes with date/program/year filters everywhere.
 */
function buildAttendanceFilter(filters = {}) {
  const { program, yrLevel, schoolYear, dateFrom, dateTo } = filters;
  const conditions = ["a.is_deleted = 0"];
  const params = [];

  if (program && program !== "All") {
    conditions.push("a.student_course = ?");
    params.push(program);
  }
  if (yrLevel && yrLevel !== "All") {
    conditions.push("a.student_yr_level = ?");
    params.push(yrLevel);
  }
  if (schoolYear && schoolYear !== "All") {
    conditions.push("a.school_year = ?");
    params.push(schoolYear);
  }
  if (dateFrom) {
    conditions.push("a.attendance_date >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push("a.attendance_date <= ?");
    params.push(dateTo);
  }

  return { whereSql: `AND ${conditions.join(" AND ")}`, whereParams: params, orderSql: { params: [] } };
}

module.exports = AttendanceModel;
module.exports.buildAttendanceFilter = buildAttendanceFilter;
