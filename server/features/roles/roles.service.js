// ─────────────────────────────────────────────────────────
//  features/roles/roles.service.js
//  Business rules for the granular permission system:
//    • parseActions / applyOverride (pure, unit-tested)
//    • resolveUserPermissions / resolveUserPermissionDetails
//    • resolveUserEntityOverrides / resolveRoleEntityPermissions
//    • use cases consumed by roles.controller.js
// ─────────────────────────────────────────────────────────

const ROLES = require("../../middleware/authMiddleware").ROLES;
const rolesRepo = require("./roles.repository");
const {
  PERMISSION_CATALOG,
  PERMISSION_CATEGORIES,
  SEED_ROLE_GRANTS,
  ENTITY_TYPES,
  getPermissionDefinition,
} = require("./permissionCatalog");

const ALL_ROLE_NAMES = Object.keys(SEED_ROLE_GRANTS);

// ─────────────────────────────────────────────────────────
//  Pure helpers
// ─────────────────────────────────────────────────────────

/**
 * Derive a sensible action set from a permission name when the stored
 * value is unusable. Never returns "all defined" for a name we know.
 */
function fallbackActions(permissionName) {
  if (!permissionName || typeof permissionName !== "string") return null;
  if (permissionName.startsWith("view_")) return ["view"];
  if (permissionName.startsWith("manage_")) return ["view", "create", "edit", "delete"];
  const parts = permissionName.split(".");
  if (parts.length === 2) return ["view", parts[1]];
  return null;
}

/**
 * Normalize an `actions` column value into a canonical form.
 *
 *  • null                       → null   (means "all defined actions")
 *  • array / JSON array string  → de-duplicated string array (may be empty)
 *  • JSON scalar string         → comma-split into actions
 *  • anything else (number, object, missing column) → derived from the
 *    permission name, so a corrupt row can never widen access
 *
 * mysql2 returns JSON columns already parsed, so the array branch is the
 * common one; the JSON-string branch covers drivers/configs that hand
 * back raw text.
 */
function parseActions(value, permissionName = null) {
  if (value === null) return null;
  if (value === undefined) return fallbackActions(permissionName);

  let list = value;
  if (typeof list === "string") {
    const trimmed = list.trim();
    if (!trimmed) return null;
    try {
      list = JSON.parse(trimmed);
    } catch {
      list = trimmed;
    }
  }

  // JSON scalar (e.g. '"view"') → still a single action
  if (typeof list === "string") list = list.split(",");

  if (!Array.isArray(list)) return fallbackActions(permissionName);

  const cleaned = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const action = item.trim();
    if (action && !cleaned.includes(action)) cleaned.push(action);
  }
  return cleaned;
}

function definedActions(permissionName) {
  return getPermissionDefinition(permissionName)?.actions ?? [];
}

/** Effective role actions for a permission (role ∩ defined). */
function effectiveRoleActions(roleActions, permissionName) {
  const defined = definedActions(permissionName);
  if (roleActions === null || roleActions === undefined) return [...defined];
  return defined.filter((action) => roleActions.includes(action));
}

/**
 * Apply a single user override on top of a role grant.
 *
 * Semantics (LMS-SOP deny-only model):
 *   granted = false                       → []            (dropped)
 *   override.actions = null               → role ∩ defined (unchanged set)
 *   override.actions = [...]              → role ∩ override ∩ defined
 *
 * Overrides for permissions the role does not grant are ignored by the
 * caller — a user can never gain a permission their role lacks.
 */
function applyOverride(roleActions, definedActionList, override) {
  const defined = Array.isArray(definedActionList) ? definedActionList : [];
  if (!override || !override.granted) return [];

  const roleEffective = roleActions === null || roleActions === undefined
    ? [...defined]
    : defined.filter((action) => roleActions.includes(action));

  if (override.actions === null || override.actions === undefined) {
    return roleEffective;
  }

  const wanted = Array.isArray(override.actions) ? override.actions : [];
  return roleEffective.filter((action) => wanted.includes(action));
}

// ─────────────────────────────────────────────────────────
//  Resolvers
// ─────────────────────────────────────────────────────────

/**
 * Resolve everything the guards and the auth responses need.
 * Returns { permissions, permissionDetails, entityOverrides }.
 *
 * super_admin short-circuits: every permission, every action.
 */
