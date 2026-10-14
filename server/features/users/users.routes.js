const express = require("express");
const router = express.Router();
const UsersController = require("./users.controller");
const { requireAuth } = require("../../middleware/authMiddleware");
const {
  resolvePermissions,
  requirePermissionAction,
} = require("../../features/roles");
const { resolveSchoolScope } = require("../organization");

// GET /me stays requireAuth-only: every authenticated role resolves itself.
router.get("/me", requireAuth, UsersController.getCurrentUser);

// Everything below requires manage_users:* — the seed grants it to
// super_admin + admin, matching the previous requireSuperAdminOrAdmin.
// The service-level hierarchy rules (canManageTarget / canChangeRole /
// canDeactivateTarget) are orthogonal and still enforced in users.service.
// resolveSchoolScope is mounted here (not per-route) so every handler and
// the service layer can rely on req.schoolScope being resolved.
router.use(requireAuth, resolvePermissions, resolveSchoolScope);

router.get("/", requirePermissionAction("manage_users", "view"), UsersController.listUsers);
router.get("/stats", requirePermissionAction("manage_users", "view"), UsersController.getUserStats);

// ─────────────────────────────────────────────────────────
//  Student users (students table retired).
//  Guarded by manage_students:* — the same permission the old
//  /api/students routes used, so today's staff access is
//  preserved. Every handler is school-scoped server-side.
//  (Registered BEFORE "/:id" so "/students" is never captured
//  by the generic user-by-id route.)
// ─────────────────────────────────────────────────────────

router.get("/students", requirePermissionAction("manage_students", "view"), UsersController.listStudentUsers);
router.get("/students/stats", requirePermissionAction("manage_students", "view"), UsersController.getStudentStats);
router.get("/students/search", requirePermissionAction("manage_students", "view"), UsersController.searchStudentUsers);
router.post("/students/check-id", requirePermissionAction("manage_students", "view"), UsersController.checkStudentIdExists);
router.get("/students/student-id/:studentIdNumber", requirePermissionAction("manage_students", "view"), UsersController.getStudentByStudentIdNumber);
router.post("/students", requirePermissionAction("manage_students", "create"), UsersController.createStudentUser);
router.post("/students/bulk-import", requirePermissionAction("manage_students", "import"), UsersController.bulkImportStudentUsers);
router.put("/students/:id", requirePermissionAction("manage_students", "edit"), UsersController.updateStudentUser);
router.delete("/students/:id", requirePermissionAction("manage_students", "delete"), UsersController.deleteStudentUser);

router.get("/:id", requirePermissionAction("manage_users", "view"), UsersController.getUserById);
router.post("/", requirePermissionAction("manage_users", "create"), UsersController.createUser);
router.put("/:id", requirePermissionAction("manage_users", "edit"), UsersController.updateUser);
router.put("/:id/role", requirePermissionAction("manage_users", "manage_roles"), UsersController.changeRole);
router.put("/:id/password", requirePermissionAction("manage_users", "edit"), UsersController.changePassword);
router.delete("/:id", requirePermissionAction("manage_users", "delete"), UsersController.deactivateUser);
router.patch("/:id/reactivate", requirePermissionAction("manage_users", "reactivate"), UsersController.reactivateUser);

module.exports = router;
