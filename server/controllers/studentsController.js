// ─────────────────────────────────────────────────────────
//  controllers/studentsController.js
//  Students Controller - API endpoints for student management
// ─────────────────────────────────────────────────────────

const StudentModel = require("../models/Student");
const FacultyModel = require("../models/Faculty");

const StudentsController = {
  /**
   * Get all students
   */
  async getAllStudents(req, res) {
    try {
      const result = await StudentModel.getAll();
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Students retrieved successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[StudentsController.getAllStudents] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Get student by ID
   */
  async getStudentById(req, res) {
    try {
      const { id } = req.params;
      const result = await StudentModel.getById(id);
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Student retrieved successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[StudentsController.getStudentById] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Get student by student ID number
   */
  async getStudentByStudentIdNumber(req, res) {
    try {
      const { studentIdNumber } = req.params;
      const result = await StudentModel.getByStudentIdNumber(studentIdNumber);
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Student retrieved successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[StudentsController.getStudentByStudentIdNumber] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Create a new student
   */
  async createStudent(req, res) {
    try {
      const studentData = req.body;
      const result = await StudentModel.create(studentData);
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: "Student created successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[StudentsController.createStudent] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Update a student
   */
  async updateStudent(req, res) {
    try {
      const { id } = req.params;
      const studentData = req.body;
      const result = await StudentModel.update(id, studentData);
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Student updated successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[StudentsController.updateStudent] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Delete a student
   */
  async deleteStudent(req, res) {
    try {
      const { id } = req.params;
      const result = await StudentModel.delete(id);
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: "Student deleted successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[StudentsController.deleteStudent] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Bulk import students from Excel
   */
  async bulkImportStudents(req, res) {
    try {
      const studentsData = req.body;
      const result = await StudentModel.bulkImport(studentsData);
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: "Bulk import completed successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error("[StudentsController.bulkImportStudents] Error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error"
      });
    }
  },

  /**
   * Get student statistics
   */
  async getStudentStats(req, res) {
    try {
      const result = await StudentModel.getStats();
      if (result.success) {
        res.status(200).json({ success: true, data: result.data, message: "Student statistics retrieved successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("[StudentsController.getStudentStats] Error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  // ── Faculty ─────────────────────────────────────────

  async getAllFaculty(req, res) {
    try {
      const result = await FacultyModel.getAll();
      res.status(result.success ? 200 : 400).json(result.success
        ? { success: true, data: result.data }
        : { success: false, error: result.error });
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async createFaculty(req, res) {
    try {
      const result = await FacultyModel.create(req.body);
      res.status(result.success ? 201 : 400).json(result.success
        ? { success: true, data: result.data, message: "Faculty created successfully" }
        : { success: false, error: result.error });
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async updateFaculty(req, res) {
    try {
      const result = await FacultyModel.update(req.params.id, req.body);
      res.status(result.success ? 200 : 400).json(result.success
        ? { success: true, data: result.data, message: "Faculty updated successfully" }
        : { success: false, error: result.error });
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async deleteFaculty(req, res) {
    try {
      const result = await FacultyModel.delete(req.params.id);
      res.status(result.success ? 200 : 400).json(result.success
        ? { success: true, data: result.data, message: "Faculty deleted successfully" }
        : { success: false, error: result.error });
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async bulkImportFaculty(req, res) {
    try {
      const result = await FacultyModel.bulkImport(req.body);
      res.status(result.success ? 201 : 400).json(result.success
        ? { success: true, data: result.data, message: "Bulk import completed" }
        : { success: false, error: result.error });
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
};

module.exports = StudentsController;