async function resolveUser(user) {
  if (!user) {
    return { permissions: [], permissionDetails: {}, entityOverrides: {} };
  }

  if (user.role === ROLES.SUPER_ADMIN) {
    const permissionDetails = {};
    const permissions = [];
    for (const perm of PERMISSION_CATALOG) {
      permissions.push(perm.name);
      permissionDetails[perm.name] = {
        granted: true,
        actions: [...perm.actions],
        overridden: false,
        role_actions: null,
      };
    }
    return { permissions, permissionDetails, entityOverrides: {} };
  }

  const [definedRows, roleGrantRows, overrideRows, entityOverrideRows] = await Promise.all([
    rolesRepo.resolveDefinedPermissions(),
    rolesRepo.resolveRoleGrants(user.role),
    rolesRepo.resolveUserOverrides(user.id),
    rolesRepo.resolveUserEntityOverrides(user.id),
  ]);

  const definedByName = {};
  for (const row of definedRows) {
    definedByName[row.name] = parseActions(row.actions, row.name) ?? [];
  }

  const roleGrants = {};
  for (const row of roleGrantRows) {
    roleGrants[row.permission_name] = parseActions(row.actions, row.permission_name);
  }

  const overrides = {};
  for (const row of overrideRows) {
    overrides[row.permission_name] = {
      granted: !!row.granted,
      actions: parseActions(row.actions, row.permission_name),
    };
  }

  const permissions = [];
  const permissionDetails = {};

  for (const perm of PERMISSION_CATALOG) {
    const defined = definedByName[perm.name] ?? perm.actions ?? [];
    if (!defined.length) continue;

    // Not granted by the role → overrides on it are ignored entirely.
    if (!Object.prototype.hasOwnProperty.call(roleGrants, perm.name)) {
      continue;
    }

    const override = overrides[perm.name];
    const actions = override
      ? applyOverride(roleGrants[perm.name], defined, override)
      : effectiveRoleActions(roleGrants[perm.name], perm.name);

    if (!actions.length) continue;

    permissions.push(perm.name);
    permissionDetails[perm.name] = {
      granted: true,
      actions,
      overridden: !!override,
      role_actions: roleGrants[perm.name],
    };
  }

  return {
    permissions,
    permissionDetails,
    entityOverrides: shapeEntityOverrides(entityOverrideRows),
  };
}

/** Flat list of granted permission names (nav + route gating). */
async function resolveUserPermissions(user) {
  const { permissions } = await resolveUser(user);
  return permissions;
}

/** Per-permission detail (action-level button gating). */
async function resolveUserPermissionDetails(user) {
  const { permissionDetails } = await resolveUser(user);
  return permissionDetails;
}

/** Allowlist semantics: rows exist ⇒ only listed entities are reachable. */
function shapeEntityOverrides(rows) {
  const byType = {};
  for (const row of rows || []) {
    const type = row.entity_type;
    if (!ENTITY_TYPES.includes(type)) continue;
    if (!byType[type]) byType[type] = { granted: [], denied: [] };
    (row.granted ? byType[type].granted : byType[type].denied).push(Number(row.entity_id));
  }

  const shaped = {};
  for (const type of Object.keys(byType)) {
    const { granted, denied } = byType[type];
    shaped[type] = denied.length
      ? { scope: "denied", entity_ids: denied }
      : { scope: "selected", entity_ids: granted };
  }
  return shaped;
}

async function resolveUserEntityOverrides(user) {
  if (!user || user.role === ROLES.SUPER_ADMIN) return {};
  const rows = await rolesRepo.resolveUserEntityOverrides(user.id);
  return shapeEntityOverrides(rows);
}

/** Is this entity reachable given the user's entity overrides? */
function isEntityAllowed(entityOverrides, entityType, entityId) {
  const entry = entityOverrides?.[entityType];
  if (!entry) return true;
  const id = Number(entityId);
  if (entry.scope === "denied") return !entry.entity_ids.includes(id);
  return entry.entity_ids.includes(id);
}

async function canUserAccessEntity(user, entityType, entityId) {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  const overrides = await resolveUserEntityOverrides(user);
  return isEntityAllowed(overrides, entityType, entityId);
}

/**
 * Payload attached to login / me / getCurrentUser responses.
 * Never persisted into the session — express-session would otherwise
 * write to the store on every request.
 */
async function getAuthPermissionPayload(user) {
  if (!user) {
    return { permissions: [], permission_details: {}, entity_overrides: {} };
  }
  try {
    const resolved = await resolveUser(user);
    return {
      permissions: resolved.permissions,
      permission_details: resolved.permissionDetails,
      entity_overrides: resolved.entityOverrides,
    };
  } catch (err) {
    console.error("[RolesService] Failed to resolve permissions:", err.message);
    return { permissions: [], permission_details: {}, entity_overrides: {} };
  }
}

// ─────────────────────────────────────────────────────────
//  Use cases
// ─────────────────────────────────────────────────────────

async function getRoles() {
  const rows = await rolesRepo.listRoles();
  return rows.map((row) => ({
    name: row.name,
    display_name: row.display_name,
    description: row.description,
    permission_count: Number(row.permission_count),
    user_count: Number(row.user_count),
    permissions: SEED_ROLE_GRANTS[row.name] || [],
  }));
}

