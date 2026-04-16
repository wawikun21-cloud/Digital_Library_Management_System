// ─────────────────────────────────────────────────────────
//  routes/analytics.js
// ─────────────────────────────────────────────────────────

const express             = require("express");
const AnalyticsController = require("../controllers/analyticsController");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");
const router = express.Router();

// GET /api/analytics/most-borrowed
router.get("/most-borrowed",       requireAuth, requireAdmin, AnalyticsController.getMostBorrowed);

// GET /api/analytics/attendance
router.get("/attendance",          requireAuth, requireAdmin, AnalyticsController.getAttendance);

// GET /api/analytics/fines
router.get("/fines",               requireAuth, requireAdmin, AnalyticsController.getFines);

// GET /api/analytics/overdue
router.get("/overdue",             requireAuth, requireAdmin, AnalyticsController.getOverdue);

// GET /api/analytics/holdings-breakdown
router.get("/holdings-breakdown",  requireAuth, requireAdmin, AnalyticsController.getHoldingsBreakdown);

module.exports = router;