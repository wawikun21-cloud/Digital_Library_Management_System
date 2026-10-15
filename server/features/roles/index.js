// ─────────────────────────────────────────────────────────
//  features/roles/index.js
//  Public API of the roles feature. Other features and route
//  files import ONLY through this barrel — never deep into
//  another feature's internals.
// ─────────────────────────────────────────────────────────

const { ROLES, requireAuth } = require("../../middleware/authMiddleware");
const guards = require("./permissionGuards");
const rolesService = require("./roles.service");

module.exports = {
  // Router for server/index.js
  router: require("./roles.routes"),

  // Guards used by retrofitted route files. requireAuth is re-exported so
  // every guard a route needs comes from this one barrel.
  requireAuth,
  resolvePermissions:    guards.resolvePermissions,
  requirePermission:     guards.requirePermission,
  requirePermissionAction: guards.requirePermissionAction,
  requireEntityTypeAccess: guards.requireEntityTypeAccess,
  canAccessEntity:       guards.canAccessEntity,
  userHasPermission:     guards.userHasPermission,

  // Resolvers used by the auth response wiring
  getAuthPermissionPayload:  rolesService.getAuthPermissionPayload,
  resolveUserPermissions:    rolesService.resolveUserPermissions,
  resolveUser:               rolesService.resolveUser,

  // Role constants (single source of truth lives in authMiddleware)
  ROLES,
};