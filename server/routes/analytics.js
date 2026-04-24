// ─────────────────────────────────────────────────────────
//  server/routes/analytics.js
//
//  ROOT CAUSE OF 404 (NOW FIXED):
//
//  The route file was importing:
//    const { authMiddleware } = require("../middleware/authMiddleware");
//
//  But authMiddleware.js exports:
//    { requireAuth, requireRole, requireAdmin, requireStaff, requireAdminOrStaff }
//
//  There is NO export named "authMiddleware". Destructuring a name that
//  doesn't exist gives undefined. Express's router.use(undefined) silently
//  skips every route in this router and falls through to the global 404
//  handler — which is exactly the 404 you were seeing on every single
//  /api/analytics/* request.
//
//  FIX: import requireAuth (the correct export name) and use it instead.
// ─────────────────────────────────────────────────────────

const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/analyticsController");

// FIX: was `{ authMiddleware }` — that export does not exist.
// The correct export name is `requireAuth`.
const { requireAuth } = require("../middleware/authMiddleware");

// All analytics routes require a valid session.
// requireAuth returns 401 when req.session.user is missing — not 404.
router.use(requireAuth);

// ── KPI stats ─────────────────────────────────────────────────────────────────
// Frontend calls: GET /api/analytics/stats
router.get("/stats",              controller.getBookStats);

// ── Chart data ────────────────────────────────────────────────────────────────
router.get("/most-borrowed",      controller.getMostBorrowed);
router.get("/attendance",         controller.getAttendance);
router.get("/fines",              controller.getFines);
router.get("/overdue",            controller.getOverdue);

// ── Book dashboard specific ───────────────────────────────────────────────────
router.get("/books-by-status",    controller.getBooksByStatus);
router.get("/holdings-breakdown", controller.getHoldingsBreakdown);

module.exports = router;