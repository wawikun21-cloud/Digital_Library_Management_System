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
  async getAll({ page = 1, limit = 50, entity_type, action, user_username, date_from, date_to } = {}) {
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    const params     = [];

    if (entity_type)   { conditions.push("entity_type = ?");     params.push(entity_type); }
    if (action)        { conditions.push("action = ?");           params.push(action); }
    if (user_username) { conditions.push("user_username LIKE ?"); params.push(`%${user_username}%`); }
    if (date_from)     { conditions.push("created_at >= ?");      params.push(date_from); }
    if (date_to)       { conditions.push("created_at <= ?");      params.push(date_to + " 23:59:59"); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count query
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_logs ${where}`,
      params
    );
    const total = countRows[0].total;

    // Data query
    const [rows] = await pool.query(
      `SELECT id, user_id, user_username, entity_type, entity_id, action,
              old_data, new_data, ip_address, user_agent, created_at
       FROM audit_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    return { rows, total };
  },

  // ── Fetch a single log entry by ID ───────────────────────
  async getById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM audit_logs WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  },

  // ── Summary stats for the dashboard widget ───────────────
  async getStats() {
    const [actionBreakdown] = await pool.query(
      `SELECT action, COUNT(*) AS count
       FROM audit_logs
       GROUP BY action
       ORDER BY count DESC`
    );

    const [entityBreakdown] = await pool.query(
      `SELECT entity_type, COUNT(*) AS count
       FROM audit_logs
       GROUP BY entity_type
       ORDER BY count DESC`
    );

    const [recent7Days] = await pool.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS count
       FROM audit_logs
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY day ASC`
    );

    const [totals] = await pool.query(
      `SELECT
         COUNT(*)                          AS total,
         SUM(action = 'CREATE')            AS creates,
         SUM(action = 'UPDATE')            AS updates,
         SUM(action = 'DELETE')            AS deletes,
         SUM(action = 'RESTORE')           AS restores,
         SUM(action = 'BULK_IMPORT')       AS bulk_imports,
         SUM(action = 'LOGIN')             AS logins,
         SUM(action = 'LOGIN_FAILED')      AS login_failures,
         SUM(action = 'LOGOUT')            AS logouts,
         SUM(action = 'BORROW')            AS borrows,
         SUM(action = 'RETURN')            AS returns,
         SUM(action = 'CHECK_IN')          AS check_ins,
         SUM(action = 'CHECK_OUT')         AS check_outs
       FROM audit_logs`
    );

    return {
      totals:          totals[0],
      actionBreakdown,
      entityBreakdown,
      recent7Days,
    };
  },

  // ── Export: all rows matching filters (no pagination cap) ─
  async exportAll({ entity_type, action, user_username, date_from, date_to } = {}) {
    const conditions = [];
    const params     = [];

    if (entity_type)   { conditions.push("entity_type = ?");     params.push(entity_type); }
    if (action)        { conditions.push("action = ?");           params.push(action); }
    if (user_username) { conditions.push("user_username LIKE ?"); params.push(`%${user_username}%`); }
    if (date_from)     { conditions.push("created_at >= ?");      params.push(date_from); }
    if (date_to)       { conditions.push("created_at <= ?");      params.push(date_to + " 23:59:59"); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT id, user_id, user_username, entity_type, entity_id, action,
              old_data, new_data, ip_address, user_agent, created_at
       FROM audit_logs
       ${where}
       ORDER BY created_at DESC
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