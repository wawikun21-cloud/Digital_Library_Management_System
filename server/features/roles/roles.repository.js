// ─────────────────────────────────────────────────────────
//  features/roles/roles.repository.js
//  All SQL for the granular permission system.
//  Controllers and guards never write SQL here — they call this
//  module, and this module only.
// ─────────────────────────────────────────────────────────

const { pool } = require("../../config/db");
const { PERMISSION_CATALOG, ENTITY_TYPES } = require("./permissionCatalog");

// entity_type → table + display column + visibility rule.
const ENTITY_SOURCES = {
  users:        { table: "users",        column: "username", where: "is_active = 1" },
  books:        { table: "books",        column: "title",    where: "is_deleted = 0" },
  lexora_books: { table: "lexora_books", column: "title",    where: "is_deleted = 0" },
  courses:      { table: "courses",      column: "title",    where: "is_deleted = 0" },
  tools:        { table: "tools",        column: "title",    where: "is_active = 1" },
};

const LIST_LIMIT = 200;
const SEARCH_LIMIT = 50;

function jsonParam(value) {
  return value === null || value === undefined ? null : JSON.stringify(value);
}

const RolesRepository = {
  // ── Roles ────────────────────────────────────────────────
  async listRoles() {
    const [rows] = await pool.query(`
      SELECT r.name, r.display_name, r.description,
        (SELECT COUNT(*) FROM role_permissions rp WHERE rp.role_name = r.name) AS permission_count,
        (SELECT COUNT(*) FROM users u WHERE u.role = r.name)                  AS user_count
      FROM roles r
      ORDER BY FIELD(r.name, 'super_admin', 'admin', 'librarian', 'staff', 'student')
    `);
    return rows;
  },

  async findRoleByName(name) {
    const [rows] = await pool.query(
      "SELECT name, display_name, description FROM roles WHERE name = ? LIMIT 1",
      [name]
    );
    return rows[0] || null;
  },

  async insertRole({ name, display_name, description, is_system }) {
    await pool.query(
      "INSERT INTO roles (name, display_name, description, is_system) VALUES (?, ?, ?, ?)",
      [name, display_name, description || null, is_system ? 1 : 0]
    );
  },

  async updateRoleMeta(name, fields) {
    const sets = [];
    const params = [];
    for (const [column, value] of Object.entries(fields)) {
      sets.push(`${column} = ?`);
      params.push(value);
    }
    if (!sets.length) return;
    params.push(name);
    await pool.query(`UPDATE roles SET ${sets.join(", ")} WHERE name = ?`, params);
  },

  async deleteRole(name) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Grants must go with the role, or they are re-applied to a future role
      // that reuses the name.
      await conn.query("DELETE FROM role_permissions WHERE role_name = ?", [name]);
      await conn.query("DELETE FROM roles WHERE name = ?", [name]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async countUsersWithRole(roleName) {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS n FROM users WHERE role = ? AND is_active = 1",
      [roleName]
    );
    return Number(rows[0]?.n || 0);
  },

  // ── Permissions ──────────────────────────────────────────
  async listPermissions() {
    const [rows] = await pool.query(
      `SELECT name, display_name, category, actions, is_active
       FROM permissions
       ORDER BY FIELD(category,
         'dashboard','reports','books','lexora','transactions','trash','audit',
         'attendance','students','faculty','rfid','courses','users','settings','tools','roles'),
         name`
    );
    return rows;
  },

  async findPermissionByName(name) {
    const [rows] = await pool.query(
      "SELECT name, display_name, category, actions, is_active FROM permissions WHERE name = ? LIMIT 1",
      [name]
    );
    return rows[0] || null;
  },

  // ── Role grants ──────────────────────────────────────────
  async getRoleGrants(roleName) {
    const [rows] = await pool.query(
      "SELECT permission_name, actions FROM role_permissions WHERE role_name = ?",
      [roleName]
    );
    return rows;
  },

  async replaceRoleGrants(roleName, grantedBy, grants) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM role_permissions WHERE role_name = ?", [roleName]);
      for (const grant of grants) {
        await conn.query(
          `INSERT INTO role_permissions (role_name, permission_name, actions, granted_by)
           VALUES (?, ?, ?, ?)`,
          [roleName, grant.permission_name, jsonParam(grant.actions), grantedBy ?? null]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // ── User overrides ───────────────────────────────────────
  async getUserOverrides(userId) {
    const [rows] = await pool.query(
      "SELECT permission_name, granted, actions FROM user_permission_overrides WHERE user_id = ?",
      [userId]
    );
    return rows;
  },

  async replaceUserOverrides(userId, updatedBy, overrides) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM user_permission_overrides WHERE user_id = ?", [userId]);
      for (const override of overrides) {
        await conn.query(
          `INSERT INTO user_permission_overrides (user_id, permission_name, granted, actions, updated_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            override.permission_name,
            override.granted ? 1 : 0,
            jsonParam(override.actions),
            updatedBy ?? null,
          ]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // ── Entity overrides (user-level) ────────────────────────
  async getUserEntityOverrides(userId) {
    const [rows] = await pool.query(
      "SELECT entity_type, entity_id, granted FROM entity_permission_overrides WHERE user_id = ?",
      [userId]
    );
    return rows;
  },

  async replaceUserEntityOverrides(userId, updatedBy, rows) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM entity_permission_overrides WHERE user_id = ?", [userId]);
      for (const row of rows) {
        await conn.query(
          `INSERT INTO entity_permission_overrides (user_id, entity_type, entity_id, granted, updated_by)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, row.entity_type, row.entity_id, row.granted ? 1 : 0, updatedBy ?? null]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // ── Entity permissions (role-level) ──────────────────────
  async getRoleEntityPermissions(roleName) {
    const [rows] = await pool.query(
      "SELECT entity_type, entity_id, granted FROM role_entity_permissions WHERE role_name = ?",
      [roleName]
    );
    return rows;
  },

  async replaceRoleEntityPermissions(roleName, updatedBy, rows) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM role_entity_permissions WHERE role_name = ?", [roleName]);
      for (const row of rows) {
        await conn.query(
          `INSERT INTO role_entity_permissions (role_name, entity_type, entity_id, granted, updated_by)
           VALUES (?, ?, ?, ?, ?)`,
          [roleName, row.entity_type, row.entity_id, row.granted ? 1 : 0, updatedBy ?? null]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * Replace a user's permission overrides and entity overrides in one
   * transaction so the drawer can never persist a half-saved state.
   * `newRole` (optional) changes the user's role in the same transaction.
   */
  async saveUserFull(userId, updatedBy, overrides, entityRows, newRole = null) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (newRole) {
        await conn.query("UPDATE users SET role = ? WHERE id = ?", [newRole, userId]);
      }

      await conn.query("DELETE FROM user_permission_overrides WHERE user_id = ?", [userId]);
      for (const override of overrides) {
        await conn.query(
          `INSERT INTO user_permission_overrides (user_id, permission_name, granted, actions, updated_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            override.permission_name,
            override.granted ? 1 : 0,
            jsonParam(override.actions),
            updatedBy ?? null,
          ]
        );
      }

      await conn.query("DELETE FROM entity_permission_overrides WHERE user_id = ?", [userId]);
      for (const row of entityRows) {
        await conn.query(
          `INSERT INTO entity_permission_overrides (user_id, entity_type, entity_id, granted, updated_by)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, row.entity_type, row.entity_id, row.granted ? 1 : 0, updatedBy ?? null]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // ── Users (for the specific-user editor target) ──────────
  async findUserById(id) {
    const [rows] = await pool.query(
      "SELECT id, username, role, full_name, is_active FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  },

  // ── Entity lookup ────────────────────────────────────────
  /**
   * List entities of a type, optionally filtered by a search term.
   * Returns [{ id, title }] so the UI never sees raw table rows.
   */
  async listEntities(entityType, search = "") {
    const source = ENTITY_SOURCES[entityType];
    if (!source) return [];

    const params = [];
    let where = source.where;
    const term = String(search || "").trim();
    if (term) {
      where += ` AND ${source.column} LIKE ?`;
      params.push(`%${term}%`);
    }

    const [rows] = await pool.query(
      `SELECT id, ${source.column} AS title
       FROM ${source.table}
       WHERE ${where}
       ORDER BY ${source.column} ASC
       LIMIT ${term ? SEARCH_LIMIT : LIST_LIMIT}`,
      params
    );
    return rows;
  },

  // ── Guard resolution (per-request, no transaction) ───────
  async resolveRoleGrants(roleName) {
    return this.getRoleGrants(roleName);
  },

  async resolveDefinedPermissions() {
    return pool.query(
      "SELECT name, actions, is_active FROM permissions WHERE is_active = 1"
    ).then(([rows]) => rows);
  },

  async resolveUserOverrides(userId) {
    return this.getUserOverrides(userId);
  },

  async resolveUserEntityOverrides(userId) {
    return this.getUserEntityOverrides(userId);
  },

  async resolveRoleEntityPermissions(roleName) {
    return this.getRoleEntityPermissions(roleName);
  },
};

module.exports = RolesRepository;
module.exports.ENTITY_TYPES = ENTITY_TYPES;
module.exports.ENTITY_SOURCES = ENTITY_SOURCES;
module.exports.PERMISSION_CATALOG = PERMISSION_CATALOG;
