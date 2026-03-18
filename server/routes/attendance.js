// ─────────────────────────────────────────────────────────
//  routes/attendance.js
//  Attendance Routes - API endpoints for attendance management
// ─────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const AttendanceController = require("../controllers/attendanceController");

// ─────────────────────────────────────────────────────────
//  GET Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   GET /api/attendance
 * @desc    Get all attendance records
 * @access  Public
 */
router.get("/", AttendanceController.getAllAttendance);

/**
 * @route   GET /api/attendance/active
 * @desc    Get all active attendance records (checked in)
 * @access  Public
 */
router.get("/active", AttendanceController.getActiveAttendance);

/**
 * @route   GET /api/attendance/student/:studentIdNumber
 * @desc    Get attendance records by student ID number
 * @access  Public
 */
router.get("/student/:studentIdNumber", AttendanceController.getAttendanceByStudentId);



/**
 * @route   GET /api/attendance/stats
 * @desc    Get attendance statistics
 * @access  Public
 */
router.get("/stats", AttendanceController.getAttendanceStats);

// ─────────────────────────────────────────────────────────
//  POST Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   POST /api/attendance/check-in
 * @desc    Check in a student
 * @access  Public
 */
router.post("/check-in", AttendanceController.checkIn);

/**
 * @route   POST /api/attendance/check-out/:studentIdNumber
 * @desc    Check out a student by student ID number
 * @access  Public
 */
router.post("/check-out/:studentIdNumber", AttendanceController.checkOut);

// ─────────────────────────────────────────────────────────
//  DELETE Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   DELETE /api/attendance/:id
 * @desc    Delete an attendance record
 * @access  Public
 */
router.delete("/:id", AttendanceController.deleteAttendance);

module.exports = router;
