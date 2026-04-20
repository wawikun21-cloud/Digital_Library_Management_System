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