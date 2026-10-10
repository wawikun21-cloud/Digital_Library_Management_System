const { pool } = require("../../config/db");

const SLIDE_COLUMNS = "id, image_url, sort_order, is_active, created_at, updated_at";

async function listSlides({ activeOnly = false } = {}) {
  const where = activeOnly ? "WHERE is_active = 1" : "";
  const [rows] = await pool.query(
    `SELECT ${SLIDE_COLUMNS} FROM portal_hero_slides ${where} ORDER BY sort_order ASC, id ASC`
  );
  return rows;
}

async function getSlide(id) {
  const [rows] = await pool.query(`SELECT ${SLIDE_COLUMNS} FROM portal_hero_slides WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function countSlides() {
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM portal_hero_slides");
  return rows[0].total;
}

async function insertSlide({ image_url, is_active, created_by }) {
  const [result] = await pool.query(
    `INSERT INTO portal_hero_slides (image_url, is_active, sort_order, created_by)
     VALUES (?, ?, (SELECT COALESCE(MAX(s.sort_order), 0) + 1 FROM portal_hero_slides s), ?)`,
    [image_url, is_active ? 1 : 0, created_by ?? null]
  );
  return getSlide(result.insertId);
}

const UPDATABLE = ["image_url", "is_active"];

async function updateSlide(id, fields) {
  const sets = [];
  const params = [];
  for (const key of UPDATABLE) {
    if (fields[key] === undefined) continue;
    sets.push(`${key} = ?`);
    if (key === "is_active") params.push(fields[key] ? 1 : 0);
    else params.push(fields[key]);
  }
  if (sets.length) {
    await pool.query(`UPDATE portal_hero_slides SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  }
  return getSlide(id);
}

async function deleteSlide(id) {
  const [result] = await pool.query("DELETE FROM portal_hero_slides WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

async function reorderSlides(ids) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let index = 0; index < ids.length; index += 1) {
      await conn.query("UPDATE portal_hero_slides SET sort_order = ? WHERE id = ?", [index + 1, ids[index]]);
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function listLatestPublishedBooks(limit) {
  const [rows] = await pool.query(
    `SELECT id, title, author, cover_url, thumbnail_url, short_description,
            source_type, total_pages, status, published_at, created_at
       FROM lexora_books
      WHERE deleted_at IS NULL AND status = 'published' AND visibility = 'public'
      ORDER BY COALESCE(published_at, created_at) DESC, id DESC
      LIMIT ?`,
    [limit]
  );
  return rows;
}

async function listLatestPublishedCourses(limit) {
  const [rows] = await pool.query(
    `SELECT c.id, c.title, c.description, c.category, c.difficulty, c.thumbnail_url,
            u.full_name AS instructor_name,
            (SELECT COUNT(*) FROM course_modules m WHERE m.course_id = c.id) AS module_count,
            c.created_at
       FROM courses c
       LEFT JOIN users u ON u.id = c.instructor_id
      WHERE c.is_deleted = FALSE AND c.deleted_at IS NULL AND c.status = 'published'
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT ?`,
    [limit]
  );
  return rows;
}

module.exports = {
  listSlides, getSlide, countSlides, insertSlide, updateSlide, deleteSlide,
  reorderSlides, listLatestPublishedBooks, listLatestPublishedCourses,
};
