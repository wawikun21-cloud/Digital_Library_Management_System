const express = require("express");
const router = express.Router();
const ToolsController = require("./tools.controller");
const {
  requireAuth,
  resolvePermissions,
  requirePermissionAction,
} = require("../../features/roles");
const { resolveSchoolScope } = require("../organization");
const { toolsUpload } = require("../../middleware/toolsUpload");

router.use(requireAuth, resolvePermissions, resolveSchoolScope);

// Listing and reading are open to every authenticated role that holds
// use_tools (all five seeded roles). The controller still forces an
// active-only filter for anyone without manage_tools, so students and
// librarians never see unpublished entries.
router.get("/", requirePermissionAction("use_tools", "view"), ToolsController.listTools);
router.get("/categories", requirePermissionAction("use_tools", "view"), ToolsController.getCategories);
router.get("/stats", requirePermissionAction("manage_tools", "view"), ToolsController.getStats);
router.get("/:id/download", requirePermissionAction("use_tools", "download"), ToolsController.downloadTool);
router.get("/:id", requirePermissionAction("use_tools", "view"), ToolsController.getTool);
router.post("/", requirePermissionAction("manage_tools", "create"), toolsUpload, ToolsController.createTool);
router.put("/:id", requirePermissionAction("manage_tools", "edit"), toolsUpload, ToolsController.updateTool);
router.delete("/:id", requirePermissionAction("manage_tools", "delete"), ToolsController.deleteTool);

module.exports = router;
