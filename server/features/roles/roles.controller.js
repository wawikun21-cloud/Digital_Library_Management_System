// ─────────────────────────────────────────────────────────
//  features/roles/roles.controller.js
//  Thin: parse request → call service → return response.
//  Every save is audited (PERM_UPDATE / USER_PERM_UPDATE /
//  ENTITY_PERM_UPDATE — all ≤ 20 chars for audit_logs.action).
// ─────────────────────────────────────────────────────────

const rolesService = require("./roles.service");
const auditService = require("../../services/auditService");
const {
  validateSaveRolePermissions,
  validateSaveUserOverrides,
  validateSaveUserEntityOverrides,
  validateSaveRoleEntityPermissions,
  validateSaveUserFull,
  validateEntityQuery,
  validateCreateRole,
  validateUpdateRole,
  validateDeleteRole,
} = require("./roles.validation");

function getActorId(req) {
  return req.session?.user?.id ?? null;
}

function handleValidationError(res, validation) {
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    return res.status(400).json({ success: false, error: firstError });
  }
  return null;
}

function handleError(err, res, action) {
  if (err.code === "NOT_FOUND") {
    return res.status(404).json({ success: false, error: err.message });
  }
  if (err.code === "CONFLICT") {
    return res.status(409).json({ success: false, error: err.message });
  }
  if (err.code === "BAD_REQUEST") {
    return res.status(400).json({ success: false, error: err.message });
  }
  console.error(`[RolesController.${action}] Error:`, err);
  return res.status(500).json({ success: false, error: "Internal server error" });
}

