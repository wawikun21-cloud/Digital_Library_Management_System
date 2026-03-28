// ─────────────────────────────────────────────────────────
//  models/User.js
//  User Model — Simple session-based auth (no JWT)
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");
const bcrypt   = require("bcryptjs");

const User = {
  /**
   * Find a user by username
   */
  async findByUsername(username) {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    return rows[0] || null;
  },

  /**
   * Find a user by ID
   */
  async findById(id) {
    const [rows] = await pool.query(
      "SELECT id, username, role, created_at FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Create a new user (hashes password automatically)
   */
  async create({ username, password, role = "admin" }) {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, hashed, role]
    );
    return { id: result.insertId, username, role };
  },

  /**
   * Verify plain password against stored hash
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },
};

module.exports = User;