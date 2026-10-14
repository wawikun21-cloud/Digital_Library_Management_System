// ─────────────────────────────────────────────────────────
//  controllers/facultyController.js
//  Faculty API endpoints — moved from studentsController.js
//  when student records consolidated into users (role=student).
//
//  Faculty management is school-scoped (resolveSchoolScope in
//  routes/faculty.js). The faculty BORROWER lookup in the
//  transaction flow is deliberately NOT scoped — faculty may
//  borrow at any school (patron rule).
// ─────────────────────────────────────────────────────────

const FacultyModel = require("../models/Faculty");
const auditService = require("../services/auditService");

const FacultyController = {

  async getAllFaculty(req, res) {
    try {
      const result = await FacultyModel.getAll(req.schoolScope);
      res.status(result.success ? 200 : 400).json(result.success
        ? { success: true, data: result.data }
        : { success: false, error: result.error });
    } catch (error) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async createFaculty(req, res) {
    try {
      const result = await FacultyModel.create(req.body, req.schoolScope);
      if (result.success) {
        // ── Audit: CREATE ──────────────────────────────
        await auditService.logAction(req, {
          entity_type : "faculty",
          entity_id   : result.data?.id ?? null,
          action      : "CREATE",
          old_data    : null,
          new_data    : { name: result.data?.faculty_name ?? req.body.faculty_name },
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
      const oldResult = await FacultyModel.getById ? await FacultyModel.getById(id, req.schoolScope) : { success: false };
      const oldData   = oldResult.success ? { name: oldResult.data?.faculty_name } : null;

      const result = await FacultyModel.update(id, req.body, req.schoolScope);
      if (result.success) {
        // ── Audit: UPDATE ──────────────────────────────
        await auditService.logAction(req, {
          entity_type : "faculty",
          entity_id   : Number(id),
          action      : "UPDATE",
          old_data    : oldData,
          new_data    : { name: req.body.faculty_name },
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
      const oldResult = await FacultyModel.getById ? await FacultyModel.getById(id, req.schoolScope) : { success: false };
      const oldData   = oldResult.success ? { name: oldResult.data?.faculty_name } : null;

      const result = await FacultyModel.delete(id, req.schoolScope);
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
      const result = await FacultyModel.bulkImport(req.body, req.schoolScope);
      if (result.success) {
        // ── Audit: BULK_IMPORT ─────────────────────────
        await auditService.logAction(req, {
          entity_type : "faculty",
          entity_id   : null,
          action      : "BULK_IMPORT",
          old_data    : null,
          new_data    : {
            imported : result.data?.successful ?? 0,
            failed   : result.data?.failed ?? 0,
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

module.exports = FacultyController;
