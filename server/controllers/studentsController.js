// ─────────────────────────────────────────────────────────
//  controllers/studentsController.js
//  Students Controller - API endpoints for student management
// ─────────────────────────────────────────────────────────

const StudentModel = require("../models/Student");
const FacultyModel = require("../models/Faculty");
const auditService = require("../services/auditService");

const StudentsController = {

  // ── Students ────────────────────────────────────────────

  async getAllStudents(req, res) {
    try {
      const result = await StudentModel.getAll();
      if (result.success) {
        res.status(200).json({ success: true, data: result.data, message: "Students retrieved successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("[StudentsController.getAllStudents] Error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async getStudentById(req, res) {
    try {
      const { id } = req.params;
      const result = await StudentModel.getById(id);
      if (result.success) {
        res.status(200).json({ success: true, data: result.data, message: "Student retrieved successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("[StudentsController.getStudentById] Error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async getStudentByStudentIdNumber(req, res) {
    try {
      const { studentIdNumber } = req.params;
      const result = await StudentModel.getByStudentIdNumber(studentIdNumber);
      if (result.success) {
        res.status(200).json({ success: true, data: result.data, message: "Student retrieved successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("[StudentsController.getStudentByStudentIdNumber] Error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async createStudent(req, res) {
    try {
      const studentData = req.body;
      const result = await StudentModel.create(studentData);
      if (result.success) {
        // ── Audit: CREATE ──────────────────────────────
        await auditService.logAction(req, {
          entity_type : "student",
          entity_id   : result.data?.id ?? null,
          action      : "CREATE",
          old_data    : null,
          new_data    : {
            student_id_number : result.data?.student_id_number ?? studentData.student_id_number,
            name              : result.data?.name              ?? studentData.name,
          },
        });
        res.status(201).json({ success: true, data: result.data, message: "Student created successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("[StudentsController.createStudent] Error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async updateStudent(req, res) {
    try {
      const { id } = req.params;

      // Snapshot before update
      const oldResult = await StudentModel.getById(id);
      const oldData   = oldResult.success
        ? { name: oldResult.data.name, student_id_number: oldResult.data.student_id_number }
        : null;

      const studentData = req.body;
      const result = await StudentModel.update(id, studentData);
      if (result.success) {
        // ── Audit: UPDATE ──────────────────────────────
        await auditService.logAction(req, {
          entity_type : "student",
          entity_id   : Number(id),
          action      : "UPDATE",
          old_data    : oldData,
          new_data    : { name: studentData.name, student_id_number: studentData.student_id_number },
        });
        res.status(200).json({ success: true, data: result.data, message: "Student updated successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("[StudentsController.updateStudent] Error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async deleteStudent(req, res) {
    try {
      const { id } = req.params;

      // Snapshot before delete
      const oldResult = await StudentModel.getById(id);
      const oldData   = oldResult.success
        ? { name: oldResult.data.name, student_id_number: oldResult.data.student_id_number }
        : null;

      const result = await StudentModel.delete(id);
      if (result.success) {
        // ── Audit: DELETE ──────────────────────────────
        await auditService.logAction(req, {
          entity_type : "student",
          entity_id   : Number(id),
          action      : "DELETE",
          old_data    : oldData,
          new_data    : null,
        });
        res.status(200).json({ success: true, data: result.data, message: "Student deleted successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("[StudentsController.deleteStudent] Error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async bulkImportStudents(req, res) {
    try {
      const studentsData = req.body;
      const result = await StudentModel.bulkImport(studentsData);
      if (result.success) {
        // ── Audit: BULK_IMPORT ─────────────────────────
        await auditService.logAction(req, {
          entity_type : "student",
          entity_id   : null,
          action      : "BULK_IMPORT",
          old_data    : null,
          new_data    : {
            imported : result.data?.length ?? (Array.isArray(studentsData) ? studentsData.length : 0),
          },
        });
        res.status(201).json({ success: true, data: result.data, message: "Bulk import completed successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("[StudentsController.bulkImportStudents] Error:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

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

  // ── Faculty ─────────────────────────────────────────────

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
      if (result.success) {
        // ── Audit: CREATE ──────────────────────────────
        await auditService.logAction(req, {
          entity_type : "faculty",
          entity_id   : result.data?.id ?? null,
          action      : "CREATE",
          old_data    : null,
          new_data    : { name: result.data?.name ?? req.body.name },
        });
        res.status(201).json({ success: true, data: result.data, message: "Faculty created successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async updateFaculty(req, res) {
    try {
      const { id } = req.params;

      // Snapshot before update
      const oldResult = await FacultyModel.getById ? await FacultyModel.getById(id) : { success: false };
      const oldData   = oldResult.success ? { name: oldResult.data?.name } : null;

      const result = await FacultyModel.update(id, req.body);
      if (result.success) {
        // ── Audit: UPDATE ──────────────────────────────
        await auditService.logAction(req, {
          entity_type : "faculty",
          entity_id   : Number(id),
          action      : "UPDATE",
          old_data    : oldData,
          new_data    : { name: req.body.name },
        });
        res.status(200).json({ success: true, data: result.data, message: "Faculty updated successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async deleteFaculty(req, res) {
    try {
      const { id } = req.params;

      // Snapshot before delete
      const oldResult = await FacultyModel.getById ? await FacultyModel.getById(id) : { success: false };
      const oldData   = oldResult.success ? { name: oldResult.data?.name } : null;

      const result = await FacultyModel.delete(id);
      if (result.success) {
        // ── Audit: DELETE ──────────────────────────────
        await auditService.logAction(req, {
          entity_type : "faculty",
          entity_id   : Number(id),
          action      : "DELETE",
          old_data    : oldData,
          new_data    : null,
        });
        res.status(200).json({ success: true, data: result.data, message: "Faculty deleted successfully" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async bulkImportFaculty(req, res) {
    try {
      const result = await FacultyModel.bulkImport(req.body);
      if (result.success) {
        // ── Audit: BULK_IMPORT ─────────────────────────
        await auditService.logAction(req, {
          entity_type : "faculty",
          entity_id   : null,
          action      : "BULK_IMPORT",
          old_data    : null,
          new_data    : {
            imported : result.data?.length ?? (Array.isArray(req.body) ? req.body.length : 0),
          },
        });
        res.status(201).json({ success: true, data: result.data, message: "Bulk import completed" });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
};

module.exports = StudentsController;