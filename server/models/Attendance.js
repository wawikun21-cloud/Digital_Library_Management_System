// ─────────────────────────────────────────────────────────
//  models/Attendance.js
//  Attendance Model - MySQL CRUD Operations
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

/**
 * Shared filter builder for attendance queries.
 * Accepts: { program, yrLevel, dateFrom, dateTo, schoolYear }
 * Returns: { clauses: string[], params: any[] }
 * All clauses are combined with AND by the caller.
 */
function buildAttendanceFilter(filters = {}) {
  const clauses = ["is_deleted = 0"];
  const params  = [];

  if (filters.program && filters.program !== "All") {
    clauses.push("student_course = ?");
    params.push(filters.program);
  }
  if (filters.yrLevel && filters.yrLevel !== "All") {
    clauses.push("student_yr_level = ?");
    params.push(filters.yrLevel);
  }
  if (filters.schoolYear && filters.schoolYear !== "All") {
    clauses.push("school_year = ?");
    params.push(filters.schoolYear);
  }
  if (filters.dateFrom) {
    clauses.push("DATE(check_in_time) >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    clauses.push("DATE(check_in_time) <= ?");
    params.push(filters.dateTo);
  }

  return { clauses, params };
}

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

      console.log(`✅ Checked OUT: ${rows[0].student_name} (${studentIdNumber}) — ${rows[0].duration ?? 0} min`);
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
   * Top 50 students by total hours logged (completed sessions)
   * Returns: rank, student_name, student_course, visits, totalMinutes, avgMinutes
   */
  async getTopStudents(filters = {}) {
    try {
      const { clauses, params } = buildAttendanceFilter(filters);
      const where = `WHERE ${clauses.join(" AND ")} AND a.status = 'checked_out' AND a.duration IS NOT NULL`;

      const [rows] = await pool.query(`
        SELECT
          a.student_id_number,
          a.student_name,
          a.student_course,
          COUNT(*)                          AS visits,
          COALESCE(SUM(a.duration), 0)      AS totalMinutes,
          COALESCE(AVG(a.duration), 0)      AS avgMinutes
        FROM attendance a
        ${where}
        GROUP BY a.student_id_number, a.student_name, a.student_course
        ORDER BY totalMinutes DESC
        LIMIT 50
      `, params);

      const data = rows.map((r, i) => {
        const totalH = Math.floor(r.totalMinutes / 60);
        const totalM = r.totalMinutes % 60;
        const avgMin = Math.round(r.avgMinutes);
        const avgH   = Math.floor(avgMin / 60);
        const avgMm  = avgMin % 60;
        return {
          rank:    i + 1,
          name:    r.student_name,
          program: r.student_course || "—",
          visits:  Number(r.visits),
          hours:   totalH > 0 ? `${totalH}h ${totalM}m` : `${totalM}m`,
          avg:     avgH   > 0 ? `${avgH}h ${avgMm}m`   : `${avgMm}m`,
        };
      });

      return { success: true, data };
    } catch (error) {
      console.error("[AttendanceModel.getTopStudents] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * All students ranked by total hours — no LIMIT, includes yrLevel + semester for modal filtering
   */
  async getAllTopStudents() {
    try {
      const [rows] = await pool.query(`
        SELECT
          a.student_id_number,
          a.student_name,
          a.student_course,
          a.student_yr_level,
          a.school_year,
          COUNT(*)                          AS visits,
          COALESCE(SUM(a.duration), 0)      AS totalMinutes,
          COALESCE(AVG(a.duration), 0)      AS avgMinutes
        FROM attendance a
        WHERE a.status = 'checked_out'
          AND a.duration IS NOT NULL
          AND a.is_deleted = 0
        GROUP BY a.student_id_number, a.student_name, a.student_course, a.student_yr_level, a.school_year
        ORDER BY totalMinutes DESC
      `);

      const data = rows.map((r, i) => {
        const totalH = Math.floor(r.totalMinutes / 60);
        const totalM = r.totalMinutes % 60;
        const avgMin = Math.round(r.avgMinutes);
        const avgH   = Math.floor(avgMin / 60);
        const avgMm  = avgMin % 60;
        return {
          rank:     i + 1,
          name:     r.student_name,
          program:  r.student_course  || "—",
          yrLevel:  r.student_yr_level || "—",
          semester: r.school_year      || "—",
          visits:   Number(r.visits),
          hours:    totalH > 0 ? `${totalH}h ${totalM}m` : `${totalM}m`,
          avg:      avgH   > 0 ? `${avgH}h ${avgMm}m`   : `${avgMm}m`,
          totalMinutes: Number(r.totalMinutes),
        };
      });

      return { success: true, data };
    } catch (error) {
      console.error("[AttendanceModel.getAllTopStudents] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Library usage grouped by program (student_course)
   * Returns per-program: visits count, totalMinutes, avgMinutesPerStudent
   */
  async getProgramUsage(filters = {}) {
    try {
      const { clauses, params } = buildAttendanceFilter(filters);
      const where = `WHERE ${clauses.join(" AND ")}`;

      const [rows] = await pool.query(`
        SELECT
          COALESCE(NULLIF(TRIM(a.student_course), ''), 'Others') AS program,
          COUNT(*)                                                AS visits,
          COALESCE(SUM(a.duration), 0)                           AS totalMinutes,
          COUNT(DISTINCT a.student_id_number)                    AS uniqueStudents
        FROM attendance a
        ${where}
        GROUP BY program
        ORDER BY visits DESC
      `, params);

      const data = rows.map(r => ({
        program:        r.program,
        visits:         Number(r.visits),
        totalMinutes:   Number(r.totalMinutes),
        totalHours:     Math.round(r.totalMinutes / 60),
        avgMinPerStudent: r.uniqueStudents > 0
          ? Math.round(r.totalMinutes / r.uniqueStudents)
          : 0,
      }));

      return { success: true, data };
    } catch (error) {
      console.error("[AttendanceModel.getProgramUsage] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Visits Over Time — grouped by day, week, or month depending on `groupBy`
   * groupBy: "Daily" | "Weekly" | "Monthly"
   * Returns: [{ date, visits }]
   */
  async getVisitsOverTime(groupBy = "Daily", filters = {}) {
    try {
      const { clauses, params } = buildAttendanceFilter(filters);
      const where = `WHERE ${clauses.join(" AND ")}`;

      let selectExpr, groupExpr, orderExpr;
      if (groupBy === "Weekly") {
        selectExpr = `DATE(DATE_SUB(check_in_time, INTERVAL WEEKDAY(check_in_time) DAY)) AS date`;
        groupExpr  = `DATE(DATE_SUB(check_in_time, INTERVAL WEEKDAY(check_in_time) DAY))`;
        orderExpr  = `date ASC`;
      } else if (groupBy === "Monthly") {
        selectExpr = `DATE_FORMAT(check_in_time, '%b %Y') AS date, YEAR(check_in_time) AS yr, MONTH(check_in_time) AS mo`;
        groupExpr  = `yr, mo`;
        orderExpr  = `yr ASC, mo ASC`;
      } else {
        selectExpr = `DATE(check_in_time) AS date`;
        groupExpr  = `DATE(check_in_time)`;
        orderExpr  = `date ASC`;
      }

      const [rows] = await pool.query(`
        SELECT ${selectExpr}, COUNT(*) AS visits
        FROM attendance
        ${where}
        GROUP BY ${groupExpr}
        ORDER BY ${orderExpr}
        LIMIT 90
      `, params);

      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const data = rows.map(r => {
        let label = r.date;
        if (groupBy === "Daily" || groupBy === "Weekly") {
          const d = new Date(r.date);
          label = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
        }
        return { date: label, visits: Number(r.visits) };
      });

      return { success: true, data };
    } catch (error) {
      console.error("[AttendanceModel.getVisitsOverTime] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Peak Hours — check-in count grouped by hour of day (all-time)
   * Returns: [{ hour: "8AM", avg: 210 }]
   */
  async getPeakHours(filters = {}) {
    try {
      const { clauses, params } = buildAttendanceFilter(filters);
      const where = `WHERE ${clauses.join(" AND ")}`;

      const [rows] = await pool.query(`
        SELECT HOUR(check_in_time) AS hr, COUNT(*) AS cnt
        FROM attendance
        ${where}
        GROUP BY hr
        ORDER BY hr ASC
      `, params);

      const fmt = h => {
        const period = h < 12 ? "AM" : "PM";
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${h12}${period}`;
      };

      const data = rows.map(r => ({
        hour: fmt(Number(r.hr)),
        avg:  Number(r.cnt),
      }));

      return { success: true, data };
    } catch (error) {
      console.error("[AttendanceModel.getPeakHours] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Visits by Day of Week — total check-ins per weekday (all-time)
   * Returns: [{ day: "Mon", visits: 820 }]
   */
  async getVisitsByDay(filters = {}) {
    try {
      const { clauses, params } = buildAttendanceFilter(filters);
      const where = `WHERE ${clauses.join(" AND ")}`;

      const [rows] = await pool.query(`
        SELECT DAYOFWEEK(check_in_time) AS dow, COUNT(*) AS visits
        FROM attendance
        ${where}
        GROUP BY dow
        ORDER BY dow ASC
      `, params);

      // MySQL DAYOFWEEK: 1=Sun, 2=Mon ... 7=Sat
      const DAY_LABELS = { 1: "Sun", 2: "Mon", 3: "Tue", 4: "Wed", 5: "Thu", 6: "Fri", 7: "Sat" };
      const DAY_ORDER  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      const byDow = Object.fromEntries(
        rows.map(r => [DAY_LABELS[r.dow], Number(r.visits)])
      );

      const data = DAY_ORDER.map(day => ({
        day,
        visits: byDow[day] ?? 0,
      }));

      return { success: true, data };
    } catch (error) {
      console.error("[AttendanceModel.getVisitsByDay] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * All low/no-usage students — no LIMIT, for the modal.
   * Returns full list with program, yr_level, school_year for client-side filtering.
   */
  async getAllLowUsageStudents() {
    try {
      const [rows] = await pool.query(`
        SELECT
          s.student_name                                               AS name,
          COALESCE(NULLIF(TRIM(s.student_course), ''), '—')           AS program,
          COALESCE(NULLIF(TRIM(s.student_yr_level), ''), '—')         AS yrLevel,
          COALESCE(NULLIF(TRIM(s.student_school_year), ''), '—')      AS semester,
          COUNT(a.id)                                                  AS visits,
          COALESCE(SUM(a.duration), 0)                                AS totalMinutes,
          MAX(DATE(a.check_in_time))                                  AS lastVisit
        FROM students s
        LEFT JOIN attendance a
          ON a.student_id_number = s.student_id_number
          AND a.is_deleted = 0
        WHERE s.is_active = 1
          AND s.deleted_at IS NULL
        GROUP BY s.student_id_number, s.student_name, s.student_course, s.student_yr_level, s.student_school_year
        HAVING COUNT(a.id) <= 1
        ORDER BY COUNT(a.id) ASC, lastVisit ASC
      `);

      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const data = rows.map(r => {
        const h = Math.floor(r.totalMinutes / 60);
        const m = r.totalMinutes % 60;
        let last = "—";
        if (r.lastVisit) {
          const d = new Date(r.lastVisit);
          last = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
        }
        return {
          name:     r.name,
          program:  r.program,
          yrLevel:  r.yrLevel,
          semester: r.semester,
          visits:   Number(r.visits),
          hours:    `${h}h ${m}m`,
          last,
        };
      });

      return { success: true, data };
    } catch (error) {
      console.error("[AttendanceModel.getAllLowUsageStudents] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Low / No Usage Students — active students with 0 or 1 visits (all-time)
   * Returns: [{ name, program, visits, hours, last }]
   */
  async getLowUsageStudents(filters = {}) {
    try {
      const aParams = [];
      const aClauses = ["a.is_deleted = 0"];
      if (filters.dateFrom) { aClauses.push("DATE(a.check_in_time) >= ?"); aParams.push(filters.dateFrom); }
      if (filters.dateTo)   { aClauses.push("DATE(a.check_in_time) <= ?"); aParams.push(filters.dateTo); }

      const sParams = [];
      const sClauses = ["s.is_active = 1", "s.deleted_at IS NULL"];
      if (filters.program  && filters.program  !== "All") { sClauses.push("s.student_course = ?");    sParams.push(filters.program); }
      if (filters.yrLevel  && filters.yrLevel  !== "All") { sClauses.push("s.student_yr_level = ?");  sParams.push(filters.yrLevel); }
      if (filters.schoolYear && filters.schoolYear !== "All") { sClauses.push("s.student_school_year = ?"); sParams.push(filters.schoolYear); }

      const [rows] = await pool.query(`
        SELECT
          s.student_name                                          AS name,
          COALESCE(NULLIF(TRIM(s.student_course), ''), '—')      AS program,
          COUNT(a.id)                                             AS visits,
          COALESCE(SUM(a.duration), 0)                           AS totalMinutes,
          MAX(DATE(a.check_in_time))                             AS lastVisit
        FROM students s
        LEFT JOIN attendance a
          ON a.student_id_number = s.student_id_number
          AND ${aClauses.join(" AND ")}
        WHERE ${sClauses.join(" AND ")}
        GROUP BY s.student_id_number, s.student_name, s.student_course
        HAVING COUNT(a.id) <= 1
        ORDER BY COUNT(a.id) ASC, lastVisit ASC
        LIMIT 20
      `, [...aParams, ...sParams]);

      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const data = rows.map(r => {
        const h = Math.floor(r.totalMinutes / 60);
        const m = r.totalMinutes % 60;
        let last = "—";
        if (r.lastVisit) {
          const d = new Date(r.lastVisit);
          last = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
        }
        return {
          name:    r.name,
          program: r.program,
          visits:  Number(r.visits),
          hours:   `${h}h ${m}m`,
          last,
        };
      });

      return { success: true, data };
    } catch (error) {
      console.error("[AttendanceModel.getLowUsageStudents] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Session Duration Distribution — buckets of completed session durations
   * Returns: [{ label, pct, count, color }]  (colors assigned server-side for consistency)
   */
  async getSessionDistribution(filters = {}) {
    try {
      const { clauses, params } = buildAttendanceFilter(filters);
      const where = `WHERE ${clauses.join(" AND ")} AND status = 'checked_out' AND duration IS NOT NULL`;

      const [rows] = await pool.query(`
        SELECT
          SUM(CASE WHEN duration BETWEEN 0  AND 30  THEN 1 ELSE 0 END) AS b0_30,
          SUM(CASE WHEN duration BETWEEN 31 AND 60  THEN 1 ELSE 0 END) AS b31_60,
          SUM(CASE WHEN duration BETWEEN 61 AND 120 THEN 1 ELSE 0 END) AS b61_120,
          SUM(CASE WHEN duration BETWEEN 121 AND 180 THEN 1 ELSE 0 END) AS b121_180,
          SUM(CASE WHEN duration > 180               THEN 1 ELSE 0 END) AS b180plus,
          COUNT(*)                                                        AS total
        FROM attendance
        ${where}
      `, params);

      const r     = rows[0];
      const total = Number(r.total) || 1; // avoid div/0
      const buckets = [
        { label: "0 – 30 mins",  count: Number(r.b0_30),   color: "#6366f1" },
        { label: "31 – 60 mins", count: Number(r.b31_60),  color: "#32667F" },
        { label: "1 – 2 hours",  count: Number(r.b61_120), color: "#2dd4bf" },
        { label: "2 – 3 hours",  count: Number(r.b121_180),color: "#EEA23A" },
        { label: "3+ hours",     count: Number(r.b180plus), color: "#f43f5e" },
      ];

      const data = buckets.map(b => ({
        ...b,
        pct: Number(((b.count / total) * 100).toFixed(1)),
      }));

      return { success: true, data, totalVisits: Number(r.total) };
    } catch (error) {
      console.error("[AttendanceModel.getSessionDistribution] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Other Insights:
   *  - Longest session today
   *  - Busiest day of week (all-time)
   *  - Most consistent user (most distinct days visited)
   *  - Unique 1st-year students this month (freshmen of current semester)
   */
  async getOtherInsights(filters = {}) {
    try {
      const { clauses, params } = buildAttendanceFilter(filters);
      const where    = `WHERE ${clauses.join(" AND ")}`;
      const andExtra = `AND ${clauses.join(" AND ")}`;

      // 1. Longest session today (respects program/yrLevel/date filters)
      const [longestRows] = await pool.query(`
        SELECT student_name, student_course, duration
        FROM attendance
        ${where}
          AND DATE(check_in_time) = CURDATE()
          AND status = 'checked_out'
          AND duration IS NOT NULL
        ORDER BY duration DESC
        LIMIT 1
      `, params);

      let longestSession = "—";
      let longestSub     = "No completed sessions today";
      if (longestRows.length > 0) {
        const d = longestRows[0];
        const h = Math.floor(d.duration / 60);
        const m = d.duration % 60;
        longestSession = h > 0 ? `${h}h ${m}m` : `${m}m`;
        longestSub     = `${d.student_name}${d.student_course ? ` (${d.student_course})` : ""}`;
      }

      // 2. Busiest day of week
      const [busiestRows] = await pool.query(`
        SELECT DAYOFWEEK(check_in_time) AS dow, COUNT(*) AS cnt
        FROM attendance
        ${where}
        GROUP BY dow
        ORDER BY cnt DESC
        LIMIT 1
      `, params);
      const DAY_NAMES = { 1:"Sunday",2:"Monday",3:"Tuesday",4:"Wednesday",5:"Thursday",6:"Friday",7:"Saturday" };
      let busiestDay = "—";
      let busiestSub = "No data";
      if (busiestRows.length > 0) {
        busiestDay = DAY_NAMES[busiestRows[0].dow] || "—";
        busiestSub = `${Number(busiestRows[0].cnt).toLocaleString()} visits`;
      }

      // 3. Most consistent user
      const [consistentRows] = await pool.query(`
        SELECT
          student_name,
          student_course,
          COUNT(DISTINCT DATE(check_in_time)) AS distinct_days,
          (SELECT COUNT(DISTINCT DATE(check_in_time))
           FROM attendance
           ${where}) AS total_days
        FROM attendance
        ${where}
        GROUP BY student_id_number, student_name, student_course
        ORDER BY distinct_days DESC
        LIMIT 1
      `, [...params, ...params]);
      let consistentUser = "—";
      let consistentSub  = "No data";
      if (consistentRows.length > 0) {
        const c = consistentRows[0];
        consistentUser = `${c.student_name}${c.student_course ? ` (${c.student_course})` : ""}`;
        consistentSub  = `Visited ${c.distinct_days} of ${c.total_days} days`;
      }

      // 4. Unique 1st-year students this month
      const [freshmenRows] = await pool.query(`
        SELECT COUNT(DISTINCT a.student_id_number) AS cnt
        FROM attendance a
        INNER JOIN students s ON s.student_id_number = a.student_id_number
        ${where}
          AND MONTH(a.check_in_time) = MONTH(CURDATE())
          AND YEAR(a.check_in_time)  = YEAR(CURDATE())
          AND (
            LOWER(TRIM(a.student_yr_level))  LIKE '%1st%'
            OR LOWER(TRIM(s.student_yr_level)) LIKE '%1st%'
            OR LOWER(TRIM(a.student_yr_level))  LIKE '%first%'
            OR LOWER(TRIM(s.student_yr_level)) LIKE '%first%'
          )
      `, params);

      const [totalFreshmen] = await pool.query(`
        SELECT COUNT(*) AS cnt
        FROM students
        WHERE is_active = 1
          AND (
            LOWER(TRIM(student_yr_level)) LIKE '%1st%'
            OR LOWER(TRIM(student_yr_level)) LIKE '%first%'
          )
      `);

      const freshmenCount = Number(freshmenRows[0]?.cnt ?? 0);
      const freshmenTotal = Number(totalFreshmen[0]?.cnt ?? 0);
      const freshmenPct   = freshmenTotal > 0
        ? `${Math.round((freshmenCount / freshmenTotal) * 100)}% of 1st-year enrollment`
        : "1st-year students";

      return {
        success: true,
        data: {
          longestSession, longestSub,
          busiestDay,     busiestSub,
          consistentUser, consistentSub,
          freshmenCount:  freshmenCount.toLocaleString(),
          freshmenSub:    freshmenPct,
        },
      };
    } catch (error) {
      console.error("[AttendanceModel.getOtherInsights] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Dashboard KPI stats for AttendanceDashboard
   * Returns: totalVisits, totalMinutes, avgDurationMinutes, peakHourLabel, peakHourCount,
   *          mostActiveProgram, mostActiveProgramVisits
   */
  async getDashboardStats(filters = {}) {
    try {
      const { clauses, params } = buildAttendanceFilter(filters);
      const where = `WHERE ${clauses.join(" AND ")}`;

      const [[visitsRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM attendance ${where}`, params
      );

      const [[hoursRow]] = await pool.query(
        `SELECT COALESCE(SUM(duration), 0) AS totalMinutes
         FROM attendance ${where} AND status = 'checked_out' AND duration IS NOT NULL`,
        params
      );

      const [[avgRow]] = await pool.query(
        `SELECT COALESCE(AVG(duration), 0) AS avgMinutes
         FROM attendance ${where} AND status = 'checked_out' AND duration IS NOT NULL`,
        params
      );

      const [peakRows] = await pool.query(
        `SELECT HOUR(check_in_time) AS hr, COUNT(*) AS cnt
         FROM attendance ${where} AND DATE(check_in_time) = CURDATE()
         GROUP BY hr ORDER BY cnt DESC LIMIT 1`,
        params
      );

      const [programRows] = await pool.query(
        `SELECT student_course AS program, COUNT(*) AS cnt
         FROM attendance ${where} AND student_course IS NOT NULL AND student_course != ''
         GROUP BY student_course ORDER BY cnt DESC LIMIT 1`,
        params
      );

      // Format peak hour as "H:00 AM/PM – H+1:00 AM/PM"
      let peakHourLabel = "—";
      let peakHourCount = 0;
      if (peakRows.length > 0) {
        peakHourCount = Number(peakRows[0].cnt);
        const h = Number(peakRows[0].hr);
        const fmt = hour => {
          const period = hour < 12 ? "AM" : "PM";
          const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          return `${h12}:00 ${period}`;
        };
        peakHourLabel = `${fmt(h)} – ${fmt(h + 1)}`;
      }

      return {
        success: true,
        data: {
          totalVisits:            Number(visitsRow.total),
          totalMinutes:           Number(hoursRow.totalMinutes),
          avgDurationMinutes:     Math.round(Number(avgRow.avgMinutes)),
          peakHourLabel,
          peakHourCount,
          mostActiveProgram:      programRows.length > 0 ? programRows[0].program : "—",
          mostActiveProgramVisits:programRows.length > 0 ? Number(programRows[0].cnt) : 0,
        },
      };
    } catch (error) {
      console.error("[AttendanceModel.getDashboardStats] Error:", error.message);
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