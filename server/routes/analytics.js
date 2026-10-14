// ─────────────────────────────────────────────────────────
//  routes/analytics.js  —  Permission-guarded (was requireAdmin)
//
//  The bare requireAdmin on this router is replaced by
//  requireAuth + requirePermissionAction('view_reports','view'),
//  which the seed grants to exactly super_admin + admin — the same
//  effective access as before. Librarians therefore still get a 403.
// ─────────────────────────────────────────────────────────

const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/analyticsController");

const { requireAuth } = require("../middleware/authMiddleware");
const { resolvePermissions, requirePermissionAction } = require("../features/roles");
const { resolveSchoolScope } = require("../features/organization");

// All analytics routes: authenticated + view_reports:view + school scope
// (book KPIs/charts scope through book assignments; the attendance chart
// through the student-user link).
router.use(requireAuth, resolvePermissions, resolveSchoolScope);
router.use(requirePermissionAction("view_reports", "view"));

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
