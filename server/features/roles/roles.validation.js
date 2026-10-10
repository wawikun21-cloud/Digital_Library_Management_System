// ─────────────────────────────────────────────────────────
//  features/roles/roles.validation.js
//  Hand-rolled validators — this project has no express-validator.
//  Every module returns { errors, isValid } like users.validation.js.
// ─────────────────────────────────────────────────────────

const { PERMISSION_CATALOG, ENTITY_TYPES } = require("./permissionCatalog");
const rolesRepo = require("./roles.repository");

const VALID_ROLE_NAMES = ["super_admin", "admin", "librarian", "staff", "student"];
const MAX_ACTION_LENGTH = 50;

function isStringArray(value) {
  return Array.isArray(value) && value.every((v) => typeof v === "string" && v.trim().length > 0);
}

function validateActionsAgainstDefined(actions, defined, errors, field = "actions") {
  if (actions === null || actions === undefined) return; // null = all defined
  if (!isStringArray(actions)) {
    errors[field] = "Actions must be an array of strings";
    return;
  }
  const invalid = actions.filter((a) => !defined.includes(a));
  if (invalid.length) {
    errors[field] = `Unknown actions for this permission: ${invalid.join(", ")}`;
  }
}

async function validateRoleName(roleName, errors) {
  if (!VALID_ROLE_NAMES.includes(roleName)) {
    errors.role = `Role must be one of: ${VALID_ROLE_NAMES.join(", ")}`;
    return null;
  }
  const role = await rolesRepo.findRoleByName(roleName);
  if (!role) {
    errors.role = "Role not found";
    return null;
  }
  return role;
}

/**
 * Only requires that the role exists — custom roles created through the
 * management UI must be editable too. Use this for anything the UI applies
 * to an arbitrary role; `validateRoleName` is for the fixed seed roles.
 */
async function validateRoleExists(roleName, errors) {
  if (typeof roleName !== "string" || !roleName.trim()) {
    errors.role = "role is required";
    return null;
  }
  const role = await rolesRepo.findRoleByName(roleName);
  if (!role) {
    errors.role = "Role not found";
    return null;
  }
  return role;
}

