// ─────────────────────────────────────────────────────────
//  models/User.js
//  User Model — Simple session-based auth (no JWT)
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");
const bcrypt   = require("bcryptjs");

const User = {
  async findByUsername(username) {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT id, username, role, avatar_url, created_at,
              full_name, is_active,
              school_id, department_id, must_change_password
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ username, password, role = "admin" }) {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, hashed, role]
    );
    return { id: result.insertId, username, role };
  },

  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  /**
   * Update profile: username, password (optional), avatar_url (optional)
   * Returns the updated user row (no password).
   */
  async updateProfile(id, { username, password, avatar_url }) {
    // Build dynamic SET clause
    const fields = [];
    const values = [];

    if (username !== undefined) {
      fields.push("username = ?");
      values.push(username.trim());
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      fields.push("password = ?");
      values.push(hashed);
      // A self-service password change satisfies the must-change prompt.
      fields.push("must_change_password = 0");
    }
    if (avatar_url !== undefined) {
      fields.push("avatar_url = ?");
      values.push(avatar_url);
    }

    if (fields.length === 0) throw new Error("No fields to update");

    values.push(id);
    await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return User.findById(id);
  },
};

module.exports = User;