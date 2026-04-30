// ─────────────────────────────────────────────────────────
//  middleware/authMiddleware.js  —  Updated with Librarian RBAC
//
//  CHANGES:
//    • Added ROLES constant (single source of truth)
//    • Added requireLibrarian
//    • Added requireAdminOrLibrarian  ← for books/lexora routes
//    • requireRole() is unchanged — already supports any role list
// ─────────────────────────────────────────────────────────

// ── Role constants (mirror client/src/constants/roles.js) ─
const ROLES = {
  ADMIN:     "admin",
  STAFF:     "staff",
  LIBRARIAN: "librarian",
};

// ─────────────────────────────────────────────────────────
//  requireAuth
//  Rejects requests with no active session.
// ─────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  next();
}

// ─────────────────────────────────────────────────────────
//  requireRole(...roles)
//  Factory — returns a middleware that allows only the listed roles.
//
//  Usage:
//    requireRole("admin")                     — admin only
//    requireRole("admin", "librarian")        — admin + librarian
//    requireRole("admin", "staff")            — admin + staff
//    requireRole("admin", "staff", "librarian") — all roles
// ─────────────────────────────────────────────────────────
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({
        success: false,
        error:   `Forbidden: requires one of [${roles.join(", ")}]`,
      });
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────
//  Pre-built role guards — use these in route files for clarity
// ─────────────────────────────────────────────────────────

/** Only administrators. */
const requireAdmin = requireRole(ROLES.ADMIN);

/** Only staff members. */
const requireStaff = requireRole(ROLES.STAFF);

/** Only librarians. */
const requireLibrarian = requireRole(ROLES.LIBRARIAN);

/** Administrators + Staff (attendance, students, faculty). */
const requireAdminOrStaff = requireRole(ROLES.ADMIN, ROLES.STAFF);

/**
 * Administrators + Librarians.
 * Use on ALL books & lexora routes so librarians can manage the catalog.
 */
const requireAdminOrLibrarian = requireRole(ROLES.ADMIN, ROLES.LIBRARIAN);

/** All authenticated roles (admin + staff + librarian). */
const requireAnyRole = requireRole(ROLES.ADMIN, ROLES.STAFF, ROLES.LIBRARIAN);

// ─────────────────────────────────────────────────────────
module.exports = {
  ROLES,
  requireAuth,
  requireRole,
  requireAdmin,
  requireStaff,
  requireLibrarian,
  requireAdminOrStaff,
  requireAdminOrLibrarian,
  requireAnyRole,
};
