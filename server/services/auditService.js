// ─────────────────────────────────────────────────────────
//  services/auditService.js
//
//  Single public function: logAction(req, payload)
//  • Extracts user identity from req.session.user
//  • Extracts IP + User-Agent from req
//  • Persists to audit_logs via AuditLog model
//  • Broadcasts "audit:new" to admin-only WS clients
//
//  Usage in any controller:
//    const auditService = require("../services/auditService");
//    await auditService.logAction(req, {
//      entity_type : "book",
//      entity_id   : book.id,
//      action      : "CREATE",       // CREATE | UPDATE | DELETE | RESTORE | BULK_IMPORT
//      old_data    : null,           // snapshot BEFORE change (null for CREATE)
//      new_data    : bookData,       // snapshot AFTER change  (null for DELETE)
//    });
// ─────────────────────────────────────────────────────────

const AuditLog = require("../models/AuditLog");

/**
 * Extract the real client IP from common proxy headers.
 * Works behind Nginx / Caddy / Cloudflare.
 */
function extractIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? req.ip ?? null;
}

/**
 * Log a significant action and push a real-time notification
 * to all admin-authenticated WebSocket clients.
 *
 * Never throws — audit failure must NEVER break the main request.
 *
 * @param {import("express").Request} req
 * @param {{ entity_type: string, entity_id?: number|null, action: string, old_data?: any, new_data?: any }} payload
 * @returns {Promise<number|null>} inserted log ID, or null on error
 */
async function logAction(req, { entity_type, entity_id = null, action, old_data = null, new_data = null }) {
  try {
    const user = req.session?.user ?? {};

    const logId = await AuditLog.create({
      user_id       : user.id       ?? null,
      user_username : user.username ?? "system",
      entity_type,
      entity_id,
      action,
      old_data,
      new_data,
      ip_address    : extractIp(req),
      user_agent    : req.headers["user-agent"] ?? null,
    });

    // Build a lightweight event payload (no full old/new data blobs in WS msg)
    const eventPayload = {
      id            : logId,
      user_username : user.username ?? "system",
      entity_type,
      entity_id,
      action,
      created_at    : new Date().toISOString(),
    };

    // Broadcast to admin-only clients — lazy-require avoids circular deps
    try {
      const { broadcastToAdmins } = require("../utils/websocket");
      broadcastToAdmins("audit:new", eventPayload);
    } catch (_) {
      // WS not initialised yet (early startup) — silently skip
    }

    return logId;
  } catch (err) {
    // Log to server console but NEVER propagate — auditing is non-blocking
    console.error("[AuditService] Failed to log action:", err.message);
    return null;
  }
}

module.exports = { logAction };
