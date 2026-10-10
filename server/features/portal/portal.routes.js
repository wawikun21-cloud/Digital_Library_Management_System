const express = require("express");
const router = express.Router();
const PortalController = require("./portal.controller");
const { requireAuth } = require("../../middleware/authMiddleware");
const { resolvePermissions, requirePermissionAction } = require("../../features/roles");
const { portalImageUpload } = require("./portalImageUpload");

// Student portal home data (active hero slides + latest e-books + latest courses)
// Unchanged: "student" is an audience, not a capability — every authenticated role.
router.get("/home", requireAuth, PortalController.getHome);

// Hero slide management — permission-guarded (was requireSuperAdminOrAdmin)
router.get("/slides", requireAuth, resolvePermissions, requirePermissionAction("manage_settings", "view"), PortalController.listSlides);
router.post("/slides", requireAuth, resolvePermissions, requirePermissionAction("manage_settings", "create"), portalImageUpload, PortalController.createSlide);
router.patch("/slides/reorder", requireAuth, resolvePermissions, requirePermissionAction("manage_settings", "reorder"), PortalController.reorderSlides);
router.put("/slides/:id", requireAuth, resolvePermissions, requirePermissionAction("manage_settings", "edit"), portalImageUpload, PortalController.updateSlide);
router.delete("/slides/:id", requireAuth, resolvePermissions, requirePermissionAction("manage_settings", "delete"), PortalController.deleteSlide);

module.exports = router;
