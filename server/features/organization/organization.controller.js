// ─────────────────────────────────────────────────────────
//  features/organization/organization.controller.js
//
//  Thin HTTP layer: parse request → call service → respond.
//  No SQL, no business rules (they live in the service).
// ─────────────────────────────────────────────────────────

const OrganizationService = require("./organization.service");
const validation = require("./organization.validation");
const auditService = require("../../services/auditService");

function sendServiceResult(res, result, successStatus = 200) {
  if (result.success) {
    return res.status(result.status || successStatus).json({
      success: true,
      data: result.data,
    });
  }
  return res.status(result.status || 400).json({ success: false, error: result.error });
}

const OrganizationController = {

  // ── Hierarchy ───────────────────────────────────────────

  async getHierarchy(req, res) {
    try {
      const result = await OrganizationService.getHierarchy(req.schoolScope);
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.getHierarchy]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  // ── Schools ─────────────────────────────────────────────

  async listSchools(req, res) {
    try {
      const schools = await OrganizationService.listSchools(req.schoolScope);
      return res.status(200).json({ success: true, data: schools });
    } catch (error) {
      console.error("[OrganizationController.listSchools]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async getSchool(req, res) {
    try {
      const result = await OrganizationService.getSchool(req.schoolScope, req.params.id);
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.getSchool]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async createSchool(req, res) {
    try {
      const invalid = validation.validateSchoolPayload(req.body);
      if (invalid) return res.status(400).json({ success: false, error: invalid });

      const result = await OrganizationService.createSchool(
        req.schoolScope, req.body, req.session.user?.id
      );
      if (result.success) {
        await auditService.logAction(req, {
          entity_type: "school",
          entity_id: result.data?.id ?? null,
          action: "CREATE",
          old_data: null,
          new_data: { name: result.data?.name, code: result.data?.code },
        });
      }
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.createSchool]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async updateSchool(req, res) {
    try {
      const invalid = validation.validateSchoolPayload(req.body);
      if (invalid) return res.status(400).json({ success: false, error: invalid });

      const before = await OrganizationService.getSchool(req.schoolScope, req.params.id);
      const result = await OrganizationService.updateSchool(req.schoolScope, req.params.id, req.body);
      if (result.success) {
        await auditService.logAction(req, {
          entity_type: "school",
          entity_id: Number(req.params.id),
          action: "UPDATE",
          old_data: before.success ? { name: before.data?.name } : null,
          new_data: { name: result.data?.name },
        });
      }
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.updateSchool]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async deleteSchool(req, res) {
    try {
      const before = await OrganizationService.getSchool(req.schoolScope, req.params.id);
      const result = await OrganizationService.deleteSchool(req.schoolScope, req.params.id);
      if (result.success) {
        await auditService.logAction(req, {
          entity_type: "school",
          entity_id: Number(req.params.id),
          action: "DELETE",
          old_data: before.success ? { name: before.data?.name } : null,
          new_data: null,
        });
      }
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.deleteSchool]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  // ── Departments ─────────────────────────────────────────

  async listDepartments(req, res) {
    try {
      const departments = await OrganizationService.listDepartments(
        req.schoolScope, req.query.school_id
      );
      return res.status(200).json({ success: true, data: departments });
    } catch (error) {
      console.error("[OrganizationController.listDepartments]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async getDepartment(req, res) {
    try {
      const result = await OrganizationService.getDepartment(req.schoolScope, req.params.id);
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.getDepartment]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async createDepartment(req, res) {
    try {
      const invalid = validation.validateDepartmentPayload(req.body);
      if (invalid) return res.status(400).json({ success: false, error: invalid });

      const result = await OrganizationService.createDepartment(
        req.schoolScope, req.body, req.session.user?.id
      );
      if (result.success) {
        await auditService.logAction(req, {
          entity_type: "department",
          entity_id: result.data?.id ?? null,
          action: "CREATE",
          old_data: null,
          new_data: { name: result.data?.name, school: result.data?.school_name },
        });
      }
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.createDepartment]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async updateDepartment(req, res) {
    try {
      const invalid = validation.validateDepartmentPayload(req.body);
      if (invalid) return res.status(400).json({ success: false, error: invalid });

      const result = await OrganizationService.updateDepartment(req.schoolScope, req.params.id, req.body);
      if (result.success) {
        await auditService.logAction(req, {
          entity_type: "department",
          entity_id: Number(req.params.id),
          action: "UPDATE",
          old_data: null,
          new_data: { name: result.data?.name },
        });
      }
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.updateDepartment]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async deleteDepartment(req, res) {
    try {
      const result = await OrganizationService.deleteDepartment(req.schoolScope, req.params.id);
      if (result.success) {
        await auditService.logAction(req, {
          entity_type: "department",
          entity_id: Number(req.params.id),
          action: "DELETE",
          old_data: null,
          new_data: null,
        });
      }
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.deleteDepartment]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  // ── Categories ──────────────────────────────────────────

  async listCategories(req, res) {
    try {
      const categories = await OrganizationService.listCategories(
        req.schoolScope, req.query.department_id, req.query.school_id
      );
      return res.status(200).json({ success: true, data: categories });
    } catch (error) {
      console.error("[OrganizationController.listCategories]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async getCategory(req, res) {
    try {
      const result = await OrganizationService.getCategory(req.schoolScope, req.params.id);
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.getCategory]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async createCategory(req, res) {
    try {
      const invalid = validation.validateCategoryPayload(req.body);
      if (invalid) return res.status(400).json({ success: false, error: invalid });

      const result = await OrganizationService.createCategory(
        req.schoolScope, req.body, req.session.user?.id
      );
      if (result.success) {
        await auditService.logAction(req, {
          entity_type: "category",
          entity_id: result.data?.id ?? null,
          action: "CREATE",
          old_data: null,
          new_data: { name: result.data?.name, department: result.data?.department_name },
        });
      }
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.createCategory]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async updateCategory(req, res) {
    try {
      const invalid = validation.validateCategoryPayload(req.body);
      if (invalid) return res.status(400).json({ success: false, error: invalid });

      const result = await OrganizationService.updateCategory(req.schoolScope, req.params.id, req.body);
      if (result.success) {
        await auditService.logAction(req, {
          entity_type: "category",
          entity_id: Number(req.params.id),
          action: "UPDATE",
          old_data: null,
          new_data: { name: result.data?.name },
        });
      }
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.updateCategory]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async deleteCategory(req, res) {
    try {
      const result = await OrganizationService.deleteCategory(req.schoolScope, req.params.id);
      if (result.success) {
        await auditService.logAction(req, {
          entity_type: "category",
          entity_id: Number(req.params.id),
          action: "DELETE",
          old_data: null,
          new_data: null,
        });
      }
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.deleteCategory]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  // ── Category ↔ book assignments ─────────────────────────

  async getCategoryBooks(req, res) {
    try {
      const result = await OrganizationService.getCategoryBooks(req.schoolScope, req.params.id);
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.getCategoryBooks]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** Current category ids of a physical book (seeds the assignment controls). */
  async getBookCategories(req, res) {
    try {
      const result = await OrganizationService.getBookCategories(req.schoolScope, req.params.bookId);
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.getBookCategories]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /** Current category ids of a digital book (seeds the assignment controls). */
  async getLexoraBookCategories(req, res) {
    try {
      const result = await OrganizationService.getLexoraBookCategories(req.schoolScope, req.params.bookId);
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.getLexoraBookCategories]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  /**
   * Bulk-assign books to a category — filter-driven ("everything
   * matching these filters") or explicit ids, physical or digital.
   * dry_run previews the counts without writing.
   */
  async assignCategoryBooks(req, res) {
    try {
      const result = await OrganizationService.assignCategoryBooks(
        req.schoolScope,
        req.params.id,
        req.body,
        req.user?.actorId || req.user?.id
      );
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.assignCategoryBooks]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async setBookCategories(req, res) {
    try {
      const invalid = validation.validateCategoryAssignmentPayload(req.body);
      if (invalid) return res.status(400).json({ success: false, error: invalid });

      const result = await OrganizationService.setBookCategories(
        req.schoolScope, req.params.bookId, req.body.category_ids, req.session.user?.id
      );
      if (result.success) {
        await auditService.logAction(req, {
          entity_type: "book",
          entity_id: Number(req.params.bookId),
          action: "UPDATE",
          old_data: null,
          new_data: { category_ids: result.data?.categoryIds },
        });
      }
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.setBookCategories]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async setLexoraBookCategories(req, res) {
    try {
      const invalid = validation.validateCategoryAssignmentPayload(req.body);
      if (invalid) return res.status(400).json({ success: false, error: invalid });

      const result = await OrganizationService.setLexoraBookCategories(
        req.schoolScope, req.params.bookId, req.body.category_ids, req.session.user?.id
      );
      if (result.success) {
        await auditService.logAction(req, {
          entity_type: "lexora_book",
          entity_id: Number(req.params.bookId),
          action: "UPDATE",
          old_data: null,
          new_data: { category_ids: result.data?.categoryIds },
        });
      }
      return sendServiceResult(res, result);
    } catch (error) {
      console.error("[OrganizationController.setLexoraBookCategories]", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  },
};

module.exports = OrganizationController;
