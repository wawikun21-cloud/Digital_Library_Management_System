const { pool } = require("../../config/db");
const bcrypt = require("bcryptjs");

const SAFE_COLUMNS = [
  "id", "username", "password", "role", "avatar_url", "created_at", "updated_at",
  "is_active", "full_name", "email", "position_title", "employee_id",
  "contact_number", "date_hired", "birthdate", "address", "employment_status",
  "student_id_number",
];

function selectSafe(prefix = "u") {
  return SAFE_COLUMNS.filter((c) => c !== "password").map((c) => `${prefix}.${c}`);
}

async function listUsers(filters = {}) {
  const {
    search, role, is_active, page = 1, limit = 20, sort = "created_at", order = "desc",
  } = filters;
  const offset = (page - 1) * limit;

  const allowedSort = SAFE_COLUMNS;
  const sortCol = allowedSort.includes(sort) ? sort : "created_at";
  const sortDir = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const conditions = ["1=1"];
  const params = [];

  if (role) {
    conditions.push("role = ?");
    params.push(role);
  }
  if (is_active !== undefined && is_active !== null && is_active !== "") {
    conditions.push("is_active = ?");
    params.push(Number(is_active));
  }
  if (search) {
    conditions.push("(username LIKE ? OR full_name LIKE ? OR email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = conditions.join(" AND ");

  const [rows] = await pool.query(
    `SELECT ${selectSafe().join(", ")}
     FROM users u
     WHERE ${where}
     ORDER BY ${sortCol} ${sortDir}
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
    params
  );

  return { data: rows, total: countRows[0]?.total ?? 0 };
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${selectSafe().join(", ")} FROM users u WHERE u.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findByUsername(username) {
  const [rows] = await pool.query(
    `SELECT ${selectSafe().join(", ")} FROM users u WHERE u.username = ?`,
    [username]
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await pool.query(
    `SELECT ${selectSafe().join(", ")} FROM users u WHERE u.email = ?`,
    [email]
  );
  return rows[0] || null;
}

async function create(userData) {
  const {
    username, password, role = "student", full_name, email, position_title,
    employee_id, contact_number, date_hired, birthdate, address,
    employment_status, student_id_number, avatar_url,
  } = userData;

  const hashed = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO users
       (username, password, role, full_name, email, position_title, employee_id,
        contact_number, date_hired, birthdate, address, employment_status,
        student_id_number, avatar_url, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [
      username, hashed, role, full_name ?? null, email ?? null, position_title ?? null,
      employee_id ?? null, contact_number ?? null, date_hired ?? null, birthdate ?? null,
      address ?? null, employment_status ?? null, student_id_number ?? null, avatar_url ?? null,
    ]
  );
  return { id: result.insertId };
}

async function update(id, updates) {
  const allowed = SAFE_COLUMNS.filter((c) => c !== "id" && c !== "created_at" && c !== "password");
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${key} = ?`);
      params.push(updates[key] ?? null);
    }
  }

  if (updates.password) {
    sets.push("password = ?");
    params.push(await bcrypt.hash(updates.password, 10));
  }

  if (!sets.length) return 0;
  params.push(id);

  const [result] = await pool.query(
    `UPDATE users SET ${sets.join(", ")}, updated_at = NOW() WHERE id = ?`,
    params
  );
  return result.affectedRows;
}

async function updateRole(id, newRole, changedBy, reason) {
  const [result] = await pool.query(
    "UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?",
    [newRole, id]
  );

  if (result.affectedRows > 0) {
    const [old] = await pool.query("SELECT role FROM users WHERE id = ?", [id]);
    const currentRole = old[0]?.role ?? null;
    await pool.query(
      `INSERT INTO user_role_history (user_id, old_role, new_role, changed_by, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [id, currentRole, newRole, changedBy ?? null, reason ?? null]
    );
  }

  return result.affectedRows;
}

async function deactivate(id) {
  const [result] = await pool.query(
    "UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?",
    [id]
  );
  return result.affectedRows;
}

async function reactivate(id) {
  const [result] = await pool.query(
    "UPDATE users SET is_active = 1, updated_at = NOW() WHERE id = ? AND is_active = 0",
    [id]
  );
  return result.affectedRows;
}

async function getStats() {
  const [rows] = await pool.query(
    `SELECT role, COUNT(*) AS count,
            SUM(is_active = 1) AS active,
            SUM(is_active = 0) AS inactive
     FROM users
     GROUP BY role
     ORDER BY role`
  );
  return rows;
}

module.exports = {
  SAFE_COLUMNS,
  selectSafe,
  listUsers,
  findById,
  findByUsername,
  findByEmail,
  create,
  update,
  updateRole,
  deactivate,
  reactivate,
  getStats,
};