/** PUT /permissions/:roleName  → { grants: [{ permission_name, actions }] } */
async function validateSaveRolePermissions(roleName, data) {
  const errors = {};

  await validateRoleExists(roleName, errors);

  if (!Array.isArray(data.grants)) {
    errors.grants = "grants must be an array";
    return { errors, isValid: false };
  }

  for (let i = 0; i < data.grants.length; i++) {
    const grant = data.grants[i] || {};
    const key = `grants[${i}]`;

    if (typeof grant.permission_name !== "string" || !grant.permission_name.trim()) {
      errors[key] = "permission_name is required";
      continue;
    }

    const perm = await rolesRepo.findPermissionByName(grant.permission_name);
    if (!perm) {
      errors[key] = `Unknown permission: ${grant.permission_name}`;
      continue;
    }
    if (!perm.is_active) {
      errors[key] = `Permission is inactive: ${grant.permission_name}`;
      continue;
    }

    validateActionsAgainstDefined(grant.actions, perm.actions ?? [], errors, `${key}.actions`);
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
}

/** PUT /users/:userId/overrides  → { overrides: [{ permission_name, granted, actions }] } */
async function validateSaveUserOverrides(userId, data) {
  const errors = {};

  const user = await rolesRepo.findUserById(userId);
  if (!user) {
    errors.user = "User not found";
    return { errors, isValid: false, user: null };
  }

  if (!Array.isArray(data.overrides)) {
    errors.overrides = "overrides must be an array";
    return { errors, isValid: false, user };
  }

  const roleGrantNames = new Set(
    (await rolesRepo.getRoleGrants(user.role)).map((r) => r.permission_name)
  );

  for (let i = 0; i < data.overrides.length; i++) {
    const override = data.overrides[i] || {};
    const key = `overrides[${i}]`;

    if (typeof override.permission_name !== "string" || !override.permission_name.trim()) {
      errors[key] = "permission_name is required";
      continue;
    }

    const perm = await rolesRepo.findPermissionByName(override.permission_name);
    if (!perm) {
      errors[key] = `Unknown permission: ${override.permission_name}`;
      continue;
    }

    // Deny-only model — the role must already grant the permission.
    if (!roleGrantNames.has(perm.name)) {
      errors[key] = `Role '${user.role}' does not grant ${perm.name}`;
      continue;
    }

    if (override.granted !== undefined && typeof override.granted !== "boolean") {
      errors[key] = "granted must be a boolean";
    }

    validateActionsAgainstDefined(override.actions, perm.actions ?? [], errors, `${key}.actions`);
  }

  return { errors, isValid: Object.keys(errors).length === 0, user };
}

/** PUT /users/:userId/entity-overrides → { rows: [{ entity_type, entity_id, granted }] } */
async function validateEntityRows(rows, errors, field = "rows") {
  if (!Array.isArray(rows)) {
    errors[field] = `${field} must be an array`;
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const key = `${field}[${i}]`;

    if (!ENTITY_TYPES.includes(row.entity_type)) {
      errors[key] = `entity_type must be one of: ${ENTITY_TYPES.join(", ")}`;
    }
    if (!Number.isInteger(Number(row.entity_id)) || Number(row.entity_id) <= 0) {
      errors[key] = "entity_id must be a positive integer";
    }
    if (row.granted !== undefined && typeof row.granted !== "boolean") {
      errors[key] = "granted must be a boolean";
    }
  }
}

async function validateSaveUserEntityOverrides(userId, data) {
  const errors = {};
  const user = await rolesRepo.findUserById(userId);
  if (!user) {
    errors.user = "User not found";
    return { errors, isValid: false, user: null };
  }
  validateEntityRows(data.rows, errors);
  return { errors, isValid: Object.keys(errors).length === 0, user };
}

async function validateSaveRoleEntityPermissions(roleName, data) {
  const errors = {};
  await validateRoleExists(roleName, errors);
  validateEntityRows(data.rows, errors);
  return { errors, isValid: Object.keys(errors).length === 0 };
}

/** POST /users/:userId/full-save → { overrides, entity_overrides } */
async function validateSaveUserFull(userId, data) {
  const errors = {};
  const user = await rolesRepo.findUserById(userId);
  if (!user) {
    errors.user = "User not found";
    return { errors, isValid: false, user: null };
  }
  validateEntityRows(data.entity_overrides, errors, "entity_overrides");

  const roleGrantNames = new Set(
    (await rolesRepo.getRoleGrants(user.role)).map((r) => r.permission_name)
  );

  const overrides = Array.isArray(data.overrides) ? data.overrides : [];
  if (data.overrides !== undefined && !Array.isArray(data.overrides)) {
    errors.overrides = "overrides must be an array";
  }

  for (let i = 0; i < overrides.length; i++) {
    const override = overrides[i] || {};
    const key = `overrides[${i}]`;
    if (typeof override.permission_name !== "string" || !override.permission_name.trim()) {
      errors[key] = "permission_name is required";
      continue;
    }
    const perm = await rolesRepo.findPermissionByName(override.permission_name);
    if (!perm) {
      errors[key] = `Unknown permission: ${override.permission_name}`;
      continue;
    }
    if (!roleGrantNames.has(perm.name)) {
      errors[key] = `Role '${user.role}' does not grant ${perm.name}`;
      continue;
    }
    if (override.granted !== undefined && typeof override.granted !== "boolean") {
      errors[key] = "granted must be a boolean";
    }
    validateActionsAgainstDefined(override.actions, perm.actions ?? [], errors, `${key}.actions`);
  }

  return { errors, isValid: Object.keys(errors).length === 0, user };
}

/** GET /entities?type=&search= */
function validateEntityQuery(query) {
  const errors = {};
  if (!ENTITY_TYPES.includes(query.type)) {
    errors.type = `type must be one of: ${ENTITY_TYPES.join(", ")}`;
  }
  if (query.search !== undefined && typeof query.search !== "string") {
    errors.search = "search must be a string";
  }
  if (typeof query.search === "string" && query.search.length > MAX_ACTION_LENGTH * 4) {
    errors.search = "search is too long";
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

/** POST /  — create a role */
async function validateCreateRole(data) {
  const errors = {};

  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    errors.name = "Role name is required";
  } else if (!/^[a-z][a-z0-9_]{1,49}$/.test(name)) {
    errors.name = "Role name must be 2-50 lowercase letters, digits or underscores, starting with a letter";
  }

  const displayName = typeof data.display_name === "string" ? data.display_name.trim() : "";
  if (!displayName) {
    errors.display_name = "Display name is required";
  } else if (displayName.length > 100) {
    errors.display_name = "Display name must be 100 characters or fewer";
  }

  if (data.description !== undefined && typeof data.description !== "string") {
    errors.description = "Description must be a string";
  }

  // The service owns the duplicate check so it returns 409 rather than a
  // generic 400 validation error.

  return { errors, isValid: Object.keys(errors).length === 0 };
}

/** PUT /:roleName  — edit role metadata */
async function validateUpdateRole(roleName, data) {
  const errors = {};

  await validateRoleExists(roleName, errors);

  if (
    data.display_name === undefined &&
    data.description === undefined
  ) {
    errors.body = "No changes provided";
  }

  if (data.display_name !== undefined) {
    const displayName = typeof data.display_name === "string" ? data.display_name.trim() : "";
    if (!displayName) errors.display_name = "Display name is required";
    else if (displayName.length > 100) errors.display_name = "Display name must be 100 characters or fewer";
  }

  if (data.description !== undefined && typeof data.description !== "string") {
    errors.description = "Description must be a string";
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
}

/** DELETE /:roleName */
async function validateDeleteRole(roleName) {
  const errors = {};
  const role = await validateRoleExists(roleName, errors);
  if (!role) return { errors, isValid: false, role: null };

  // Whether the role still has users is checked in the service, which
  // reports it as 409 (conflict) rather than a generic validation error.
  return { errors, isValid: true, role };
}

module.exports = {
  VALID_ROLE_NAMES,
  validateSaveRolePermissions,
  validateSaveUserOverrides,
  validateSaveUserEntityOverrides,
  validateSaveRoleEntityPermissions,
  validateSaveUserFull,
  validateEntityQuery,
  validateCreateRole,
  validateUpdateRole,
  validateDeleteRole,
};
