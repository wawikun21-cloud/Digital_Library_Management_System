// ─────────────────────────────────────────────────────────
//  routes/students.js
//  Students Routes - API endpoints for student management
//  Accessible by: admin + staff
// ─────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const StudentsController = require("../controllers/studentsController");
const { requireAuth, requireAdminOrStaff } = require("../middleware/authMiddleware");

// ─────────────────────────────────────────────────────────
//  Faculty Routes (static — must be before /:id)
// ─────────────────────────────────────────────────────────

router.get("/faculty",              requireAuth, requireAdminOrStaff, StudentsController.getAllFaculty);
router.post("/faculty",             requireAuth, requireAdminOrStaff, StudentsController.createFaculty);
router.post("/faculty/bulk-import", requireAuth, requireAdminOrStaff, StudentsController.bulkImportFaculty);
router.put("/faculty/:id",          requireAuth, requireAdminOrStaff, StudentsController.updateFaculty);
router.delete("/faculty/:id",       requireAuth, requireAdminOrStaff, StudentsController.deleteFaculty);

// ─────────────────────────────────────────────────────────
//  Student Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   GET /api/students
 * @desc    Get all students
 * @access  Admin + Staff
 */
router.get("/", requireAuth, requireAdminOrStaff, StudentsController.getAllStudents);

/**
 * @route   GET /api/students/stats
 * @desc    Get student statistics
 * @access  Admin + Staff
 */
router.get("/stats", requireAuth, requireAdminOrStaff, StudentsController.getStudentStats);

/**
 * @route   GET /api/students/student-id/:studentIdNumber
 * @desc    Get a student by student ID number
 * @access  Admin + Staff
 */
router.get("/student-id/:studentIdNumber", requireAuth, requireAdminOrStaff, StudentsController.getStudentByStudentIdNumber);

/**
 * @route   GET /api/students/:id
 * @desc    Get a student by ID
 * @access  Admin + Staff
 */
router.get("/:id", requireAuth, requireAdminOrStaff, StudentsController.getStudentById);

// ─────────────────────────────────────────────────────────
//  POST Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   POST /api/students/bulk-import
 * @desc    Bulk import students from Excel
 * @access  Admin + Staff
 */
router.post("/bulk-import", requireAuth, requireAdminOrStaff, StudentsController.bulkImportStudents);

/**
 * @route   POST /api/students
 * @desc    Create a new student
 * @access  Admin + Staff
 */
router.post("/", requireAuth, requireAdminOrStaff, StudentsController.createStudent);

// ─────────────────────────────────────────────────────────
//  PUT Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   PUT /api/students/:id
 * @desc    Update an existing student
 * @access  Admin + Staff
 */
router.put("/:id", requireAuth, requireAdminOrStaff, StudentsController.updateStudent);

// ─────────────────────────────────────────────────────────
//  DELETE Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete a student
 * @access  Admin + Staff
 */
router.delete("/:id", requireAuth, requireAdminOrStaff, StudentsController.deleteStudent);

module.exports = router;