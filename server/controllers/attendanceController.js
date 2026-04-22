// ─────────────────────────────────────────────────────────
//  controllers/attendanceController.js
//  Attendance Controller - API endpoints for attendance tracking
// ─────────────────────────────────────────────────────────

const AttendanceModel = require("../models/Attendance");
const auditService    = require("../services/auditService");
const { broadcast }   = require("../utils/websocket");

/** Extract and sanitize dashboard filter params from req.query */
function parseFilters(query = {}) {
  return {
    program:    query.program    || null,
    yrLevel:    query.yrLevel    || null,
    schoolYear: query.schoolYear || null,
    dateFrom:   query.dateFrom   || null,
    dateTo:     query.dateTo     || null,
  };
}

const AttendanceController = {

  /** GET /api/attendance — all records */
  async getAllAttendance(req, res) {
    try {
      const result = await AttendanceModel.getAll();
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "Attendance records retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getAllAttendance]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/active — currently checked-in */
  async getActiveAttendance(req, res) {
    try {
      const result = await AttendanceModel.getActiveAttendance();
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "Active attendance records retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getActiveAttendance]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/student/:studentIdNumber */
  async getAttendanceByStudentId(req, res) {
    try {
      const { studentIdNumber } = req.params;
      const result = await AttendanceModel.getByStudentId(studentIdNumber);
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "Student attendance records retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getAttendanceByStudentId]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/stats */
  async getAttendanceStats(req, res) {
    try {
      const result = await AttendanceModel.getStats();
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "Attendance statistics retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getAttendanceStats]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /**
   * POST /api/attendance/tap/:studentIdNumber
   * First tap → check in. Second tap → check out.
   * Triggered by RFID kiosk — no logged-in user, logs as "system".
   */
  async tap(req, res) {
    try {
      const { studentIdNumber } = req.params;

      if (!studentIdNumber?.trim()) {
        return res.status(400).json({ success: false, error: "Student ID is required." });
      }

      const result = await AttendanceModel.tap(studentIdNumber.trim());

      if (result.success) {
        const statusCode = result.action === "checked_in" ? 201 : 200;
        const message    = result.action === "checked_in"
          ? `${result.data.student_name} checked in successfully`
          : `${result.data.student_name} checked out successfully`;

        // ── Audit: CHECK_IN / CHECK_OUT ─────────────────
        // Kiosk has no session user — override username to "system"
        const auditReq = { ...req, session: { user: { id: null, username: "system", role: "system" } }, headers: req.headers, socket: req.socket };
        await auditService.logAction(auditReq, {
          entity_type : "attendance",
          entity_id   : result.data?.id ?? null,
          action      : result.action === "checked_in" ? "CHECK_IN" : "CHECK_OUT",
          old_data    : null,
          new_data    : {
            student_id_number : studentIdNumber.trim(),
            student_name      : result.data?.student_name ?? null,
          },
        });

        // ── WS: push live attendance update to all clients ─────────────
        try {
          broadcast("attendance:update", { action: result.action, data: result.data });
        } catch (wsErr) {
          console.error("[WS broadcast] attendance:update failed:", wsErr.message);
        }

        return res.status(statusCode).json({
          success: true,
          action:  result.action,
          data:    result.data,
          message,
        });
      }

      // "Student ID not found" → 404, anything else → 400
      const statusCode = result.error?.toLowerCase().includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ success: false, error: result.error });

    } catch (error) {
      console.error("[AttendanceController.tap]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** POST /api/attendance/check-in (explicit, kept for compatibility) */
  async checkIn(req, res) {
    try {
      const result = await AttendanceModel.checkIn(req.body);
      if (result.success) {
        // ── Audit: CHECK_IN ─────────────────────────────
        const auditReq = { ...req, session: { user: { id: null, username: "system", role: "system" } }, headers: req.headers, socket: req.socket };
        await auditService.logAction(auditReq, {
          entity_type : "attendance",
          entity_id   : result.data?.id ?? null,
          action      : "CHECK_IN",
          old_data    : null,
          new_data    : {
            student_id_number : req.body.student_id_number ?? null,
            student_name      : result.data?.student_name  ?? null,
          },
        });
        try { broadcast("attendance:update", { action: "checked_in", data: result.data }); }
        catch (e) { console.error("[WS] attendance:update", e.message); }
        return res.status(201).json({ success: true, data: result.data, message: "Student checked in successfully" });
      }
      const statusCode = result.error?.toLowerCase().includes("not found") ? 404 : 400;
      return res.status(statusCode).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.checkIn]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** POST /api/attendance/check-out/:studentIdNumber (explicit) */
  async checkOut(req, res) {
    try {
      const { studentIdNumber } = req.params;
      const result = await AttendanceModel.checkOut(studentIdNumber);
      if (result.success) {
        // ── Audit: CHECK_OUT ────────────────────────────
        const auditReq = { ...req, session: { user: { id: null, username: "system", role: "system" } }, headers: req.headers, socket: req.socket };
        await auditService.logAction(auditReq, {
          entity_type : "attendance",
          entity_id   : result.data?.id ?? null,
          action      : "CHECK_OUT",
          old_data    : null,
          new_data    : {
            student_id_number : studentIdNumber,
            student_name      : result.data?.student_name ?? null,
          },
        });
        try { broadcast("attendance:update", { action: "checked_out", data: result.data }); }
        catch (e) { console.error("[WS] attendance:update", e.message); }
        return res.status(200).json({ success: true, data: result.data, message: "Student checked out successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.checkOut]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/all-low-usage-students */
  async getAllLowUsageStudents(req, res) {
    try {
      const result = await AttendanceModel.getAllLowUsageStudents();
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "All low usage students retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getAllLowUsageStudents]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/low-usage-students */
  async getLowUsageStudents(req, res) {
    try {
      const result = await AttendanceModel.getLowUsageStudents(parseFilters(req.query));
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "Low usage students retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getLowUsageStudents]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/session-distribution */
  async getSessionDistribution(req, res) {
    try {
      const result = await AttendanceModel.getSessionDistribution(parseFilters(req.query));
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, totalVisits: result.totalVisits, message: "Session distribution retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getSessionDistribution]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/other-insights */
  async getOtherInsights(req, res) {
    try {
      const result = await AttendanceModel.getOtherInsights(parseFilters(req.query));
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "Other insights retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getOtherInsights]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/visits-over-time?groupBy=Daily|Weekly|Monthly */
  async getVisitsOverTime(req, res) {
    try {
      const groupBy = ["Daily","Weekly","Monthly"].includes(req.query.groupBy)
        ? req.query.groupBy : "Daily";
      const result = await AttendanceModel.getVisitsOverTime(groupBy, parseFilters(req.query));
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "Visits over time retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getVisitsOverTime]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/peak-hours */
  async getPeakHours(req, res) {
    try {
      const result = await AttendanceModel.getPeakHours(parseFilters(req.query));
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "Peak hours retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getPeakHours]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/visits-by-day */
  async getVisitsByDay(req, res) {
    try {
      const result = await AttendanceModel.getVisitsByDay(parseFilters(req.query));
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "Visits by day retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getVisitsByDay]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/all-top-students */
  async getAllTopStudents(req, res) {
    try {
      const result = await AttendanceModel.getAllTopStudents();
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "All top students retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getAllTopStudents]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/top-students */
  async getTopStudents(req, res) {
    try {
      const result = await AttendanceModel.getTopStudents(parseFilters(req.query));
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "Top students retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getTopStudents]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/program-usage */
  async getProgramUsage(req, res) {
    try {
      const result = await AttendanceModel.getProgramUsage(parseFilters(req.query));
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "Program usage retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getProgramUsage]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** GET /api/attendance/dashboard-stats */
  async getDashboardStats(req, res) {
    try {
      const result = await AttendanceModel.getDashboardStats(parseFilters(req.query));
      if (result.success) {
        return res.status(200).json({ success: true, data: result.data, message: "Attendance dashboard stats retrieved successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.getDashboardStats]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** DELETE /api/attendance/:id */
  async deleteAttendance(req, res) {
    try {
      const { id } = req.params;
      const result = await AttendanceModel.delete(id);
      if (result.success) {
        try { broadcast("attendance:deleted", { id: Number(id) }); }
        catch (e) { console.error("[WS] attendance:deleted", e.message); }
        return res.status(200).json({ success: true, data: result.data, message: "Attendance record deleted successfully" });
      }
      return res.status(400).json({ success: false, error: result.error });
    } catch (error) {
      console.error("[AttendanceController.deleteAttendance]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
};

module.exports = AttendanceController;