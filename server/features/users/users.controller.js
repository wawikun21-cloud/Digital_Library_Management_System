const usersService = require("./users.service");
const rolesFeature = require("../roles");
const auditService = require("../../services/auditService");
const {
  validateCreateUser,
  validateUpdateUser,
  validateChangeRole,
  validateChangePassword,
  validateListQuery,
} = require("./users.validation");

function getRequester(req) {
  return {
    id: req.session?.user?.id,
    username: req.session?.user?.username,
    role: req.session?.user?.role,
  };
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
        is_active: req.query.is_active === "true" ? 1 : req.query.is_active === "false" ? 0 : undefined,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort: req.query.sort || "created_at",
        order: req.query.order || "desc",
      };

      const result = await usersService.listUsers(getRequester(req), filters);
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
      const stats = await usersService.getUserStats();
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
      const user = await usersService.getUserById(parseInt(req.params.id));
      if (!user) {
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
      const { id } = await usersService.createUser(requester, req.body);

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
      const affected = await usersService.updateUser(requester, id, req.body);
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
};

module.exports = UsersController;
