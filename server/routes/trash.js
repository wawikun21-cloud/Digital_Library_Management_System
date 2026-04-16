// ─────────────────────────────────────────────────────────
//  routes/trash.js
// ─────────────────────────────────────────────────────────

const express         = require("express");
const router          = express.Router();
const TrashController = require("../controllers/trashController");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

/** GET  /api/trash                          — list trash */
router.get("/", requireAuth, requireAdmin, TrashController.getAll);

/** POST /api/trash/restore/:trashLogId      — restore one */
router.post("/restore/:trashLogId", requireAuth, requireAdmin, TrashController.restore);

/** DELETE /api/trash/all                    — empty all (or ?entityType=book) */
router.delete("/all", requireAuth, requireAdmin, TrashController.permanentDeleteAll);

/** DELETE /api/trash/:trashLogId            — permanent delete one */
router.delete("/:trashLogId", requireAuth, requireAdmin, TrashController.permanentDelete);

module.exports = router;