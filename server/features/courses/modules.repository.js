const { pool } = require('../../config/db');

async function listModules(courseId, filters = {}) {
  const { search, type, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT cm.*, COUNT(DISTINCT mc.id) AS content_count
    FROM course_modules cm
    LEFT JOIN module_content mc ON cm.id = mc.module_id AND mc.is_deleted = FALSE
    WHERE cm.course_id = ? AND cm.is_deleted = FALSE
  `;
  const params = [courseId];

  if (search) {
    sql += ' AND (cm.title LIKE ? OR cm.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (type) {
    sql += ' AND cm.type = ?';
    params.push(type);
  }

  sql += ' GROUP BY cm.id ORDER BY cm.order_index ASC, cm.id ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM course_modules WHERE id = ? AND is_deleted = FALSE LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create(moduleData) {
  const { course_id, title, description, type, order_index, release_date, due_date, is_graded, max_score, is_visible } = moduleData;

  const [result] = await pool.query(
    `INSERT INTO course_modules (
      course_id, title, description, type, order_index, release_date, due_date, is_graded, max_score, is_visible
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      course_id,
      title,
      description ?? null,
      type || 'chapter',
      order_index ?? 0,
      release_date ?? null,
      due_date ?? null,
      is_graded ?? false,
      max_score ?? null,
      is_visible ?? true,
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = ['title', 'description', 'type', 'order_index', 'release_date', 'due_date', 'is_graded', 'max_score', 'is_visible'];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      sets.push(`${key} = ?`);
      params.push(updates[key]);
    }
  }

  if (!sets.length) return 0;
  params.push(id);

  const [result] = await pool.query(
    `UPDATE course_modules SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`,
    params
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await pool.query(
    'UPDATE course_modules SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows;
}

module.exports = {
  listModules,
  findById,
  create,
  update,
  softDelete,
};
