// ─────────────────────────────────────────────────────────
//  routes/analytics.js  —  Admin only (unchanged behavior)
//
//  Librarians do NOT have access to analytics.
//  This file is unchanged in terms of access rules — it was
//  already requireAuth-only. We now explicitly add requireAdmin
//  so a librarian hitting /api/analytics/* gets a clean 403.
// ─────────────────────────────────────────────────────────

const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/analyticsController");

const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

// All analytics routes: authenticated + admin only
router.use(requireAuth, requireAdmin);

// ── KPI stats ─────────────────────────────────────────────
router.get("/stats",              controller.getBookStats);

// ── Chart data ────────────────────────────────────────────
router.get("/most-borrowed",      controller.getMostBorrowed);
router.get("/attendance",         controller.getAttendance);
router.get("/fines",              controller.getFines);
router.get("/overdue",            controller.getOverdue);

// ── Book dashboard specific ───────────────────────────────
router.get("/books-by-status",    controller.getBooksByStatus);
router.get("/holdings-breakdown", controller.getHoldingsBreakdown);

module.exports = router;
