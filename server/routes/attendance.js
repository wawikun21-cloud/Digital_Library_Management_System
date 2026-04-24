// ─────────────────────────────────────────────────────────
//  routes/attendance.js
//  Attendance Routes - API endpoints for attendance management
//  Accessible by: admin + staff
// ─────────────────────────────────────────────────────────

const express              = require("express");
const router               = express.Router();
const AttendanceController = require("../controllers/attendanceController");
const { requireAuth }      = require("../middleware/authMiddleware");

// ── GET ───────────────────────────────────────────────────

/** GET /api/attendance            → all records */
router.get("/", requireAuth, AttendanceController.getAllAttendance);

/** GET /api/attendance/active     → currently checked-in students */
router.get("/active", requireAuth, AttendanceController.getActiveAttendance);

/** GET /api/attendance/stats      → aggregate statistics */
router.get("/stats", requireAuth, AttendanceController.getAttendanceStats);

/** GET /api/attendance/dashboard-stats → KPI stats for AttendanceDashboard */
router.get("/dashboard-stats", requireAuth, AttendanceController.getDashboardStats);

/** GET /api/attendance/school-years → distinct school years with data */
router.get("/school-years", requireAuth, AttendanceController.getSchoolYears);

/** GET /api/attendance/top-students → top 50 students by total hours */
router.get("/top-students", requireAuth, AttendanceController.getTopStudents);

/** GET /api/attendance/all-top-students → full ranked list for modal */
router.get("/all-top-students", requireAuth, AttendanceController.getAllTopStudents);

/** GET /api/attendance/program-usage → visits/hours grouped by program */
router.get("/program-usage", requireAuth, AttendanceController.getProgramUsage);

/** GET /api/attendance/visits-over-time?groupBy=Daily|Weekly|Monthly */
router.get("/visits-over-time", requireAuth, AttendanceController.getVisitsOverTime);

/** GET /api/attendance/peak-hours → check-ins grouped by hour of day */
router.get("/peak-hours", requireAuth, AttendanceController.getPeakHours);

/** GET /api/attendance/visits-by-day → check-ins grouped by day of week */
router.get("/visits-by-day", requireAuth, AttendanceController.getVisitsByDay);

/** GET /api/attendance/low-usage-students → students with 0–1 visits (preview, limit 20) */
router.get("/low-usage-students", requireAuth, AttendanceController.getLowUsageStudents);

/** GET /api/attendance/all-low-usage-students → full list for modal */
router.get("/all-low-usage-students", requireAuth, AttendanceController.getAllLowUsageStudents);

/** GET /api/attendance/session-distribution → duration bucket breakdown */
router.get("/session-distribution", requireAuth, AttendanceController.getSessionDistribution);

/** GET /api/attendance/other-insights → longest session, busiest day, most consistent, freshmen count */
router.get("/other-insights", requireAuth, AttendanceController.getOtherInsights);

/** GET /api/attendance/student/:studentIdNumber → history for one student */
router.get("/student/:studentIdNumber", requireAuth, AttendanceController.getAttendanceByStudentId);

// ── POST ──────────────────────────────────────────────────

/**
 * POST /api/attendance/tap/:studentIdNumber
 * Smart toggle: 1st tap = check-in, 2nd tap = check-out.
 */
router.post("/tap/:studentIdNumber", requireAuth, AttendanceController.tap);

/** POST /api/attendance/check-in          → explicit check-in (legacy) */
router.post("/check-in", requireAuth, AttendanceController.checkIn);

/** POST /api/attendance/check-out/:studentIdNumber → explicit check-out (legacy) */
router.post("/check-out/:studentIdNumber", requireAuth, AttendanceController.checkOut);

// ── DELETE ────────────────────────────────────────────────

/** DELETE /api/attendance/:id → soft-delete a record */
router.delete("/:id", requireAuth, AttendanceController.deleteAttendance);

module.exports = router;