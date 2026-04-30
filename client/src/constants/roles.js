// ─────────────────────────────────────────────────────────
//  constants/roles.js
//  Single source of truth for all role strings.
//  Import ROLES everywhere — never hardcode "admin" or "librarian".
// ─────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN:     "admin",
  STAFF:     "staff",
  LIBRARIAN: "librarian",
};

/**
 * Routes each role lands on after a successful login.
 */
export const ROLE_DEFAULT_ROUTES = {
  [ROLES.ADMIN]:     "/dashboard",
  [ROLES.STAFF]:     "/dashboard/attendance",
  [ROLES.LIBRARIAN]: "/dashboard/books",
};

/**
 * Human-readable label for each role (e.g. for UI display).
 */
export const ROLE_LABELS = {
  [ROLES.ADMIN]:     "Administrator",
  [ROLES.STAFF]:     "Staff",
  [ROLES.LIBRARIAN]: "Librarian",
};
