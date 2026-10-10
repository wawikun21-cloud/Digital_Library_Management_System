const express = require("express");
const router = express.Router();
const UsersController = require("./users.controller");
const { requireAuth } = require("../../middleware/authMiddleware");
const {
  resolvePermissions,
  requirePermissionAction,
} = require("../../features/roles");

// GET /me stays requireAuth-only: every authenticated role resolves itself.
router.get("/me", requireAuth, UsersController.getCurrentUser);

// Everything below requires manage_users:* — the seed grants it to
// super_admin + admin, matching the previous requireSuperAdminOrAdmin.
// The service-level hierarchy rules (canManageTarget / canChangeRole /
// canDeactivateTarget) are orthogonal and still enforced in users.service.
router.use(requireAuth, resolvePermissions);

router.get("/", requirePermissionAction("manage_users", "view"), UsersController.listUsers);
router.get("/stats", requirePermissionAction("manage_users", "view"), UsersController.getUserStats);
router.get("/:id", requirePermissionAction("manage_users", "view"), UsersController.getUserById);
router.post("/", requirePermissionAction("manage_users", "create"), UsersController.createUser);
router.put("/:id", requirePermissionAction("manage_users", "edit"), UsersController.updateUser);
router.put("/:id/role", requirePermissionAction("manage_users", "manage_roles"), UsersController.changeRole);
router.put("/:id/password", requirePermissionAction("manage_users", "edit"), UsersController.changePassword);
router.delete("/:id", requirePermissionAction("manage_users", "delete"), UsersController.deactivateUser);
router.patch("/:id/reactivate", requirePermissionAction("manage_users", "reactivate"), UsersController.reactivateUser);

module.exports = router;
