// ─────────────────────────────────────────────────────────
//  models/Student.js
//  Student Model - MySQL CRUD Operations
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

const StudentModel = {
  /**
   * Get all students
   */
  async getAll() {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM students
        WHERE deleted_at IS NULL
        ORDER BY student_name ASC
      `);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[StudentModel.getAll] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get student by ID
   */
  async getById(id) {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM students 
        WHERE id = ? AND is_active = true AND deleted_at IS NULL
      `, [id]);
      if (rows.length === 0) {
        return { success: false, error: "Student not found" };
      }
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[StudentModel.getById] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get student by student ID number
   */
  async getByStudentIdNumber(studentIdNumber) {
    try {
      const [rows] = await pool.query(`
        SELECT * FROM students 
        WHERE student_id_number = ? AND is_active = true
      `, [studentIdNumber]);
      if (rows.length === 0) {
        return { success: false, error: "Student not found" };
      }
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[StudentModel.getByStudentIdNumber] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create a new student
   */
  async create(studentData) {
    try {
      const {
        student_id_number,
        student_name,
        student_course,
        student_yr_level,
        student_school_year,
        student_email,
        student_contact,
        display_name,
        first_name,
        last_name,
        senior_high_school,
        strand,
        school_address
      } = studentData;

      // Check if student ID number already exists
      const [existing] = await pool.query(`
        SELECT id FROM students 
        WHERE student_id_number = ?
      `, [student_id_number]);

      if (existing.length > 0) {
        return { success: false, error: "Student ID number already exists" };
      }

      const courseVal = student_course || null;
      const yrLevelVal = student_yr_level || null;
      const syVal = student_school_year || null;
      const emailVal = student_email || null;
      const contactVal = student_contact || null;
      const displayVal = display_name || null;
      const firstVal = first_name || null;
      const lastVal = last_name || null;
      const seniorHighSchool = senior_high_school || null;
      const strandVal = strand || null;
      const schoolAddress = school_address || null;

      const values = [student_id_number, student_name, courseVal, yrLevelVal, syVal, emailVal, contactVal, displayVal, firstVal, lastVal, seniorHighSchool, strandVal, schoolAddress];

      const [result] = await pool.query(
        `INSERT INTO students (student_id_number, student_name, student_course, student_yr_level, student_school_year, student_email, student_contact, display_name, first_name, last_name, senior_high_school, strand, school_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values
      );

      const [rows] = await pool.query(`SELECT * FROM students WHERE id = ?`, [result.insertId]);
      console.log(`✅ Student created: ${student_name} (${student_id_number})`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[StudentModel.create] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update an existing student
   */
  async update(id, studentData) {
    try {
      const {
        student_id_number,
        student_name,
        student_course,
        student_yr_level,
        student_school_year,
        student_email,
        student_contact,
        display_name,
        first_name,
        last_name,
        is_active
      } = studentData;

      await pool.query(
        `UPDATE students 
         SET student_id_number = ?, student_name = ?, student_course = ?, student_yr_level = ?,
             student_school_year = ?, student_email = ?, student_contact = ?, display_name = ?,
             first_name = ?, last_name = ?, is_active = ?, updated_at = NOW()
         WHERE id = ?`,
        [student_id_number, student_name, student_course || null, student_yr_level || null, student_school_year || null, student_email || null, student_contact || null, display_name || null, first_name || null, last_name || null, is_active, id]
      );

      const [rows] = await pool.query(`
        SELECT * FROM students WHERE id = ?
      `, [id]);

      console.log(`✅ Student updated: ID ${id}`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[StudentModel.update] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a student
   */
  async delete(id) {
    try {
      const TrashModel = require("./Trash");
      const [student] = await pool.query("SELECT * FROM students WHERE id = ?", [id]);
      if (student.length === 0) {
        return { success: false, error: "Student not found" };
      }
      return TrashModel.softDelete("student", Number(id));
    } catch (error) {
      console.error("[StudentModel.delete] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Bulk import students from Excel
   */
  async bulkImport(studentsData) {
    try {
      const results = {
        successful: 0,
        failed: 0,
        errors: []
      };

      for (let i = 0; i < studentsData.length; i++) {
        const studentData = studentsData[i];
        try {
          const result = await this.create(studentData);
          if (result.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push({
              index: i,
              error: result.error,
              data: studentData
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            index: i,
            error: error.message,
            data: studentData
          });
        }
      }

      console.log(`✅ Bulk import completed: ${results.successful} successful, ${results.failed} failed`);
      return { success: true, data: results };
    } catch (error) {
      console.error("[StudentModel.bulkImport] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get student statistics
   */
  async getStats() {
    try {
      const [total] = await pool.query("SELECT COUNT(*) as count FROM students WHERE is_active = true");
      const [byCourse] = await pool.query(`
        SELECT student_course, COUNT(*) as count FROM students 
        WHERE is_active = true AND student_course IS NOT NULL
        GROUP BY student_course
        ORDER BY count DESC
      `);
      const [byYearLevel] = await pool.query(`
        SELECT student_yr_level, COUNT(*) as count FROM students 
        WHERE is_active = true AND student_yr_level IS NOT NULL
        GROUP BY student_yr_level
        ORDER BY count DESC
      `);
      const [bySchoolYear] = await pool.query(`
        SELECT student_school_year, COUNT(*) as count FROM students 
        WHERE is_active = true AND student_school_year IS NOT NULL
        GROUP BY student_school_year
        ORDER BY student_school_year DESC
      `);

      return { 
        success: true, 
        data: {
          total: total[0].count,
          byCourse: byCourse,
          byYearLevel: byYearLevel,
          bySchoolYear: bySchoolYear
        }
      };
    } catch (error) {
      console.error("[StudentModel.getStats] Error:", error.message);
      return { success: false, error: error.message };
    }
  }
};

module.exports = StudentModel;