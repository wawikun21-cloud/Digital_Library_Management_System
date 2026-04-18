// ─────────────────────────────────────────────────────────
//  routes/audit.js
//  All routes are admin-only (requireAuth + requireAdmin).
// ─────────────────────────────────────────────────────────

const express                               = require("express");
const router                                = express.Router();
const { requireAuth, requireAdmin }         = require("../middleware/authMiddleware");
const { getLogs, getStats, exportCsv, getById } = require("../controllers/auditController");

// Apply auth to all audit routes
router.use(requireAuth, requireAdmin);

router.get("/",        getLogs);    // GET /api/audit
router.get("/stats",   getStats);   // GET /api/audit/stats
router.get("/export",  exportCsv);  // GET /api/audit/export
router.get("/:id",     getById);    // GET /api/audit/:id

module.exports = router;
