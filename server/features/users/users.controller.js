const usersService = require("./users.service");
const rolesFeature = require("../roles");
const auditService = require("../../services/auditService");
const {
  validateCreateUser,
  validateUpdateUser,
  validateChangeRole,
  validateChangePassword,
  validateListQuery,
  validateCreateStudentUser,
  validateUpdateStudentUser,
} = require("./users.validation");

function getRequester(req) {
  return {
    id: req.session?.user?.id,
    username: req.session?.user?.username,
    role: req.session?.user?.role,
  };
}

/** Parses a route id; returns null when it is not a positive safe integer. */
function parseId(raw) {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function handleValidationError(res, validation) {
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return res.status(400).json({
      success: false,
      error: firstError,
    });
  }
  return null;
}

function handleError(err, req, res, action) {
  if (err.code === "NOT_FOUND") {
    return res.status(404).json({ success: false, error: err.message });
  }
  if (err.code === "CONFLICT") {
    return res.status(409).json({ success: false, error: err.message });
  }
  if (err.code === "BAD_REQUEST") {
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err.code === "FORBIDDEN") {
    return res.status(403).json({ success: false, error: err.message });
  }
  console.error(`[UsersController.${action}] Error:`, err);
  return res.status(500).json({ success: false, error: "Internal server error" });
}

