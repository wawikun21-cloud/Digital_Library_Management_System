const { pool } = require("../../config/db");

const TOOL_CATEGORIES = [
  "general",
  "education",
  "design",
  "templates",
  "software",
  "documents",
];

/** School-scope predicate (alias `t`): unassigned tools stay visible (legacy fallback). */
function scopeSql(scope) {
  if (!scope || !scope.scoped || scope.schoolId == null) return { sql: "", params: [] };
  return { sql: " AND (t.school_id IS NULL OR t.school_id = ?)", params: [scope.schoolId] };
}

async function listTools(filters = {}, userId, scope = null) {
  const { search, category, is_active, page = 1, limit = 20, sort = "created_at", order = "desc" } = filters;
  const offset = (page - 1) * limit;

  const allowedSort = {
    created_at: "t.created_at",
    title: "t.title",
    download_count: "t.download_count",
  };
  const sortColumn = allowedSort[sort] || "t.created_at";
  const sortDir = String(order).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const values = [];
  const countValues = [];
  let whereClause = "WHERE 1=1";

  if (search) {
    values.push(`%${search}%`);
    values.push(`%${search}%`);
    countValues.push(`%${search}%`);
    countValues.push(`%${search}%`);
    whereClause += " AND (t.title LIKE ? OR t.description LIKE ?)";
  }

  if (category) {
    values.push(category);
    countValues.push(category);
    whereClause += " AND t.category = ?";
  }

  if (is_active !== undefined && is_active !== null && is_active !== "") {
    const activeVal = is_active === "true";
    values.push(activeVal ? 1 : 0);
    countValues.push(activeVal ? 1 : 0);
    whereClause += " AND t.is_active = ?";
  }

  const scopeFragment = scopeSql(scope);
  whereClause += scopeFragment.sql;
  values.push(...scopeFragment.params);
  countValues.push(...scopeFragment.params);

  const sql = `
    SELECT
      t.id, t.title, t.description, t.thumbnail_url, t.file_path,
      t.file_size, t.file_type, t.category, t.is_active,
      t.created_by, t.created_at, t.updated_at,
      u.username AS creator_name
    FROM tools t
    LEFT JOIN users u ON t.created_by = u.id
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDir}
    LIMIT ? OFFSET ?
  `;

  const totalSql = `
    SELECT COUNT(*) AS total
    FROM tools t
    ${whereClause}
  `;

  // NOTE: pool.query() (not execute) — MySQL server-side prepared statements
  // reject this dynamic WHERE + LIMIT ? OFFSET ? combination with
  // ER_WRONG_ARGUMENTS. query() still escapes values from the array.
  const [rows] = await pool.query(sql, [...values, parseInt(limit, 10), offset]);
  const [countRows] = await pool.query(totalSql, countValues);

  return {
    data: rows,
    total: countRows[0]?.total || 0,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT t.*, u.username AS creator_name
     FROM tools t
     LEFT JOIN users u ON t.created_by = u.id
     WHERE t.id = ?`,
    [id]
  );
  return rows[0];
}

async function create(toolData) {
  const {
    title, description, thumbnail_url, file_path, file_size,
    file_type, category, is_active, created_by,
  } = toolData;

  const [result] = await pool.execute(
    `INSERT INTO tools
      (title, description, thumbnail_url, file_path, file_size, file_type, category, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description || null, thumbnail_url || null, file_path || null, file_size || 0, file_type || null, category || "general", is_active ? 1 : 0, created_by]
  );
  return result.insertId;
}

async function findById(id, scope = null) {
  const scopeFragment = scopeSql(scope);
  const [rows] = await pool.execute(
    `SELECT t.*, u.username AS creator_name
     FROM tools t
     LEFT JOIN users u ON t.created_by = u.id
     WHERE t.id = ?${scopeFragment.sql}`,
    [id, ...scopeFragment.params]
  );
  return rows[0];
}

async function create(toolData, scope = null) {
  const {
    title, description, thumbnail_url, file_path, file_size,
    file_type, category, is_active, created_by, school_id,
  } = toolData;

  // School assignment: a scoped caller's tools are pinned to their own
  // school ("first touch assigns" for legacy content).
  let schoolId = school_id ?? null;
  if (scope && scope.scoped && scope.schoolId != null) {
    if (schoolId != null && Number(schoolId) !== Number(scope.schoolId)) {
      return null;
    }
    schoolId = scope.schoolId;
  }

  const [result] = await pool.execute(
    `INSERT INTO tools
      (title, description, thumbnail_url, file_path, file_size, file_type, category, is_active, created_by, school_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description || null, thumbnail_url || null, file_path || null, file_size || 0, file_type || null, category || "general", is_active ? 1 : 0, created_by, schoolId]
  );
  return result.insertId;
}

async function update(id, updates, scope = null) {
  const allowedFields = ["title", "description", "thumbnail_url", "file_path", "file_size", "file_type", "category", "is_active", "created_by", "download_count", "school_id"];
  const fields = [];
  const values = [];

  for (const [key, val] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      let value = val;
      if (key === "is_active") value = val ? 1 : 0;
      // A scoped caller may only assign their own school.
      if (key === "school_id" && scope && scope.scoped && scope.schoolId != null) {
        if (value != null && Number(value) !== Number(scope.schoolId)) return false;
        value = scope.schoolId;
      }
      fields.push(`\`${key}\` = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return false;

  const scopeFragment = scopeSql(scope);
  values.push(id, ...scopeFragment.params);
  const [result] = await pool.execute(`UPDATE tools SET ${fields.join(", ")} WHERE id = ?${scopeFragment.sql}`, values);
  return result.affectedRows > 0;
}

async function remove(id, scope = null) {
  const scopeFragment = scopeSql(scope);
  const [result] = await pool.execute(`DELETE FROM tools WHERE id = ?${scopeFragment.sql}`, [id, ...scopeFragment.params]);
  return result.affectedRows > 0;
}

async function findByCategory(category) {
  const [rows] = await pool.execute(
    `SELECT id, title, description, thumbnail_url, file_type, file_size, category, download_count, created_at
     FROM tools
     WHERE category = ? AND is_active = TRUE
     ORDER BY created_at DESC`,
    [category]
  );
  return rows;
}

async function listCategories(activeOnly = false) {
  const sql = activeOnly
    ? `SELECT DISTINCT category FROM tools WHERE is_active = TRUE ORDER BY category ASC`
    : `SELECT DISTINCT category FROM tools ORDER BY category ASC`;
  const [rows] = await pool.query(sql);
  return rows.map(r => r.category);
}

async function incrementDownload(id) {
  await pool.execute("UPDATE tools SET download_count = COALESCE(download_count, 0) + 1 WHERE id = ?", [id]);
}

async function getStats() {
  const [rows] = await pool.execute(
    `SELECT
      COUNT(*) AS total_tools,
      COUNT(CASE WHEN is_active = TRUE THEN 1 END) AS active_tools,
      SUM(file_size) AS total_size,
      category,
      COUNT(*) AS category_count
     FROM tools
     GROUP BY category
     ORDER BY category_count DESC`
  );
  return rows;
}

module.exports = {
  listTools,
  findById,
  create,
  update,
  remove,
  findByCategory,
  listCategories,
  incrementDownload,
  getStats,
  TOOL_CATEGORIES,
};
