const { pool } = require("../../config/db");
const bcrypt = require("bcryptjs");

const SAFE_COLUMNS = [
  "id", "username", "password", "role", "avatar_url", "created_at", "updated_at",
  "is_active", "full_name", "email", "position_title", "employee_id",
  "contact_number", "date_hired", "birthdate", "address", "employment_status",
  "student_id_number",
  // School organization scope
  "school_id", "department_id",
  // Student profile fields (students table retired — students are users)
  "student_course", "student_yr_level", "student_school_year",
  "student_email", "student_contact",
  "senior_high_school", "strand", "school_address",
  "must_change_password",
];

function selectSafe(prefix = "u") {
  return SAFE_COLUMNS.filter((c) => c !== "password").map((c) => `${prefix}.${c}`);
}

async function listUsers(filters = {}, scope = null) {
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
  // The Users page manages staff accounts exclusively — students are
  // managed on the Students page, so the list excludes them by default.
  if (filters.exclude_role) {
    conditions.push("role != ?");
    params.push(filters.exclude_role);
  }
  if (is_active !== undefined && is_active !== null && is_active !== "") {
    conditions.push("is_active = ?");
    params.push(Number(is_active));
  }
  if (search) {
    conditions.push("(username LIKE ? OR full_name LIKE ? OR email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  // School scope: admin/librarian/staff only ever see their own school.
  if (scope && scope.scoped && scope.schoolId != null) {
    conditions.push("school_id = ?");
    params.push(scope.schoolId);
  }

  const where = conditions.join(" AND ");

  const [rows] = await pool.query(
    `SELECT ${selectSafe().join(", ")},
            s.name AS school_name,
            d.name AS department_name
     FROM users u
     LEFT JOIN schools     s ON s.id = u.school_id
     LEFT JOIN departments d ON d.id = u.department_id
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
    `SELECT ${selectSafe().join(", ")},
            s.name AS school_name,
            d.name AS department_name
     FROM users u
     LEFT JOIN schools     s ON s.id = u.school_id
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.id = ?`,
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
    school_id, department_id,
    student_course, student_yr_level, student_school_year,
    student_email, student_contact,
    senior_high_school, strand, school_address,
    must_change_password,
  } = userData;

  const hashed = await bcrypt.hash(password, 10);

  const [result] = await pool.query(
    `INSERT INTO users
       (username, password, role, full_name, email, position_title, employee_id,
        contact_number, date_hired, birthdate, address, employment_status,
        student_id_number, avatar_url, is_active, created_at, updated_at,
        school_id, department_id,
        student_course, student_yr_level, student_school_year,
        student_email, student_contact,
        senior_high_school, strand, school_address, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW(),
             ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      username, hashed, role, full_name ?? null, email ?? null, position_title ?? null,
      employee_id ?? null, contact_number ?? null, date_hired ?? null, birthdate ?? null,
      address ?? null, employment_status ?? "Regular", student_id_number ?? null, avatar_url ?? null,
      school_id ?? null, department_id ?? null,
      student_course ?? null, student_yr_level ?? null, student_school_year ?? null,
      student_email ?? null, student_contact ?? null,
      senior_high_school ?? null, strand ?? null, school_address ?? null,
      must_change_password ? 1 : 0,
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

async function getStats(scope = null) {
  const conditions = [];
  const params = [];
  if (scope && scope.scoped && scope.schoolId != null) {
    conditions.push("school_id = ?");
    params.push(scope.schoolId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT role, COUNT(*) AS count,
            SUM(is_active = 1) AS active,
            SUM(is_active = 0) AS inactive
     FROM users
     ${where}
     GROUP BY role
     ORDER BY role`,
    params
  );
  return rows;
}

// ─────────────────────────────────────────────────────────
//  Student users (students table retired — students are
//  users with role = 'student'). All queries are school-scoped
//  exactly like listUsers.
// ─────────────────────────────────────────────────────────

const STUDENT_USER_FIELDS = `
  u.id, u.username, u.full_name, u.full_name AS student_name, u.role, u.is_active, u.avatar_url,
  u.student_id_number, u.student_course, u.student_yr_level, u.student_school_year,
  u.student_email, u.student_contact, u.senior_high_school, u.strand, u.school_address,
  u.school_id, u.department_id, u.must_change_password,
  u.created_at, u.updated_at,
  s.name  AS school_name,
  d.name  AS department_name
`;

async function listStudentUsers(filters = {}, scope = null) {
  const {
    search, is_active, page = 1, limit = 20, sort = "created_at", order = "desc",
  } = filters;
  const offset = (page - 1) * limit;

  const allowedSort = ["created_at", "updated_at", "full_name", "student_id_number", "is_active"];
  const sortCol = allowedSort.includes(sort) ? sort : "created_at";
  const sortDir = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const conditions = ["u.role = 'student'"];
  const params = [];

  if (is_active !== undefined && is_active !== null && is_active !== "") {
    conditions.push("u.is_active = ?");
    params.push(Number(is_active));
  }
  if (search) {
    conditions.push("(u.username LIKE ? OR u.full_name LIKE ? OR u.student_id_number LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (scope && scope.scoped && scope.schoolId != null) {
    conditions.push("u.school_id = ?");
    params.push(scope.schoolId);
  }

  const where = conditions.join(" AND ");

  const [rows] = await pool.query(
    `SELECT ${STUDENT_USER_FIELDS}
     FROM users u
     LEFT JOIN schools s     ON s.id = u.school_id
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE ${where}
     ORDER BY u.${sortCol} ${sortDir}
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
    params
  );

  return { data: rows, total: countRows[0]?.total ?? 0 };
}

async function findStudentUserById(id, scope = null) {
  const params = [id];
  let scopeSql = "";
  if (scope && scope.scoped && scope.schoolId != null) {
    scopeSql = "AND u.school_id = ?";
    params.push(scope.schoolId);
  }
  const [rows] = await pool.query(
    `SELECT ${STUDENT_USER_FIELDS}
     FROM users u
     LEFT JOIN schools s     ON s.id = u.school_id
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.id = ? AND u.role = 'student' ${scopeSql}
     LIMIT 1`,
    params
  );
  return rows[0] || null;
}

/**
 * Lookup for the kiosk: returns the student user INCLUDING school_id /
 * department_id so the caller can apply the fail-closed check-in rule.
 */
async function findStudentUserByStudentId(studentIdNumber) {
  const [rows] = await pool.query(
    `SELECT ${STUDENT_USER_FIELDS}
     FROM users u
     LEFT JOIN schools s     ON s.id = u.school_id
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.student_id_number = ? AND u.role = 'student'
     LIMIT 1`,
    [studentIdNumber]
  );
  return rows[0] || null;
}

async function findStudentUsersByStudentId(studentIdNumber, scope = null) {
  const params = [`%${studentIdNumber}%`, `%${studentIdNumber}%`, `%${studentIdNumber}%`];
  let scopeSql = "";
  if (scope && scope.scoped && scope.schoolId != null) {
    scopeSql = "AND (u.school_id = ? OR u.school_id IS NULL)";
    params.push(scope.schoolId);
  }
  const [rows] = await pool.query(
    `SELECT ${STUDENT_USER_FIELDS}
     FROM users u
     LEFT JOIN schools s     ON s.id = u.school_id
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.role = 'student' AND u.is_active = 1
       AND (u.student_id_number LIKE ? OR u.full_name LIKE ? OR u.username LIKE ?)
       ${scopeSql}
     ORDER BY u.full_name ASC
     LIMIT 10`,
    params
  );
  return rows;
}

async function getStudentStats(scope = null) {
  const conditions = ["u.role = 'student'"];
  const params = [];
  if (scope && scope.scoped && scope.schoolId != null) {
    conditions.push("u.school_id = ?");
    params.push(scope.schoolId);
  }
  const where = conditions.join(" AND ");

  const [total] = await pool.query(
    `SELECT COUNT(*) AS count FROM users u WHERE ${where} AND u.is_active = 1`, params
  );
  const [byCourse] = await pool.query(
    `SELECT u.student_course, COUNT(*) AS count FROM users u
     WHERE ${where} AND u.is_active = 1 AND u.student_course IS NOT NULL AND u.student_course != ''
     GROUP BY u.student_course ORDER BY count DESC`, params
  );
  const [byYearLevel] = await pool.query(
    `SELECT u.student_yr_level, COUNT(*) AS count FROM users u
     WHERE ${where} AND u.is_active = 1 AND u.student_yr_level IS NOT NULL AND u.student_yr_level != ''
     GROUP BY u.student_yr_level ORDER BY count DESC`, params
  );
  const [bySchoolYear] = await pool.query(
    `SELECT u.student_school_year, COUNT(*) AS count FROM users u
     WHERE ${where} AND u.is_active = 1 AND u.student_school_year IS NOT NULL AND u.student_school_year != ''
     GROUP BY u.student_school_year ORDER BY u.student_school_year DESC`, params
  );

  return { total: total[0].count, byCourse, byYearLevel, bySchoolYear };
}

async function findByStudentIdNumber(studentIdNumber) {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE student_id_number = ? LIMIT 1",
    [studentIdNumber]
  );
  return rows[0] || null;
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
  // Student users
  listStudentUsers,
  findStudentUserById,
  findStudentUserByStudentId,
  findStudentUsersByStudentId,
  getStudentStats,
  findByStudentIdNumber,
};
