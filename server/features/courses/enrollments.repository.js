const { pool } = require('../../config/db');

async function listEnrollments(courseId) {
  const [rows] = await pool.query(
    `SELECT e.*, u.username, u.role as user_role
     FROM course_enrollments e
     LEFT JOIN users u ON e.user_id = u.id
     WHERE e.course_id = ? AND e.is_deleted = FALSE
     ORDER BY e.enrolled_at DESC`,
    [courseId]
  );
  return rows;
}

async function enroll(courseId, userId, role = 'learner') {
  const [result] = await pool.query(
    `INSERT INTO course_enrollments (course_id, user_id, role, status)
     VALUES (?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE status = 'active', role = VALUES(role)`,
    [courseId, userId, role]
  );
  return result.insertId || result.affectedRows;
}

async function unenroll(courseId, userId) {
  const [result] = await pool.query(
    'UPDATE course_enrollments SET is_deleted = TRUE WHERE course_id = ? AND user_id = ? AND is_deleted = FALSE',
    [courseId, userId]
  );
  return result.affectedRows;
}

module.exports = {
  listEnrollments,
  enroll,
  unenroll,
};
