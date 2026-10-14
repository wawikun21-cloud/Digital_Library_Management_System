// ─────────────────────────────────────────────────────────
//  routes/faculty.js
//  Faculty Routes — API endpoints for faculty management.
//
//  Moved from routes/students.js when student records
//  consolidated into users (role = 'student'); the old
//  /api/students/* routes no longer exist.
//
//  Permission-guarded:
//    manage_faculty:{view,create,edit,delete,import}
//
//  Management is school-scoped (resolveSchoolScope). The
//  faculty borrower lookup in the transaction flow is NOT
//  scoped — faculty may borrow at any school.
// ─────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const FacultyController = require("../controllers/facultyController");
const {
  requireAuth,
  resolvePermissions,
  requirePermissionAction,
} = require("../features/roles");
const { resolveSchoolScope } = require("../features/organization");

router.use(requireAuth, resolvePermissions, resolveSchoolScope);

router.get("/",              requirePermissionAction("manage_faculty", "view"),   FacultyController.getAllFaculty);
router.post("/",             requirePermissionAction("manage_faculty", "create"), FacultyController.createFaculty);
router.post("/bulk-import",  requirePermissionAction("manage_faculty", "import"), FacultyController.bulkImportFaculty);
router.put("/:id",           requirePermissionAction("manage_faculty", "edit"),   FacultyController.updateFaculty);
router.delete("/:id",        requirePermissionAction("manage_faculty", "delete"), FacultyController.deleteFaculty);

module.exports = router;