const UsersController = {
  async listUsers(req, res) {
    try {
      const validation = validateListQuery(req.query);
      const validationErr = handleValidationError(res, validation);
      if (validationErr) return;

      const filters = {
        search: req.query.search,
        role: req.query.role,
        exclude_role: req.query.exclude_role,
        is_active: req.query.is_active === "true" ? 1 : req.query.is_active === "false" ? 0 : undefined,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort: req.query.sort || "created_at",
        order: req.query.order || "desc",
      };

      const result = await usersService.listUsers(getRequester(req), filters, req.schoolScope);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filters.limit) || 1,
        },
      });
    } catch (err) {
      console.error("[UsersController.listUsers] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async getUserStats(req, res) {
    try {
      const stats = await usersService.getUserStats(req.schoolScope);
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      console.error("[UsersController.getUserStats] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async getCurrentUser(req, res) {
    try {
      if (!req.session?.user) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }
      const user = await usersService.getCurrentUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      // Resolved permissions are merged in fresh, never read from the session.
      const permissions = await rolesFeature.getAuthPermissionPayload(req.session.user);
      res.status(200).json({ success: true, data: { ...user, ...permissions } });
    } catch (err) {
      console.error("[UsersController.getCurrentUser] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async getUserById(req, res) {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(404).json({ success: false, error: "User not found" });
      const user = await usersService.getUserById(id);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      // School scope: never expose another school's user record.
      if (req.schoolScope?.scoped && req.schoolScope.schoolId != null
          && (user.school_id == null || user.school_id !== req.schoolScope.schoolId)) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      console.error("[UsersController.getUserById] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async createUser(req, res) {
    const validation = validateCreateUser(req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    const requester = getRequester(req);
    try {
      const { id } = await usersService.createUser(requester, req.body, req.schoolScope);

      await auditService.logAction(req, {
        entity_type: "user",
        entity_id: id,
        action: "CREATE",
        old_data: null,
        new_data: { username: req.body.username, role: req.body.role, email: req.body.email },
      });

      res.status(201).json({
        success: true,
        data: { id },
        message: "User created successfully",
      });
    } catch (err) {
      if (err.code === "FORBIDDEN") {
        await auditService.logAction(req, {
          entity_type: "user",
          entity_id: null,
          action: "CREATE_FORBIDDEN",
          old_data: null,
          new_data: { attempted_role: req.body.role },
        });
      }
      return handleError(err, req, res, "createUser");
    }
  },

  async updateUser(req, res) {
    const validation = validateUpdateUser(req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    const requester = getRequester(req);
    const id = parseInt(req.params.id);
    const oldUser = await usersService.getUserById(id);

    try {
      const affected = await usersService.updateUser(requester, id, req.body, req.schoolScope);
      if (!affected) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      await auditService.logAction(req, {
        entity_type: "user",
        entity_id: id,
        action: "UPDATE",
        old_data: oldUser,
        new_data: req.body,
      });

      res.status(200).json({ success: true, message: "User updated successfully" });
    } catch (err) {
      return handleError(err, req, res, "updateUser");
    }
  },

  async changeRole(req, res) {
    const validation = validateChangeRole(req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    const requester = getRequester(req);
    const id = parseInt(req.params.id);
    const { role: newRole, reason } = req.body;

    const oldUser = await usersService.getUserById(id);
    const oldRole = oldUser?.role;

    try {
      const affected = await usersService.changeUserRole(requester, id, newRole, reason);
      if (!affected) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      await auditService.logAction(req, {
        entity_type: "user",
        entity_id: id,
        action: "ROLE_CHANGE",
        old_data: { role: oldRole },
        new_data: { role: newRole, reason: reason || null },
      });

      res.status(200).json({ success: true, message: "Role updated successfully" });
    } catch (err) {
      if (err.code === "FORBIDDEN") {
        await auditService.logAction(req, {
          entity_type: "user",
          entity_id: id,
          action: "ROLE_CHANGE_FORBIDDEN",
          old_data: { role: oldRole },
          new_data: { attempted_role: newRole },
        });
      }
      return handleError(err, req, res, "changeRole");
    }
  },

  async changePassword(req, res) {
    const validation = validateChangePassword(req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    const requester = getRequester(req);
    const id = parseInt(req.params.id);
    const { password, confirmPassword } = req.body;

    try {
      await usersService.changePassword(requester, id, password, confirmPassword);

      await auditService.logAction(req, {
        entity_type: "user",
        entity_id: id,
        action: "PASSWORD_CHANGE",
        old_data: null,
        new_data: { changed_by: requester.username },
      });

      res.status(200).json({ success: true, message: "Password updated successfully" });
    } catch (err) {
      return handleError(err, req, res, "changePassword");
    }
  },

  async deactivateUser(req, res) {
    const requester = getRequester(req);
    const id = parseInt(req.params.id);

    const oldUser = await usersService.getUserById(id);
    if (!oldUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    try {
      const affected = await usersService.deactivateUser(requester, id);
      if (!affected) {
        return res.status(404).json({ success: false, error: "User not found or already deactivated" });
      }

      await auditService.logAction(req, {
        entity_type: "user",
        entity_id: id,
        action: "DEACTIVATE",
        old_data: oldUser,
        new_data: { is_active: 0 },
      });

      res.status(200).json({ success: true, message: "User deactivated successfully" });
    } catch (err) {
      if (err.code === "FORBIDDEN") {
        await auditService.logAction(req, {
          entity_type: "user",
          entity_id: id,
          action: "DEACTIVATE_FORBIDDEN",
          old_data: oldUser,
          new_data: { attempted_by: requester.username },
        });
      }
      return handleError(err, req, res, "deactivateUser");
    }
  },

  async reactivateUser(req, res) {
    const requester = getRequester(req);
    const id = parseInt(req.params.id);

    const oldUser = await usersService.getUserById(id);
    if (!oldUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    try {
      const affected = await usersService.reactivateUser(requester, id);
      if (!affected) {
        return res.status(400).json({ success: false, error: "User is already active" });
      }

      await auditService.logAction(req, {
        entity_type: "user",
        entity_id: id,
        action: "REACTIVATE",
        old_data: oldUser,
        new_data: { is_active: 1 },
      });

      res.status(200).json({ success: true, message: "User reactivated successfully" });
    } catch (err) {
      return handleError(err, req, res, "reactivateUser");
    }
  },

  // â”€â”€ Student users (students table retired) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Guarded by manage_students:{view,create,edit,delete,import} â€”
  // the same permission the old /api/students routes used, so
  // today's staff access is preserved exactly.

  async listStudentUsers(req, res) {
    try {
      const filters = {
        search: req.query.search,
        is_active: req.query.is_active === "true" ? 1 : req.query.is_active === "false" ? 0 : undefined,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort: req.query.sort || "created_at",
        order: req.query.order || "desc",
      };
      const result = await usersService.listStudentUsers(getRequester(req), filters, req.schoolScope);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filters.limit) || 1,
        },
      });
    } catch (err) {
      console.error("[UsersController.listStudentUsers] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async getStudentStats(req, res) {
    try {
      const stats = await usersService.getStudentUserStats(req.schoolScope);
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      console.error("[UsersController.getStudentStats] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async searchStudentUsers(req, res) {
    try {
      const term = req.query.q || req.query.term || "";
      if (!term.trim()) {
        return res.status(200).json({ success: true, data: [] });
      }
      const rows = await usersService.searchStudentUsers(req.schoolScope, term.trim());
      res.status(200).json({ success: true, data: rows });
    } catch (err) {
      console.error("[UsersController.searchStudentUsers] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async getStudentByStudentIdNumber(req, res) {
    try {
      const { studentIdNumber } = req.params;
      const user = await usersService.getStudentUserByStudentId(studentIdNumber);
      if (!user) {
        return res.status(404).json({ success: false, error: "Student not found" });
      }
      // School scope check (no existence leak for other schools).
      if (req.schoolScope?.scoped && req.schoolScope.schoolId != null
          && user.school_id != null && user.school_id !== req.schoolScope.schoolId) {
        return res.status(404).json({ success: false, error: "Student not found" });
      }
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      console.error("[UsersController.getStudentByStudentIdNumber] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async checkStudentIdExists(req, res) {
    try {
      const studentIdNumber = req.body?.student_id_number;
      if (!studentIdNumber?.trim()) {
        return res.status(400).json({ success: false, error: "Student ID number is required" });
      }
      const usersRepo = require("./users.repository");
      const existing = await usersRepo.findByStudentIdNumber(studentIdNumber.trim());
      res.status(200).json({ success: true, exists: !!existing });
    } catch (err) {
      console.error("[UsersController.checkStudentIdExists] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async getStudentUserById(req, res) {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(404).json({ success: false, error: "Student not found" });
      const user = await usersService.getStudentUserById(req.schoolScope, id);
      if (!user) {
        return res.status(404).json({ success: false, error: "Student not found" });
      }
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      console.error("[UsersController.getStudentUserById] Error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  },

  async createStudentUser(req, res) {
    const validation = validateCreateStudentUser(req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    const requester = getRequester(req);
    try {
      const { id } = await usersService.createStudentUser(requester, req.body, req.schoolScope);

      await auditService.logAction(req, {
        entity_type: "student_user",
        entity_id: id,
        action: "CREATE",
        old_data: null,
        new_data: {
          student_id_number: req.body.student_id_number,
          name: req.body.full_name || req.body.display_name || req.body.student_name || null,
        },
      });

      res.status(201).json({ success: true, data: { id }, message: "Student created successfully" });
    } catch (err) {
      return handleError(err, req, res, "createStudentUser");
    }
  },

  async updateStudentUser(req, res) {
    const validation = validateUpdateStudentUser(req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return validationErr;

    const requester = getRequester(req);
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ success: false, error: "Student not found" });
    try {
      const updated = await usersService.updateStudentUser(requester, id, req.body, req.schoolScope);

      await auditService.logAction(req, {
        entity_type: "student_user",
        entity_id: id,
        action: "UPDATE",
        old_data: null,
        new_data: { student_id_number: req.body.student_id_number ?? null },
      });

      res.status(200).json({ success: true, data: updated, message: "Student updated successfully" });
    } catch (err) {
      return handleError(err, req, res, "updateStudentUser");
    }
  },

  async deleteStudentUser(req, res) {
    const requester = getRequester(req);
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ success: false, error: "Student not found" });
    try {
      const affected = await usersService.deleteStudentUser(requester, id, req.schoolScope);
      if (!affected) {
        return res.status(404).json({ success: false, error: "Student not found or already deactivated" });
      }

      await auditService.logAction(req, {
        entity_type: "student_user",
        entity_id: id,
        action: "DEACTIVATE",
        old_data: null,
        new_data: { is_active: 0 },
      });

      res.status(200).json({ success: true, message: "Student deactivated successfully" });
    } catch (err) {
      return handleError(err, req, res, "deleteStudentUser");
    }
  },

  async bulkImportStudentUsers(req, res) {
    const requester = getRequester(req);
    try {
      const report = await usersService.bulkImportStudentUsers(requester, req.body, req.schoolScope);

      await auditService.logAction(req, {
        entity_type: "student_user",
        entity_id: null,
        action: "BULK_IMPORT",
        old_data: null,
        new_data: { imported: report.imported, failed: report.failed },
      });

      res.status(201).json({
        success: true,
        data: report,
        message: `Bulk import completed: ${report.imported} imported, ${report.failed} failed`,
      });
    } catch (err) {
      return handleError(err, req, res, "bulkImportStudentUsers");
    }
  },
};

module.exports = UsersController;
