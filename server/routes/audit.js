// ─────────────────────────────────────────────────────────
//  routes/audit.js
//  All routes require view_audit_logs (previously requireAdmin).
//  GET /export additionally requires view_audit_logs:export.
// ─────────────────────────────────────────────────────────

const express                               = require("express");
const router                                = express.Router();
const { requireAuth }                       = require("../middleware/authMiddleware");
const { resolvePermissions, requirePermissionAction } = require("../features/roles");
const { getLogs, getStats, exportCsv, getById } = require("../controllers/auditController");

// Apply auth + permission resolution to all audit routes
router.use(requireAuth, resolvePermissions);

router.get("/",        requirePermissionAction("view_audit_logs", "view"),   getLogs);    // GET /api/audit
router.get("/stats",   requirePermissionAction("view_audit_logs", "view"),   getStats);   // GET /api/audit/stats
router.get("/export",  requirePermissionAction("view_audit_logs", "export"), exportCsv);  // GET /api/audit/export
router.get("/:id",     requirePermissionAction("view_audit_logs", "view"),   getById);    // GET /api/audit/:id

module.exports = router;