async function getPermissions() {
  const rows = await rolesRepo.listPermissions();
  return rows.map((row) => ({
    name: row.name,
    display_name: row.display_name,
    category: row.category,
    category_label: PERMISSION_CATEGORIES[row.category] || row.category,
    actions: parseActions(row.actions, row.name) ?? [],
    is_active: !!row.is_active,
  }));
}

async function getRoleDetail(roleName) {
  const role = await rolesRepo.findRoleByName(roleName);
  if (!role) return null;

  const [grantRows, permissionRows, entityRows] = await Promise.all([
    rolesRepo.getRoleGrants(roleName),
    rolesRepo.listPermissions(),
    rolesRepo.getRoleEntityPermissions(roleName),
  ]);

  const grantedByName = {};
  for (const row of grantRows) {
    grantedByName[row.permission_name] = parseActions(row.actions, row.permission_name);
  }

  return {
    role,
    grants: Object.keys(grantedByName),
    permissions: permissionRows.map((row) => ({
      name: row.name,
      display_name: row.display_name,
      category: row.category,
      category_label: PERMISSION_CATEGORIES[row.category] || row.category,
      actions: parseActions(row.actions, row.name) ?? [],
    })),
    role_actions: grantedByName,
    entity_overrides: shapeEntityOverrides(entityRows),
  };
}

async function saveRolePermissions(roleName, grants, grantedBy) {
  const rows = [];
  for (const grant of grants) {
    const perm = await rolesRepo.findPermissionByName(grant.permission_name);
    if (!perm || !perm.is_active) {
      const err = new Error(`Unknown permission: ${grant.permission_name}`);
      err.code = "BAD_REQUEST";
      throw err;
    }
    const defined = parseActions(perm.actions, perm.name) ?? [];

    // `null` means "every defined action". An explicit list must intersect,
    // otherwise the client is sending an action this permission cannot have.
    let actions = null;
    if (grant.actions !== null && grant.actions !== undefined) {
      const requested = Array.isArray(grant.actions) ? grant.actions : [];
      actions = defined.filter((a) => requested.includes(a));
      if (requested.length > 0 && !actions.length) {
        throw Object.assign(
          new Error(`None of the requested actions are defined for '${perm.name}': ${requested.join(", ")}`),
          { code: "BAD_REQUEST" }
        );
      }
    }

    rows.push({
      permission_name: perm.name,
      actions,
    });
  }

  await rolesRepo.replaceRoleGrants(roleName, grantedBy, rows);
  return getRoleDetail(roleName);
}

