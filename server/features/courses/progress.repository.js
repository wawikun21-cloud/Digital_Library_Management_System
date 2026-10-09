const { pool } = require("../../config/db");

async function listByCourse(userId, courseId) {
  const [rows] = await pool.query(
    `SELECT lp.*, mc.title, mc.module_id, mc.order_index
     FROM lesson_progress lp
     JOIN module_content mc ON lp.lesson_id = mc.id
     WHERE lp.user_id = ? AND lp.course_id = ? AND mc.is_deleted = FALSE
     ORDER BY lp.updated_at DESC`,
    [userId, courseId]
  );
  return rows;
}

async function findByUserAndLesson(userId, lessonId) {
  const [rows] = await pool.query(
    "SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ? LIMIT 1",
    [userId, lessonId]
  );
  return rows[0] || null;
}

async function findLesson(courseId, lessonId) {
  const [rows] = await pool.query(
    `SELECT mc.* FROM module_content mc
     JOIN course_modules cm ON mc.module_id = cm.id
     WHERE mc.id = ? AND cm.course_id = ? AND mc.is_deleted = FALSE AND cm.is_deleted = FALSE`,
    [lessonId, courseId]
  );
  return rows[0] || null;
}

async function upsert({ userId, lessonId, courseId, status }) {
  const existing = await findByUserAndLesson(userId, lessonId);
  if (existing) {
    await pool.query(
      "UPDATE lesson_progress SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, status === "completed" ? new Date() : null, existing.id]
    );
    return existing.id;
  }
  const [result] = await pool.query(
    "INSERT INTO lesson_progress (user_id, lesson_id, course_id, status, completed_at) VALUES (?, ?, ?, ?, ?)",
    [userId, lessonId, courseId, status, status === "completed" ? new Date() : null]
  );
  return result.insertId;
}

async function countTotal(courseId) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS t FROM module_content mc
     JOIN course_modules cm ON mc.module_id = cm.id
     WHERE cm.course_id = ? AND mc.is_deleted = FALSE AND cm.is_deleted = FALSE`,
    [courseId]
  );
  return row?.t ?? 0;
}

async function countCompleted(userId, courseId) {
  const [[row]] = await pool.query(
    "SELECT COUNT(*) AS c FROM lesson_progress WHERE user_id = ? AND course_id = ? AND status = ?",
    [userId, courseId, "completed"]
  );
  return row?.c ?? 0;
}

async function getNextLessonId(userId, courseId, lessonId) {
  const [[row]] = await pool.query(
    `SELECT mc.id
     FROM module_content mc
     JOIN course_modules cm ON mc.module_id = cm.id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = mc.id AND lp.user_id = ?
     WHERE cm.course_id = ? AND cm.is_deleted = FALSE AND mc.is_deleted = FALSE
       AND (cm.order_index, mc.order_index) > (
         SELECT cm2.order_index, mc2.order_index
         FROM module_content mc2
         JOIN course_modules cm2 ON mc2.module_id = cm2.id
         WHERE mc2.id = ?
       )
     ORDER BY cm.order_index ASC, mc.order_index ASC
     LIMIT 1`,
    [userId, courseId, lessonId]
  );
  return row?.id || null;
}

async function getModuleOfLesson(lessonId) {
  const [[row]] = await pool.query(
    "SELECT module_id FROM module_content WHERE id = ? LIMIT 1",
    [lessonId]
  );
  return row?.module_id || null;
}

async function isModuleCompleted(userId, moduleId) {
  if (!moduleId) return false;
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN lp.status = 'completed' THEN 1 ELSE 0 END) AS done
     FROM module_content mc
     LEFT JOIN lesson_progress lp ON lp.lesson_id = mc.id AND lp.user_id = ?
     WHERE mc.module_id = ? AND mc.is_deleted = FALSE`,
    [userId, moduleId]
  );
  const total = row?.total ?? 0;
  const done = row?.done ?? 0;
  return done >= total && total > 0;
}

async function getFirstLessonIdOfModule(moduleId) {
  const [[row]] = await pool.query(
    "SELECT id FROM module_content WHERE module_id = ? AND is_deleted = FALSE ORDER BY order_index ASC LIMIT 1",
    [moduleId]
  );
  return row?.id || null;
}

async function getNextModuleId(courseId, moduleId) {
  const [[row]] = await pool.query(
    "SELECT id FROM course_modules WHERE course_id = ? AND is_deleted = FALSE AND order_index > (SELECT order_index FROM course_modules WHERE id = ?) ORDER BY order_index ASC LIMIT 1",
    [courseId, moduleId]
  );
  return row?.id || null;
}

async function getEnrollment(courseId, userId) {
  const [rows] = await pool.query(
    "SELECT * FROM course_enrollments WHERE course_id = ? AND user_id = ? AND is_deleted = FALSE LIMIT 1",
    [courseId, userId]
  );
  return rows[0] || null;
}

async function updateEnrollmentProgress(courseId, userId, pct, status, completedAt) {
  const sets = ["progress_percentage = ?"];
  const params = [pct];
  if (status) {
    sets.push("status = ?");
    params.push(status);
  }
  if (completedAt) {
    sets.push("completed_at = ?");
    params.push(completedAt);
  }
  params.push(courseId, userId);
  await pool.query(
    `UPDATE course_enrollments SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE course_id = ? AND user_id = ? AND is_deleted = FALSE`,
    params
  );
}

async function unlockForEnrollment(userId, courseId) {
  const [lessonRows] = await pool.query(
    `SELECT mc.id
     FROM module_content mc
     JOIN course_modules cm ON mc.module_id = cm.id
     WHERE cm.course_id = ? AND cm.is_deleted = FALSE AND mc.is_deleted = FALSE
     ORDER BY cm.order_index ASC, mc.order_index ASC`,
    [courseId]
  );
  const lessons = lessonRows || [];
  if (lessons.length === 0) return;
  for (let i = 0; i < lessons.length; i++) {
    const lessonId = lessons[i].id;
    const status = i === 0 ? "unlocked" : "locked";
    await pool.query(
      "INSERT IGNORE INTO lesson_progress (user_id, lesson_id, course_id, status) VALUES (?, ?, ?, ?)",
      [userId, lessonId, courseId, status]
    );
  }
}

module.exports = {
  listByCourse,
  findByUserAndLesson,
  findLesson,
  upsert,
  countTotal,
  countCompleted,
  getNextLessonId,
  getModuleOfLesson,
  isModuleCompleted,
  getFirstLessonIdOfModule,
  getNextModuleId,
  getEnrollment,
  updateEnrollmentProgress,
  unlockForEnrollment,
};