const RolesController = {
  /** GET /api/roles/my-permissions — every authenticated role. */
  async getMyPermissions(req, res) {
    try {
      const user = req.session?.user;
      if (!user) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }
      const payload = await rolesService.getAuthPermissionPayload(user);
      return res.status(200).json({ success: true, data: payload });
    } catch (err) {
      return handleError(err, res, "getMyPermissions");
    }
  },

  /** POST /api/roles — create a role (LMS-SOP parity). */
  async createRole(req, res) {
    const validation = await validateCreateRole(req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    try {
      const role = await rolesService.createRole(req.body);

      await auditService.logAction(req, {
        entity_type: "role",
        entity_id: null,
        action: "PERM_UPDATE",
        old_data: null,
        new_data: { created: req.body.name },
      });

      return res.status(201).json({ success: true, data: role, message: "Role created successfully" });
    } catch (err) {
      return handleError(err, res, "createRole");
    }
  },

  /** PUT /api/roles/:roleName — edit role metadata. */
  async updateRole(req, res) {
    const validation = await validateUpdateRole(req.params.roleName, req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    try {
      const role = await rolesService.updateRole(req.params.roleName, req.body);

      await auditService.logAction(req, {
        entity_type: "role",
        entity_id: null,
        action: "PERM_UPDATE",
        old_data: null,
        new_data: { role: req.params.roleName, updates: req.body },
      });

      return res.status(200).json({ success: true, data: role, message: "Role updated successfully" });
    } catch (err) {
      return handleError(err, res, "updateRole");
    }
  },

  /** DELETE /api/roles/:roleName — refuse while users are assigned. */
  async deleteRole(req, res) {
    const validation = await validateDeleteRole(req.params.roleName);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    try {
      const result = await rolesService.deleteRole(req.params.roleName);

      await auditService.logAction(req, {
        entity_type: "role",
        entity_id: null,
        action: "PERM_UPDATE",
        old_data: { role: req.params.roleName },
        new_data: null,
      });

      return res.status(200).json({ success: true, data: result, message: "Role deleted successfully" });
    } catch (err) {
      return handleError(err, res, "deleteRole");
    }
  },

  /** GET /api/roles */
  async getRoles(req, res) {
    try {
      const data = await rolesService.getRoles();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return handleError(err, res, "getRoles");
    }
  },

  /** GET /api/roles/permissions */
  async getPermissions(req, res) {
    try {
      const data = await rolesService.getPermissions();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return handleError(err, res, "getPermissions");
    }
  },

  /** GET /api/roles/entities?type=books&search= */
  async getEntities(req, res) {
    const validation = validateEntityQuery(req.query);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    try {
      const data = await rolesService.getEntities(req.query.type, req.query.search);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return handleError(err, res, "getEntities");
    }
  },

  /** GET /api/roles/:id — role detail by role name. */
  async getRoleDetail(req, res) {
    try {
      const detail = await rolesService.getRoleDetail(req.params.id);
      if (!detail) {
        return res.status(404).json({ success: false, error: "Role not found" });
      }
      return res.status(200).json({ success: true, data: detail });
    } catch (err) {
      return handleError(err, res, "getRoleDetail");
    }
  },

  /** PUT /api/roles/permissions/:roleName */
  async saveRolePermissions(req, res) {
    const validation = await validateSaveRolePermissions(req.params.roleName, req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    try {
      const detail = await rolesService.saveRolePermissions(
        req.params.roleName,
        req.body.grants,
        getActorId(req)
      );

      await auditService.logAction(req, {
        entity_type: "role",
        entity_id: null,
        action: "PERM_UPDATE",
        old_data: null,
        new_data: { role: req.params.roleName, grants: req.body.grants },
      });

      return res.status(200).json({
        success: true,
        data: detail,
        message: "Role permissions updated",
      });
    } catch (err) {
      return handleError(err, res, "saveRolePermissions");
    }
  },

  /** POST /api/roles/roles/:roleName/restore-defaults */
  async restoreRoleDefaults(req, res) {
    try {
      const detail = await rolesService.restoreRoleDefaults(req.params.roleName, getActorId(req));

      await auditService.logAction(req, {
        entity_type: "role",
        entity_id: null,
        action: "PERM_UPDATE",
        old_data: null,
        new_data: { role: req.params.roleName, restored_defaults: true },
      });

      return res.status(200).json({
        success: true,
        data: detail,
        message: "Role permissions restored to defaults",
      });
    } catch (err) {
      return handleError(err, res, "restoreRoleDefaults");
    }
  },

  /** GET /api/roles/roles/:roleName/entity-permissions */
  async getRoleEntityPermissions(req, res) {
    try {
      const detail = await rolesService.getRoleDetail(req.params.roleName);
      if (!detail) {
        return res.status(404).json({ success: false, error: "Role not found" });
      }
      return res.status(200).json({
        success: true,
        data: { entity_overrides: detail.entity_overrides },
      });
    } catch (err) {
      return handleError(err, res, "getRoleEntityPermissions");
    }
  },

  /** PUT /api/roles/roles/:roleName/entity-permissions */
  async saveRoleEntityPermissions(req, res) {
    const validation = await validateSaveRoleEntityPermissions(req.params.roleName, req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    try {
      const detail = await rolesService.saveRoleEntityPermissions(
        req.params.roleName,
        req.body.rows,
        getActorId(req)
      );

      await auditService.logAction(req, {
        entity_type: "role",
        entity_id: null,
        action: "ENTITY_PERM_UPDATE",
        old_data: null,
        new_data: { role: req.params.roleName, rows: req.body.rows },
      });

      return res.status(200).json({
        success: true,
        data: detail,
        message: "Role entity permissions updated",
      });
    } catch (err) {
      return handleError(err, res, "saveRoleEntityPermissions");
    }
  },

  /** GET /api/roles/users/:userId/permissions — full editor context. */
  async getUserPermissions(req, res) {
    try {
      const context = await rolesService.getUserEditorContext(parseInt(req.params.userId, 10));
      if (!context) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      return res.status(200).json({ success: true, data: context });
    } catch (err) {
      return handleError(err, res, "getUserPermissions");
    }
  },

  /** GET /api/roles/users/:userId/entity-overrides */
  async getUserEntityOverrides(req, res) {
    try {
      const context = await rolesService.getUserEditorContext(parseInt(req.params.userId, 10));
      if (!context) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      return res.status(200).json({
        success: true,
        data: { entity_overrides: context.entity_overrides },
      });
    } catch (err) {
      return handleError(err, res, "getUserEntityOverrides");
    }
  },

  /** PUT /api/roles/users/:userId/overrides */
  async saveUserOverrides(req, res) {
    const validation = await validateSaveUserOverrides(parseInt(req.params.userId, 10), req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    try {
      const context = await rolesService.saveUserOverrides(
        parseInt(req.params.userId, 10),
        req.body.overrides,
        getActorId(req)
      );

      await auditService.logAction(req, {
        entity_type: "user_permissions",
        entity_id: parseInt(req.params.userId, 10),
        action: "USER_PERM_UPDATE",
        old_data: null,
        new_data: { overrides: req.body.overrides },
      });

      return res.status(200).json({
        success: true,
        data: context,
        message: "User permissions updated",
      });
    } catch (err) {
      return handleError(err, res, "saveUserOverrides");
    }
  },

  /** PUT /api/roles/users/:userId/entity-overrides */
  async saveUserEntityOverrides(req, res) {
    const validation = await validateSaveUserEntityOverrides(parseInt(req.params.userId, 10), req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    try {
      const context = await rolesService.saveUserEntityOverrides(
        parseInt(req.params.userId, 10),
        req.body.rows,
        getActorId(req)
      );

      await auditService.logAction(req, {
        entity_type: "user_permissions",
        entity_id: parseInt(req.params.userId, 10),
        action: "ENTITY_PERM_UPDATE",
        old_data: null,
        new_data: { rows: req.body.rows },
      });

      return res.status(200).json({
        success: true,
        data: context,
        message: "User entity access updated",
      });
    } catch (err) {
      return handleError(err, res, "saveUserEntityOverrides");
    }
  },

  /** POST /api/roles/users/:userId/full-save — overrides + entity rows atomically. */
  async saveUserFull(req, res) {
    const userId = parseInt(req.params.userId, 10);
    const validation = await validateSaveUserFull(userId, req.body);
    const validationErr = handleValidationError(res, validation);
    if (validationErr) return;

    try {
      const context = await rolesService.saveUserFull(userId, req.body, getActorId(req));

      await auditService.logAction(req, {
        entity_type: "user_permissions",
        entity_id: userId,
        action: "USER_PERM_UPDATE",
        old_data: null,
        new_data: {
          overrides: req.body.overrides || [],
          entity_overrides: req.body.entity_overrides || [],
        },
      });

      return res.status(200).json({
        success: true,
        data: context,
        message: "User permissions saved",
      });
    } catch (err) {
      return handleError(err, res, "saveUserFull");
    }
  },
};

module.exports = RolesController;
