// ─────────────────────────────────────────────────────────
//  routes/trash.js
//
//  Permission-guarded (previously requireAdmin):
//    GET /                      → manage_trash:view
//    POST /restore/:trashLogId  → manage_trash:restore
//    DELETE /all, /:trashLogId  → manage_trash:delete
// ─────────────────────────────────────────────────────────

const express         = require("express");
const router          = express.Router();
const TrashController = require("../controllers/trashController");
const {
  requireAuth,
  resolvePermissions,
  requirePermissionAction,
} = require("../features/roles");
const { resolveSchoolScope } = require("../features/organization");

router.use(requireAuth, resolvePermissions, resolveSchoolScope);

/** GET  /api/trash                          — list trash */
router.get("/", requirePermissionAction("manage_trash", "view"), TrashController.getAll);

/** POST /api/trash/restore/:trashLogId      — restore one */
router.post("/restore/:trashLogId", requirePermissionAction("manage_trash", "restore"), TrashController.restore);

/** DELETE /api/trash/all                    — empty all (or ?entityType=book) */
router.delete("/all", requirePermissionAction("manage_trash", "delete"), TrashController.permanentDeleteAll);

/** DELETE /api/trash/:trashLogId            — permanent delete one */
router.delete("/:trashLogId", requirePermissionAction("manage_trash", "delete"), TrashController.permanentDelete);

module.exports = router;
