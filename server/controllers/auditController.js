// ─────────────────────────────────────────────────────────
//  controllers/auditController.js
//  Admin-only endpoints for the Audit Trail feature.
//
//  GET  /api/audit              — paginated + filtered list
//  GET  /api/audit/stats        — summary counts / breakdowns
//  GET  /api/audit/export       — CSV download (filtered)
//  GET  /api/audit/:id          — single entry detail
// ─────────────────────────────────────────────────────────

const AuditLog = require("../models/AuditLog");
const { successResponse, errorResponse } = require("../utils/responseFormatter");

// ── GET /api/audit ────────────────────────────────────────
const getLogs = async (req, res) => {
  try {
    const {
      page         = 1,
      limit        = 50,
      entity_type,
      action,
      user_username,
      date_from,
      date_to,
    } = req.query;

    const { rows, total } = await AuditLog.getAll({
      page        : Number(page),
      limit       : Math.min(Number(limit), 200),   // cap at 200 per page
      entity_type,
      action,
      user_username,
      date_from,
      date_to,
    });

    res.json({
      success    : true,
      data       : rows,
      pagination : {
        total,
        page       : Number(page),
        limit      : Number(limit),
        totalPages : Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("[AuditController] getLogs:", err.message);
    res.status(500).json(errorResponse("Failed to fetch audit logs", 500));
  }
};

// ── GET /api/audit/stats ──────────────────────────────────
const getStats = async (req, res) => {
  try {
    const stats = await AuditLog.getStats();
    res.json(successResponse(stats));
  } catch (err) {
    console.error("[AuditController] getStats:", err.message);
    res.status(500).json(errorResponse("Failed to fetch audit stats", 500));
  }
};

// ── GET /api/audit/export ─────────────────────────────────
// Streams a CSV file — no pagination limit.
const exportCsv = async (req, res) => {
  try {
    const { entity_type, action, user_username, date_from, date_to } = req.query;

    const rows = await AuditLog.exportAll({ entity_type, action, user_username, date_from, date_to });

    // Build CSV content
    const headers = ["id", "user_username", "entity_type", "entity_id", "action", "ip_address", "created_at"];
    const escape  = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
    };

    const lines = [
      headers.join(","),
      ...rows.map(r =>
        headers.map(h => escape(r[h])).join(",")
      ),
    ];

    const csv  = lines.join("\r\n");
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type",        "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="audit_log_${date}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error("[AuditController] exportCsv:", err.message);
    res.status(500).json(errorResponse("Failed to export audit logs", 500));
  }
};

// ── GET /api/audit/:id ────────────────────────────────────
const getById = async (req, res) => {
  try {
    const entry = await AuditLog.getById(req.params.id);
    if (!entry) return res.status(404).json(errorResponse("Audit log entry not found", 404));
    res.json(successResponse(entry));
  } catch (err) {
    console.error("[AuditController] getById:", err.message);
    res.status(500).json(errorResponse("Failed to fetch audit log entry", 500));
  }
};

module.exports = { getLogs, getStats, exportCsv, getById };
