const { pool } = require('../../config/db');

const COURSE_STATUSES = ['draft', 'published', 'archived', 'under_review'];
const COURSE_DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'all_levels'];

/** School-scope predicate (alias `c`): unassigned courses stay visible (legacy fallback). */
function scopeSql(scope) {
  if (!scope || !scope.scoped || scope.schoolId == null) return { sql: '', params: [] };
  return { sql: ' AND (c.school_id IS NULL OR c.school_id = ?)', params: [scope.schoolId] };
}

async function listCourses(filters = {}, scope = null) {
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
    WHERE c.is_deleted = FALSE ${scopeSql(scope).sql}
  `;
  const params = [...scopeSql(scope).params];

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

async function countCourses(filters = {}, scope = null) {
  const { search, status, category, difficulty, instructor_id } = filters;
  const scopeFragment = scopeSql(scope);

  let sql = `SELECT COUNT(*) AS total FROM courses c WHERE c.is_deleted = FALSE${scopeFragment.sql}`;
  const params = [...scopeFragment.params];

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

async function findById(id, scope = null) {
  const scopeFragment = scopeSql(scope);
  const [rows] = await pool.query(
    `SELECT c.*, u.username AS instructor_name
     FROM courses c
     LEFT JOIN users u ON c.instructor_id = u.id
     WHERE c.id = ? AND c.is_deleted = FALSE${scopeFragment.sql}
     LIMIT 1`,
    [id, ...scopeFragment.params]
  );
  return rows[0] || null;
}

async function create(courseData, scope = null) {
  const {
    title, description, category, difficulty, instructor_id, thumbnail_url,
    prerequisites, learning_outcomes, max_enrollments, start_date, end_date,
    grading_scale, allow_self_enrollment, send_completion_certificates, status,
    school_id,
  } = courseData;

  // School assignment: a scoped caller's courses are pinned to their
  // own school ("first touch assigns" for legacy content).
  let schoolId = school_id ?? null;
  if (scope && scope.scoped && scope.schoolId != null) {
    if (schoolId != null && Number(schoolId) !== Number(scope.schoolId)) {
      return { insertId: null, scopeError: "Course must belong to your school" };
    }
    schoolId = scope.schoolId;
  }

  const [result] = await pool.query(
    `INSERT INTO courses (
      title, description, category, difficulty, status, instructor_id, thumbnail_url,
      prerequisites, learning_outcomes, max_enrollments, start_date, end_date,
      grading_scale, allow_self_enrollment, send_completion_certificates, school_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      schoolId,
    ]
  );
  return result.insertId;
}

async function update(id, updates, scope = null) {
  const allowed = [
    'title', 'description', 'category', 'difficulty', 'status', 'instructor_id',
    'thumbnail_url', 'prerequisites', 'learning_outcomes', 'max_enrollments',
    'start_date', 'end_date', 'grading_scale', 'allow_self_enrollment',
    'send_completion_certificates', 'school_id',
  ];

  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      let value = updates[key];
      if ((key === 'prerequisites' || key === 'learning_outcomes') && value && typeof value === 'object') {
        value = JSON.stringify(value);
      }
      // A scoped caller may only assign their own school.
      if (key === 'school_id' && scope && scope.scoped && scope.schoolId != null) {
        if (value != null && Number(value) !== Number(scope.schoolId)) {
          return { affectedRows: 0, scopeError: "Course must belong to your school" };
        }
        value = scope.schoolId;
      }
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (!sets.length) return 0;
  const scopeFragment = scopeSql(scope);
  params.push(id, ...scopeFragment.params);

  const [result] = await pool.query(
    `UPDATE courses SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = FALSE${scopeFragment.sql}`,
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
