// ─────────────────────────────────────────────────────────
//  routes/analytics.js
// ─────────────────────────────────────────────────────────

const express            = require("express");
const AnalyticsController = require("../controllers/AnalyticsController");
const router = express.Router();

// GET /api/analytics/most-borrowed
router.get("/most-borrowed", AnalyticsController.getMostBorrowed);

// GET /api/analytics/attendance
router.get("/attendance",    AnalyticsController.getAttendance);

// GET /api/analytics/fines
router.get("/fines",         AnalyticsController.getFines);

// GET /api/analytics/overdue
router.get("/overdue",       AnalyticsController.getOverdue);

module.exports = router;