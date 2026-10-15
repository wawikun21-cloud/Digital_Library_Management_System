// ─────────────────────────────────────────────────────────
//  features/roles/permissionGuards.js
//
//  Route guards for the granular permission system.
//
//  • resolvePermissions      — middleware; attaches resolved data to
//                              req.permissions / req.permissionDetails /
//                              req.entityOverrides. NEVER to req.session
//                              (that would trigger an express-session
//                              store write on every request).
//  • requirePermission       — guard for a bare permission
//  • requirePermissionAction — guard for permission + action
//  • canAccessEntity         — helper for row-level checks
//  • requireEntityTypeAccess — guard factory for entity types
//
//  super_admin short-circuits every check (LMS-SOP parity).
// ─────────────────────────────────────────────────────────

const ROLES = require("../../middleware/authMiddleware").ROLES;
const { requireAuth } = require("../../middleware/authMiddleware");
const rolesService = require("./roles.service");
const { PERMISSION_CATALOG } = require("./permissionCatalog");

const ALL_PERMISSION_NAMES = PERMISSION_CATALOG.map((p) => p.name);
const ALL_ACTIONS_BY_PERMISSION = Object.fromEntries(
  PERMISSION_CATALOG.map((p) => [p.name, p.actions])
);

function deny(res, message) {
  return res.status(403).json({ success: false, error: message });
}

function unauthorized(res) {
  return res.status(401).json({ success: false, error: "Not authenticated" });
}

// ─────────────────────────────────────────────────────────
//  resolvePermissions
//  Marks the request with the caller's effective permissions.
// ─────────────────────────────────────────────────────────
async function resolvePermissions(req, res, next) {
  try {
    const user = req.session?.user;
    if (!user) return unauthorized(res);

    // Already resolved on this request — never re-query.
    if (req.permissions) return next();

    const resolved = await rolesService.resolveUser(user);
    req.permissions = resolved.permissions;
    req.permissionDetails = resolved.permissionDetails;
    req.entityOverrides = resolved.entityOverrides;
    return next();
  } catch (err) {
    console.error("[permissionGuards] resolvePermissions failed:", err.message);
    return res.status(500).json({ success: false, error: "Failed to resolve permissions" });
  }
}

// ─────────────────────────────────────────────────────────
//  Lazy fallback — used when a guard runs without the middleware
//  having been mounted (defensive; the retrofit mounts it explicitly).
// ─────────────────────────────────────────────────────────
async function ensureResolved(req) {
  if (req.permissions) return;
  const user = req.session?.user;
  if (!user) return;
  const resolved = await rolesService.resolveUser(user);
  req.permissions = resolved.permissions;
  req.permissionDetails = resolved.permissionDetails;
  req.entityOverrides = resolved.entityOverrides;
}

function hasResolvedAction(req, permissionName, action) {
  const user = req.session?.user;
  if (user?.role === ROLES.SUPER_ADMIN) return true;

  const detail = req.permissionDetails?.[permissionName];
  if (!detail || !detail.granted) return false;

  if (!action) return true;

  return detail.actions.includes(action);
}

function hasResolvedPermission(req, permissionName) {
  const user = req.session?.user;
  if (user?.role === ROLES.SUPER_ADMIN) return true;

  return Array.isArray(req.permissions) && req.permissions.includes(permissionName);
}

// ─────────────────────────────────────────────────────────
//  Guards
// ─────────────────────────────────────────────────────────

/** Allow only callers holding `permissionName` (any action). */
function requirePermission(permissionName) {
  if (!ALL_PERMISSION_NAMES.includes(permissionName)) {
    throw new Error(`requirePermission: unknown permission '${permissionName}'`);
  }

  return async function permissionGuard(req, res, next) {
    try {
      if (!req.session?.user) return unauthorized(res);
      await ensureResolved(req);
      if (!hasResolvedPermission(req, permissionName)) {
        return deny(res, `Forbidden: requires permission '${permissionName}'`);
      }
      return next();
    } catch (err) {
      console.error("[permissionGuards] requirePermission failed:", err.message);
      return res.status(500).json({ success: false, error: "Permission check failed" });
    }
  };
}

/** Allow only callers holding `permissionName` with `action`. */
function requirePermissionAction(permissionName, action) {
  if (!ALL_PERMISSION_NAMES.includes(permissionName)) {
    throw new Error(`requirePermissionAction: unknown permission '${permissionName}'`);
  }
  const defined = ALL_ACTIONS_BY_PERMISSION[permissionName] || [];
  if (action && !defined.includes(action)) {
    throw new Error(
      `requirePermissionAction: '${action}' is not a defined action of '${permissionName}'`
    );
  }

  return async function permissionActionGuard(req, res, next) {
    try {
      if (!req.session?.user) return unauthorized(res);
      await ensureResolved(req);
      if (!hasResolvedAction(req, permissionName, action)) {
        const suffix = action ? `:${action}` : "";
        return deny(res, `Forbidden: requires permission '${permissionName}${suffix}'`);
      }
      return next();
    } catch (err) {
      console.error("[permissionGuards] requirePermissionAction failed:", err.message);
      return res.status(500).json({ success: false, error: "Permission check failed" });
    }
  };
}

/**
 * Convenience: requireAuth + resolvePermissions + a permission/action guard.
 * Keeps route files to one import and one guard per route.
 */
function can(permissionName, action) {
  const guard = action
    ? requirePermissionAction(permissionName, action)
    : requirePermission(permissionName);
  return [requireAuth, resolvePermissions, guard];
}

// ─────────────────────────────────────────────────────────
//  Entity-level access
// ─────────────────────────────────────────────────────────

/** Row-level check — true unless an entity override denies it. */
async function canAccessEntity(req, entityType, entityId) {
  const user = req.session?.user;
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;

  await ensureResolved(req);
  return rolesService.isEntityAllowed(req.entityOverrides || {}, entityType, entityId);
}

/**
 * Guard factory: allow any caller whose entity overrides permit the
 * requested entity. Use as requireEntityTypeAccess("books")(req, res, next).
 */
function requireEntityTypeAccess(entityType, idParam = "id") {
  return async function entityAccessGuard(req, res, next) {
    try {
      if (!req.session?.user) return unauthorized(res);
      await ensureResolved(req);

      if (req.session.user.role === ROLES.SUPER_ADMIN) return next();

      const entityId = Number(req.params[idParam]);
      if (!entityId) return deny(res, "Entity not found");

      const allowed = await rolesService.isEntityAllowed(
        req.entityOverrides || {},
        entityType,
        entityId
      );
      if (!allowed) {
        return deny(res, `Forbidden: no access to this ${entityType.slice(0, -1)}`);
      }
      return next();
    } catch (err) {
      console.error("[permissionGuards] requireEntityTypeAccess failed:", err.message);
      return res.status(500).json({ success: false, error: "Permission check failed" });
    }
  };
}
/** Does the session user hold `permissionName`? (super_admin always does.) */
async function userHasPermission(req, permissionName) {
  const user = req.session?.user;
  if (!user) return false;
  await ensureResolved(req);
  return hasResolvedPermission(req, permissionName);
}

module.exports = {
  resolvePermissions,
  requirePermission,
  requirePermissionAction,
  requireEntityTypeAccess,
  canAccessEntity,
  userHasPermission,
  can,
  ensureResolved,
  ALL_PERMISSION_NAMES,
  ALL_ACTIONS_BY_PERMISSION,
};
