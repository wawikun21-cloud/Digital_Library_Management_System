// ─────────────────────────────────────────────────────────
//  routes/attendance.js
//  Attendance Routes - API endpoints for attendance management
//
//  Permission-guarded (previously requireAuth-only):
//    GETs                                   → manage_attendance:view
//    POST /tap/:studentIdNumber, /check-in  → use_kiosk:check_in
//    POST /check-out/:studentIdNumber       → use_kiosk:check_out
//    DELETE /:id                            → manage_attendance:delete
//
//  INTENTIONAL BEHAVIOR CHANGE: this file was requireAuth-only, so
//  students could call attendance APIs even though the UI hid them.
//  The retrofit closes that gap — attendance now requires
//  manage_attendance / use_kiosk, which students do not hold.
// ─────────────────────────────────────────────────────────

const express              = require("express");
const router               = express.Router();
const AttendanceController = require("../controllers/attendanceController");
const {
  requireAuth,
  resolvePermissions,
  requirePermissionAction,
} = require("../features/roles");

router.use(requireAuth, resolvePermissions);

// ── GET ───────────────────────────────────────────────────

/** GET /api/attendance            → all records */
router.get("/", requirePermissionAction("manage_attendance", "view"), AttendanceController.getAllAttendance);

/** GET /api/attendance/active     → currently checked-in students */
router.get("/active", requirePermissionAction("manage_attendance", "view"), AttendanceController.getActiveAttendance);

/** GET /api/attendance/stats      → aggregate statistics */
router.get("/stats", requirePermissionAction("manage_attendance", "view"), AttendanceController.getAttendanceStats);

/** GET /api/attendance/dashboard-stats → KPI stats for AttendanceDashboard */
router.get("/dashboard-stats", requirePermissionAction("manage_attendance", "view"), AttendanceController.getDashboardStats);

/** GET /api/attendance/school-years → distinct school years with data */
router.get("/school-years", requirePermissionAction("manage_attendance", "view"), AttendanceController.getSchoolYears);

/** GET /api/attendance/top-students → top 50 students by total hours */
router.get("/top-students", requirePermissionAction("manage_attendance", "view"), AttendanceController.getTopStudents);

/** GET /api/attendance/all-top-students → full ranked list for modal */
router.get("/all-top-students", requirePermissionAction("manage_attendance", "view"), AttendanceController.getAllTopStudents);

/** GET /api/attendance/program-usage → visits/hours grouped by program */
router.get("/program-usage", requirePermissionAction("manage_attendance", "view"), AttendanceController.getProgramUsage);

/** GET /api/attendance/visits-over-time?groupBy=Daily|Weekly|Monthly */
router.get("/visits-over-time", requirePermissionAction("manage_attendance", "view"), AttendanceController.getVisitsOverTime);

/** GET /api/attendance/peak-hours → check-ins grouped by hour of day */
router.get("/peak-hours", requirePermissionAction("manage_attendance", "view"), AttendanceController.getPeakHours);

/** GET /api/attendance/visits-by-day → check-ins grouped by day of week */
router.get("/visits-by-day", requirePermissionAction("manage_attendance", "view"), AttendanceController.getVisitsByDay);

/** GET /api/attendance/low-usage-students → students with 0–1 visits (preview, limit 20) */
router.get("/low-usage-students", requirePermissionAction("manage_attendance", "view"), AttendanceController.getLowUsageStudents);

/** GET /api/attendance/all-low-usage-students → full list for modal */
router.get("/all-low-usage-students", requirePermissionAction("manage_attendance", "view"), AttendanceController.getAllLowUsageStudents);

/** GET /api/attendance/session-distribution → duration bucket breakdown */
router.get("/session-distribution", requirePermissionAction("manage_attendance", "view"), AttendanceController.getSessionDistribution);

/** GET /api/attendance/other-insights → longest session, busiest day, most consistent, freshmen count */
router.get("/other-insights", requirePermissionAction("manage_attendance", "view"), AttendanceController.getOtherInsights);

/** GET /api/attendance/student/:studentIdNumber → history for one student */
router.get("/student/:studentIdNumber", requirePermissionAction("manage_attendance", "view"), AttendanceController.getAttendanceByStudentId);

// ── POST ──────────────────────────────────────────────────

/**
 * POST /api/attendance/tap/:studentIdNumber
 * Smart toggle: 1st tap = check-in, 2nd tap = check-out.
 */
router.post("/tap/:studentIdNumber", requirePermissionAction("use_kiosk", "check_in"), AttendanceController.tap);

/** POST /api/attendance/check-in          → explicit check-in (legacy) */
router.post("/check-in", requirePermissionAction("use_kiosk", "check_in"), AttendanceController.checkIn);

/** POST /api/attendance/check-out/:studentIdNumber → explicit check-out (legacy) */
router.post("/check-out/:studentIdNumber", requirePermissionAction("use_kiosk", "check_out"), AttendanceController.checkOut);

// ── DELETE ────────────────────────────────────────────────

/** DELETE /api/attendance/:id → soft-delete a record */
router.delete("/:id", requirePermissionAction("manage_attendance", "delete"), AttendanceController.deleteAttendance);

module.exports = router;
