// ─────────────────────────────────────────────────────────
//  routes/students.js
//  Students Routes - API endpoints for student management
// ─────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const StudentsController = require("../controllers/studentsController");

// ─────────────────────────────────────────────────────────
//  GET Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   GET /api/students
 * @desc    Get all students
 * @access  Public
 */
router.get("/", StudentsController.getAllStudents);

/**
 * @route   GET /api/students/stats
 * @desc    Get student statistics
 * @access  Public
 */
router.get("/stats", StudentsController.getStudentStats);

/**
 * @route   GET /api/students/student-id/:studentIdNumber
 * @desc    Get a student by student ID number
 * @access  Public
 */
router.get("/student-id/:studentIdNumber", StudentsController.getStudentByStudentIdNumber);

/**
 * @route   GET /api/students/:id
 * @desc    Get a student by ID
 * @access  Public
 */
router.get("/:id", StudentsController.getStudentById);

// ─────────────────────────────────────────────────────────
//  POST Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   POST /api/students
 * @desc    Create a new student
 * @access  Public
 */
router.post("/", StudentsController.createStudent);

/**
 * @route   POST /api/students/bulk-import
 * @desc    Bulk import students from Excel
 * @access  Public
 */
router.post("/bulk-import", StudentsController.bulkImportStudents);

// ─────────────────────────────────────────────────────────
//  PUT Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   PUT /api/students/:id
 * @desc    Update an existing student
 * @access  Public
 */
router.put("/:id", StudentsController.updateStudent);

// ─────────────────────────────────────────────────────────
//  DELETE Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete a student
 * @access  Public
 */
router.delete("/:id", StudentsController.deleteStudent);

module.exports = router;
