/**
 * Permission checks shared by useAuth, ProtectedRoute, the Sidebar and the
 * feature pages. These read the resolved permission fields the auth
 * responses (`login` / `me` / `getCurrentUser`) put on the user object.
 *
 * The server is the source of truth; these helpers only decide what to
 * render. They never compute a permission the server did not grant.
 */

/** Roles trusted when the cached user predates the permission fields. */
const FALLBACK_ROLES = ["super_admin", "admin"];

function normalizeId(value) {
  const num = Number(value);
  return Number.isInteger(num) ? num : value;
}

/**
 * Does `user` hold `permissionName`?
 *
 * super_admin short-circuits (server parity). A user without a
 * `permissions` array is a stale localStorage entry from before this
 * feature shipped, so it falls back to the conservative role check
 * rather than locking them out — ProtectedRoute refreshes the entry
 * from `/api/auth/me` immediately after.
 */
export function hasPermission(user, permissionName) {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (!Array.isArray(user.permissions)) {
    return FALLBACK_ROLES.includes(user.role);
  }
  return user.permissions.includes(permissionName);
}

/**
 * Does `user` hold `permissionName` with `action`?
 *
 * Details missing *entirely* (a cached user from before per-action details
 * shipped) falls back to the same conservative role check as
 * `hasPermission` — granting every action there is what let restricted
 * users keep clicking buttons the server refused with a 403. ProtectedRoute
 * refreshes the entry from `/api/auth/me` right after, so the conservative
 * window is one request long.
 *
 * A details map that exists but omits this one permission still counts as
 * fully granted (old-client compatibility: the server only lists granted
 * permissions, and a client that cannot distinguish must not lock users
 * out of actions their role allows).
 */
export function hasPermissionAction(user, permissionName, action) {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (!Array.isArray(user.permissions)) {
    return FALLBACK_ROLES.includes(user.role);
  }
  if (!user.permissions.includes(permissionName)) return false;
  if (!action) return true;

  if (!user.permissionDetails || typeof user.permissionDetails !== "object") {
    return FALLBACK_ROLES.includes(user.role);
  }

  const detail = user.permissionDetails[permissionName];
  if (!detail || !Array.isArray(detail.actions)) return true;

  return detail.actions.includes(action);
}

/**
 * Entity override check. `entityOverrides` is empty unless a Super Admin
 * narrowed this user to specific entities, so it stays off the hot path.
 */
export function canAccessEntity(user, entityType, entityId) {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  if (!user.entityOverrides || typeof user.entityOverrides !== "object") return true;

  const entry = user.entityOverrides[entityType];
  if (!entry || !Array.isArray(entry.entity_ids)) return true;

  const id = normalizeId(entityId);
  if (entry.scope === "denied") return !entry.entity_ids.map(normalizeId).includes(id);
  return entry.entity_ids.map(normalizeId).includes(id);
}
