// ─────────────────────────────────────────────────────────
//  models/AuditLog.js
//  CRUD + query for the `audit_logs` table.
//
//  Table schema (already exists in DB):
//    id            INT PK AUTO_INCREMENT
//    user_id       INT NULL
//    user_username VARCHAR(100)
//    entity_type   VARCHAR(50)   — 'book'|'student'|'faculty'|'transaction'|'attendance'|'lexora_book'|'auth'
//    entity_id     INT NULL
//    action        VARCHAR(20)   — 'CREATE'|'UPDATE'|'DELETE'|'RESTORE'|'BULK_IMPORT'
//                                  'LOGIN'|'LOGIN_FAILED'|'LOGOUT'
//                                  'BORROW'|'RETURN'
//                                  'CHECK_IN'|'CHECK_OUT'
//    old_data      JSON NULL
//    new_data      JSON NULL
//    ip_address    VARCHAR(45)
//    user_agent    TEXT
//    created_at    TIMESTAMP
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

const AuditLog = {
  // ── Insert a single audit entry ──────────────────────────
  async create({ user_id, user_username, entity_type, entity_id, action, old_data, new_data, ip_address, user_agent }) {
    const [result] = await pool.query(
      `INSERT INTO audit_logs
         (user_id, user_username, entity_type, entity_id, action, old_data, new_data, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id    ?? null,
        user_username,
        entity_type,
        entity_id  ?? null,
        action,
        old_data   ? JSON.stringify(old_data) : null,
        new_data   ? JSON.stringify(new_data) : null,
        ip_address ?? null,
        user_agent ?? null,
      ]
    );
    return result.insertId;
  },

  // ── Paginated + filtered query ───────────────────────────
  async getAll({ page = 1, limit = 50, entity_type, action, user_username, date_from, date_to, scope } = {}) {
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    const params     = [];

    if (entity_type)   { conditions.push("entity_type = ?");     params.push(entity_type); }
    if (action)        { conditions.push("action = ?");           params.push(action); }
    if (user_username) { conditions.push("user_username LIKE ?"); params.push(`%${user_username}%`); }
    if (date_from)     { conditions.push("created_at >= ?");      params.push(date_from); }
    if (date_to)       { conditions.push("created_at <= ?");      params.push(date_to + " 23:59:59"); }

    // School scope: records by the caller's school's users (system /
    // NULL-user actions are the legacy fallback — visible).
    if (scope && scope.scoped && scope.schoolId != null) {
      conditions.push(`(a.user_id IS NULL OR COALESCE(u.school_id, -1) IN (-1, ?))`);
      params.push(scope.schoolId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count query
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}`,
      params
    );
    const total = countRows[0].total;

    // Data query
    const [rows] = await pool.query(
      `SELECT a.id, a.user_id, a.user_username, a.entity_type, a.entity_id, a.action,
              a.old_data, a.new_data, a.ip_address, a.user_agent, a.created_at
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    return { rows, total };
  },

  // ── Fetch a single log entry by ID ───────────────────────
  async getById(id, scope = null) {
    const params = [id];
    let scopeSql = "";
    if (scope && scope.scoped && scope.schoolId != null) {
      scopeSql = " AND (a.user_id IS NULL OR COALESCE(u.school_id, -1) IN (-1, ?))";
      params.push(scope.schoolId);
    }
    const [rows] = await pool.query(
      `SELECT a.* FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.id = ?${scopeSql} LIMIT 1`,
      params
    );
    return rows[0] || null;
  },

  // ── Summary stats for the dashboard widget ───────────────
  async getStats(scope = null) {
    // School scope fragment on the acting user (NULL/system = legacy fallback).
    const scopeWhere = scope && scope.scoped && scope.schoolId != null
      ? " AND (a.user_id IS NULL OR COALESCE(u.school_id, -1) IN (-1, ?))"
      : "";
    const scopeParams = scope && scope.scoped && scope.schoolId != null ? [scope.schoolId] : [];
    const join = "FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE 1=1";

    const [actionBreakdown] = await pool.query(
      `SELECT a.action, COUNT(*) AS count
       ${join} ${scopeWhere}
       GROUP BY a.action
       ORDER BY count DESC`,
      scopeParams
    );

    const [entityBreakdown] = await pool.query(
      `SELECT a.entity_type, COUNT(*) AS count
       ${join} ${scopeWhere}
       GROUP BY a.entity_type
       ORDER BY count DESC`,
      scopeParams
    );

    const [recent7Days] = await pool.query(
      `SELECT DATE(a.created_at) AS day, COUNT(*) AS count
       ${join} ${scopeWhere} AND a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(a.created_at)
       ORDER BY day ASC`,
      scopeParams
    );

    const [totals] = await pool.query(
      `SELECT
         COUNT(*)                          AS total,
         SUM(a.action = 'CREATE')          AS creates,
         SUM(a.action = 'UPDATE')          AS updates,
         SUM(a.action = 'DELETE')          AS deletes,
         SUM(a.action = 'RESTORE')         AS restores,
         SUM(a.action = 'BULK_IMPORT')     AS bulk_imports,
         SUM(a.action = 'LOGIN')           AS logins,
         SUM(a.action = 'LOGIN_FAILED')    AS login_failures,
         SUM(a.action = 'LOGOUT')          AS logouts,
         SUM(a.action = 'BORROW')          AS borrows,
         SUM(a.action = 'RETURN')          AS returns,
         SUM(a.action = 'CHECK_IN')        AS check_ins,
         SUM(a.action = 'CHECK_OUT')       AS check_outs
       ${join} ${scopeWhere}`,
      scopeParams
    );

    return {
      totals:          totals[0],
      actionBreakdown,
      entityBreakdown,
      recent7Days,
    };
  },

  // ── Export: all rows matching filters (no pagination cap) ─
  async exportAll({ entity_type, action, user_username, date_from, date_to, scope } = {}) {
    const conditions = [];
    const params     = [];

    if (entity_type)   { conditions.push("a.entity_type = ?");     params.push(entity_type); }
    if (action)        { conditions.push("a.action = ?");           params.push(action); }
    if (user_username) { conditions.push("a.user_username LIKE ?"); params.push(`%${user_username}%`); }
    if (date_from)     { conditions.push("a.created_at >= ?");      params.push(date_from); }
    if (date_to)       { conditions.push("a.created_at <= ?");      params.push(date_to + " 23:59:59"); }
    if (scope && scope.scoped && scope.schoolId != null) {
      conditions.push("(a.user_id IS NULL OR COALESCE(u.school_id, -1) IN (-1, ?))");
      params.push(scope.schoolId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT a.id, a.user_id, a.user_username, a.entity_type, a.entity_id, a.action,
              a.old_data, a.new_data, a.ip_address, a.user_agent, a.created_at
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT 50000`,   // safety cap
      params
    );
    return rows;
  },

  // ── Purge records older than 1 year ─────────────────────
  async purgeOldRecords() {
    const [result] = await pool.query(
      "DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)"
    );
    return result.affectedRows;
  },
};

module.exports = AuditLog;