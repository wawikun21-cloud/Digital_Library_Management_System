const { pool } = require('../../config/db');

async function listContent(moduleId, filters = {}) {
  const { search, type, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM module_content WHERE module_id = ? AND is_deleted = FALSE';
  const params = [moduleId];

  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  sql += ' ORDER BY order_index ASC, id ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT * FROM module_content WHERE id = ? AND is_deleted = FALSE LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create(contentData) {
  const {
    module_id, title, type, description, order_index, url, duration, is_required, allow_access_after
  } = contentData;

  const [result] = await pool.query(
    `INSERT INTO module_content (
      module_id, title, type, description, order_index, url, duration, is_required, allow_access_after
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      module_id,
      title,
      type || 'reading',
      description ?? null,
      order_index ?? 0,
      url ?? null,
      duration ?? null,
      is_required ?? true,
      allow_access_after ?? null,
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = ['title', 'type', 'description', 'order_index', 'url', 'duration', 'is_required', 'allow_access_after'];
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
    `UPDATE module_content SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`,
    params
  );
  return result.affectedRows;
}

async function softDelete(id) {
  const [result] = await pool.query(
    'UPDATE module_content SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
  return result.affectedRows;
}

module.exports = {
  listContent,
  findById,
  create,
  update,
  softDelete,
};
