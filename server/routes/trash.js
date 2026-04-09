// ─────────────────────────────────────────────────────────
//  routes/trash.js
// ─────────────────────────────────────────────────────────

const express        = require("express");
const router         = express.Router();
const TrashController = require("../controllers/trashController");

/** GET  /api/trash                          — list trash */
router.get("/", TrashController.getAll);

/** POST /api/trash/restore/:trashLogId      — restore one */
router.post("/restore/:trashLogId", TrashController.restore);

/** DELETE /api/trash/all                    — empty all (or ?entityType=book) */
router.delete("/all", TrashController.permanentDeleteAll);

/** DELETE /api/trash/:trashLogId            — permanent delete one */
router.delete("/:trashLogId", TrashController.permanentDelete);

module.exports = router;
