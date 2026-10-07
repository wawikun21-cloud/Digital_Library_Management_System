const { pool } = require('../../config/db');

const COURSE_STATUSES = ['draft', 'published', 'archived', 'under_review'];
const COURSE_DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'all_levels'];

async function listCourses(filters = {}) {
  const { search, status, category, difficulty, instructor_id, page = 1, limit = 20, sort, order } = filters;
  const offset = (page - 1) * limit;

  const allowedSort = {
    created_at: 'c.created_at',
    title: 'c.title',
    enrollment_count: 'enrollment_count',
  };
  const sortColumn = allowedSort[sort] || 'c.created_at';
  const sortDir = String(order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let sql = `
    SELECT 
      c.id, c.title, c.description, c.category, c.difficulty, c.status,
      c.instructor_id, c.thumbnail_url, c.max_enrollments, c.start_date, c.end_date,
      c.grading_scale, c.allow_self_enrollment, c.send_completion_certificates,
      c.created_at, c.updated_at,
      u.username AS instructor_name,
      COUNT(DISTINCT e.id) AS enrollment_count,
      COUNT(DISTINCT m.id) AS module_count
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN course_enrollments e ON c.id = e.course_id AND e.status = 'active' AND e.is_deleted = FALSE
    LEFT JOIN course_modules m ON c.id = m.course_id AND m.is_deleted = FALSE
    WHERE c.is_deleted = FALSE
  `;
  const params = [];

  if (status) {
    sql += ' AND c.status = ?';
    params.push(status);
  }
  if (instructor_id) {
    sql += ' AND c.instructor_id = ?';
    params.push(instructor_id);
  }
  if (search) {
    sql += ' AND (c.title LIKE ? OR c.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    sql += ' AND c.category = ?';
    params.push(category);
  }
  if (difficulty) {
    sql += ' AND c.difficulty = ?';
    params.push(difficulty);
  }

  sql += ` GROUP BY c.id ORDER BY ${sortColumn} ${sortDir} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function countCourses(filters = {}) {
  const { search, status, category, difficulty, instructor_id } = filters;

  let sql = 'SELECT COUNT(*) AS total FROM courses c WHERE c.is_deleted = FALSE';
  const params = [];

  if (status) {
    sql += ' AND c.status = ?';
    params.push(status);
  }
  if (instructor_id) {
    sql += ' AND c.instructor_id = ?';
    params.push(instructor_id);
  }
  if (search) {
    sql += ' AND (c.title LIKE ? OR c.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    sql += ' AND c.category = ?';
    params.push(category);
  }
  if (difficulty) {
    sql += ' AND c.difficulty = ?';
    params.push(difficulty);
  }

  const [[row]] = await pool.query(sql, params);
  return row?.total ?? 0;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT c.*, u.username AS instructor_name
     FROM courses c
     LEFT JOIN users u ON c.instructor_id = u.id
     WHERE c.id = ? AND c.is_deleted = FALSE
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create(courseData) {
  const {
    title, description, category, difficulty, instructor_id, thumbnail_url,
    prerequisites, learning_outcomes, max_enrollments, start_date, end_date,
    grading_scale, allow_self_enrollment, send_completion_certificates, status
  } = courseData;

  const [result] = await pool.query(
    `INSERT INTO courses (
      title, description, category, difficulty, status, instructor_id, thumbnail_url,
      prerequisites, learning_outcomes, max_enrollments, start_date, end_date,
      grading_scale, allow_self_enrollment, send_completion_certificates
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      description ?? null,
      category ?? null,
      difficulty || 'beginner',
      status || 'draft',
      instructor_id ?? null,
      thumbnail_url ?? null,
      prerequisites ? JSON.stringify(prerequisites) : null,
      learning_outcomes ? JSON.stringify(learning_outcomes) : null,
      max_enrollments ?? null,
      start_date ?? null,
      end_date ?? null,
      grading_scale || 'STANDARD',
      allow_self_enrollment ?? true,
      send_completion_certificates ?? false,
    ]
  );
  return result.insertId;
}

async function update(id, updates) {
  const allowed = [
    'title', 'description', 'category', 'difficulty', 'status', 'instructor_id',
    'thumbnail_url', 'prerequisites', 'learning_outcomes', 'max_enrollments',
    'start_date', 'end_date', 'grading_scale', 'allow_self_enrollment',
    'send_completion_certificates'
  ];

  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      let value = updates[key];
      if ((key === 'prerequisites' || key === 'learning_outcomes') && value && typeof value === 'object') {
        value = JSON.stringify(value);
      }
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (!sets.length) return 0;
  params.push(id);

  const [result] = await pool.query(
    `UPDATE courses SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE`,
    params
  );

  return result.affectedRows;
}

async function listCategories() {
  const [rows] = await pool.query(
    `SELECT DISTINCT category FROM courses WHERE is_deleted = FALSE AND category IS NOT NULL AND category != '' ORDER BY category ASC`
  );
  return rows.map((r) => r.category);
}

module.exports = {
  listCourses,
  countCourses,
  listCategories,
  findById,
  create,
  update,
  COURSE_STATUSES,
  COURSE_DIFFICULTIES,
};
