const express = require("express");
const router = express.Router();
const UsersController = require("./users.controller");
const {
  requireAuth,
  requireSuperAdmin,
  requireSuperAdminOrAdmin,
} = require("../../middleware/authMiddleware");

router.get("/", requireAuth, requireSuperAdminOrAdmin, UsersController.listUsers);
router.get("/stats", requireAuth, requireSuperAdminOrAdmin, UsersController.getUserStats);
router.get("/me", requireAuth, UsersController.getCurrentUser);
router.get("/:id", requireAuth, requireSuperAdminOrAdmin, UsersController.getUserById);
router.post("/", requireAuth, requireSuperAdminOrAdmin, UsersController.createUser);
router.put("/:id", requireAuth, requireSuperAdminOrAdmin, UsersController.updateUser);
router.put("/:id/role", requireAuth, requireSuperAdminOrAdmin, UsersController.changeRole);
router.put("/:id/password", requireAuth, requireSuperAdminOrAdmin, UsersController.changePassword);
router.delete("/:id", requireAuth, requireSuperAdminOrAdmin, UsersController.deactivateUser);
router.patch("/:id/reactivate", requireAuth, requireSuperAdmin, UsersController.reactivateUser);

module.exports = router;