async function restoreRoleDefaults(roleName, grantedBy) {
  if (!ALL_ROLE_NAMES.includes(roleName)) {
    const err = new Error("Unknown role");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const defaults = (SEED_ROLE_GRANTS[roleName] || []).map((name) => ({
    permission_name: name,
    actions: null,
  }));
  await rolesRepo.replaceRoleGrants(roleName, grantedBy, defaults);
  return getRoleDetail(roleName);
}

// ── Role CRUD (LMS-SOP parity) ────────────────────────────

async function createRole({ name, display_name, description }) {
  const existing = await rolesRepo.findRoleByName(name);
  if (existing) {
    const err = new Error("Role name already exists");
    err.code = "CONFLICT";
    throw err;
  }
  // API-created roles are never system roles.
  await rolesRepo.insertRole({ name, display_name, description, is_system: false });
  return getRoleDetail(name);
}

async function updateRole(roleName, fields) {
  const role = await rolesRepo.findRoleByName(roleName);
  if (!role) {
    const err = new Error("Role not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  // Only metadata a Super Admin can meaningfully change. `is_active` is
  // deliberately NOT accepted: DLMS has no inactive-role concept and the
  // permission resolver would ignore it, so honouring it here would be a
  // silent lie about the role still granting access.
  const allowed = {};
  if (fields.display_name !== undefined) allowed.display_name = String(fields.display_name).trim();
  if (fields.description !== undefined) allowed.description = fields.description;

  if (!Object.keys(allowed).length) {
    const err = new Error("No changes provided");
    err.code = "BAD_REQUEST";
    throw err;
  }

  await rolesRepo.updateRoleMeta(roleName, allowed);
  return getRoleDetail(roleName);
}

async function deleteRole(roleName) {
  const role = await rolesRepo.findRoleByName(roleName);
  if (!role) {
    const err = new Error("Role not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  // Mirrors LMS-SOP: a role still assigned to users cannot be removed.
  const userCount = await rolesRepo.countUsersWithRole(roleName);
  if (userCount > 0) {
    const err = new Error(
      `"${role.display_name}" is assigned to ${userCount} user${userCount === 1 ? "" : "s"}. Reassign them before deleting.`
    );
    err.code = "CONFLICT";
    throw err;
  }
  await rolesRepo.deleteRole(roleName);
  return { deleted: roleName };
}

async function saveRoleEntityPermissions(roleName, rows, updatedBy) {
  await rolesRepo.replaceRoleEntityPermissions(roleName, updatedBy, rows);
  return getRoleDetail(roleName);
}

/**
 * Whole editor context for one user, in a single response:
 * user, role, role grants (with role_actions), all permissions with
 * defined actions, the user's overrides, entity overrides.
 */
async function getUserEditorContext(userId) {
  const user = await rolesRepo.findUserById(userId);
  if (!user) return null;

  const [permissionRows, overrideRows, entityRows] = await Promise.all([
    rolesRepo.listPermissions(),
    rolesRepo.getUserOverrides(userId),
    rolesRepo.getUserEntityOverrides(userId),
  ]);

  const roleDetail = await getRoleDetail(user.role);

  const overrideByName = {};
  for (const row of overrideRows) {
    overrideByName[row.permission_name] = {
      granted: !!row.granted,
      actions: parseActions(row.actions, row.permission_name),
    };
  }

  return {
    user,
    role: roleDetail?.role ?? null,
    role_grants: roleDetail?.grants ?? [],
    role_actions: roleDetail?.role_actions ?? {},
    permissions: roleDetail?.permissions ?? permissionRows.map((row) => ({
      name: row.name,
      display_name: row.display_name,
      category: row.category,
      category_label: PERMISSION_CATEGORIES[row.category] || row.category,
      actions: parseActions(row.actions, row.name) ?? [],
    })),
    overrides: overrideByName,
    entity_overrides: shapeEntityOverrides(entityRows),
  };
}

async function saveUserOverrides(userId, overrides, updatedBy) {
  const user = await rolesRepo.findUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const roleGrants = {};
  for (const row of await rolesRepo.getRoleGrants(user.role)) {
    roleGrants[row.permission_name] = parseActions(row.actions, row.permission_name);
  }

  const rows = [];
  for (const override of overrides) {
    // Deny-only model: overrides on permissions the role lacks are ignored.
    if (!Object.prototype.hasOwnProperty.call(roleGrants, override.permission_name)) continue;

    const perm = await rolesRepo.findPermissionByName(override.permission_name);
    if (!perm) continue;

    const defined = parseActions(perm.actions, perm.name) ?? [];
    const actions = override.actions === null || override.actions === undefined
      ? null
      : defined.filter((a) => override.actions.includes(a));

    rows.push({
      permission_name: override.permission_name,
      granted: override.granted === false ? false : true,
      actions,
    });
  }

  await rolesRepo.replaceUserOverrides(userId, updatedBy, rows);
  return getUserEditorContext(userId);
}

async function saveUserEntityOverrides(userId, rows, updatedBy) {
  const user = await rolesRepo.findUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  await rolesRepo.replaceUserEntityOverrides(userId, updatedBy, rows);
  return getUserEditorContext(userId);
}

/**
 * Save overrides + entity overrides for one user atomically, optionally
 * changing the user's role in the same transaction (LMS-SOP parity).
 */
async function saveUserFull(userId, payload, updatedBy) {
  const user = await rolesRepo.findUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const newRole = payload.role && payload.role !== user.role ? payload.role : null;
  if (newRole && !ALL_ROLE_NAMES.includes(newRole)) {
    const err = new Error(`Unknown role: ${newRole}`);
    err.code = "BAD_REQUEST";
    throw err;
  }

  await rolesRepo.saveUserFull(
    userId,
    updatedBy,
    payload.overrides || [],
    payload.entity_overrides || [],
    newRole
  );
  return getUserEditorContext(userId);
}

async function getEntities(entityType, search) {
  if (!ENTITY_TYPES.includes(entityType)) {
    const err = new Error(`Unknown entity type: ${entityType}`);
    err.code = "BAD_REQUEST";
    throw err;
  }
  return rolesRepo.listEntities(entityType, search);
}

module.exports = {
  parseActions,
  applyOverride,
  effectiveRoleActions,
  resolveUser,
  resolveUserPermissions,
  resolveUserPermissionDetails,
  resolveUserEntityOverrides,
  resolveRoleEntityPermissions: async (roleName) =>
    shapeEntityOverrides(await rolesRepo.getRoleEntityPermissions(roleName)),
  shapeEntityOverrides,
  isEntityAllowed,
  canUserAccessEntity,
  getAuthPermissionPayload,
  getRoles,
  getPermissions,
  getRoleDetail,
  saveRolePermissions,
  restoreRoleDefaults,
  createRole,
  updateRole,
  deleteRole,
  saveRoleEntityPermissions,
  getUserEditorContext,
  saveUserOverrides,
  saveUserEntityOverrides,
  saveUserFull,
  getEntities,
  ALL_ROLE_NAMES,
  ENTITY_TYPES,
};
