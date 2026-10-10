// ─────────────────────────────────────────────────────────
//  routes/students.js
//  Students Routes - API endpoints for student management
//
//  Permission-guarded (previously requireAdminOrStaff):
//    /faculty*  → manage_faculty:{view,create,edit,delete,import}
//    remaining  → manage_students:{view,create,edit,delete,import}
// ─────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const StudentsController = require("../controllers/studentsController");
const {
  requireAuth,
  resolvePermissions,
  requirePermissionAction,
} = require("../features/roles");

router.use(requireAuth, resolvePermissions);

// ─────────────────────────────────────────────────────────
//  Faculty Routes (static — must be before /:id)
// ─────────────────────────────────────────────────────────

router.get("/faculty",              requirePermissionAction("manage_faculty", "view"),   StudentsController.getAllFaculty);
router.post("/faculty",             requirePermissionAction("manage_faculty", "create"), StudentsController.createFaculty);
router.post("/faculty/bulk-import", requirePermissionAction("manage_faculty", "import"), StudentsController.bulkImportFaculty);
router.put("/faculty/:id",          requirePermissionAction("manage_faculty", "edit"),   StudentsController.updateFaculty);
router.delete("/faculty/:id",       requirePermissionAction("manage_faculty", "delete"), StudentsController.deleteFaculty);

// ─────────────────────────────────────────────────────────
//  Student Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   GET /api/students
 * @desc    Get all students
 * @access  manage_students:view
 */
router.get("/", requirePermissionAction("manage_students", "view"), StudentsController.getAllStudents);

/**
 * @route   GET /api/students/stats
 * @desc    Get student statistics
 * @access  manage_students:view
 */
router.get("/stats", requirePermissionAction("manage_students", "view"), StudentsController.getStudentStats);

/**
 * @route   POST /api/students/check-id
 * @desc    Check if student ID number already exists
 * @access  manage_students:view
 */
router.post("/check-id", requirePermissionAction("manage_students", "view"), StudentsController.checkStudentIdExists);

/**
 * @route   GET /api/students/student-id/:studentIdNumber
 * @desc    Get a student by student ID number
 * @access  manage_students:view
 */
router.get("/student-id/:studentIdNumber", requirePermissionAction("manage_students", "view"), StudentsController.getStudentByStudentIdNumber);

/**
 * @route   GET /api/students/:id
 * @desc    Get a student by ID
 * @access  manage_students:view
 */
router.get("/:id", requirePermissionAction("manage_students", "view"), StudentsController.getStudentById);

// ─────────────────────────────────────────────────────────
//  POST Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   POST /api/students/bulk-import
 * @desc    Bulk import students from Excel
 * @access  manage_students:import
 */
router.post("/bulk-import", requirePermissionAction("manage_students", "import"), StudentsController.bulkImportStudents);

/**
 * @route   POST /api/students
 * @desc    Create a new student
 * @access  manage_students:create
 */
router.post("/", requirePermissionAction("manage_students", "create"), StudentsController.createStudent);

// ─────────────────────────────────────────────────────────
//  PUT Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   PUT /api/students/:id
 * @desc    Update an existing student
 * @access  manage_students:edit
 */
router.put("/:id", requirePermissionAction("manage_students", "edit"), StudentsController.updateStudent);

// ─────────────────────────────────────────────────────────
//  DELETE Routes
// ─────────────────────────────────────────────────────────

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete a student
 * @access  manage_students:delete
 */
router.delete("/:id", requirePermissionAction("manage_students", "delete"), StudentsController.deleteStudent);

module.exports = router;
