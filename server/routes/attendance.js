// ─────────────────────────────────────────────────────────
//  routes/attendance.js
//  Attendance Routes - API endpoints for attendance management
// ─────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const AttendanceController = require("../controllers/attendanceController");

// ── GET ───────────────────────────────────────────────────

/** GET /api/attendance            → all records */
router.get("/", AttendanceController.getAllAttendance);

/** GET /api/attendance/active     → currently checked-in students */
router.get("/active", AttendanceController.getActiveAttendance);

/** GET /api/attendance/stats      → aggregate statistics */
router.get("/stats", AttendanceController.getAttendanceStats);

/** GET /api/attendance/student/:studentIdNumber → history for one student */
router.get("/student/:studentIdNumber", AttendanceController.getAttendanceByStudentId);

// ── POST ──────────────────────────────────────────────────

/**
 * POST /api/attendance/tap/:studentIdNumber
 * Smart toggle: 1st tap = check-in, 2nd tap = check-out.
 * Student details are auto-fetched from the students master table.
 */
router.post("/tap/:studentIdNumber", AttendanceController.tap);

/** POST /api/attendance/check-in          → explicit check-in (legacy) */
router.post("/check-in", AttendanceController.checkIn);

/** POST /api/attendance/check-out/:studentIdNumber → explicit check-out (legacy) */
router.post("/check-out/:studentIdNumber", AttendanceController.checkOut);

// ── DELETE ────────────────────────────────────────────────

/** DELETE /api/attendance/:id → soft-delete a record */
router.delete("/:id", AttendanceController.deleteAttendance);

module.exports = router;