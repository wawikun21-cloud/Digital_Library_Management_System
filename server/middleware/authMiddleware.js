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
  SUPER_ADMIN: "super_admin",
  ADMIN:       "admin",
  LIBRARIAN:   "librarian",
  STAFF:       "staff",
  STUDENT:     "student",
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
const requireAdmin = requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN);

/** Only super administrators. */
const requireSuperAdmin = requireRole(ROLES.SUPER_ADMIN);

/** Only staff members. */
const requireStaff = requireRole(ROLES.STAFF);

/** Only librarians. */
const requireLibrarian = requireRole(ROLES.LIBRARIAN);

/** Super Admin + Admin (user management, analytics). */
const requireSuperAdminOrAdmin = requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN);

/** Administrators + Staff (attendance, students, faculty). */
const requireAdminOrStaff = requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF);

/**
 * Administrators + Librarians.
 * Use on ALL books & lexora routes so librarians can manage the catalog.
 */
const requireAdminOrLibrarian = requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LIBRARIAN);

/** All authenticated roles (super_admin + admin + staff + librarian). */
const requireAnyRole = requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.LIBRARIAN);

/** Students (login-only portal). */
const requireStudent = requireRole(ROLES.STUDENT);

/** All roles including students. */
const requireAllRoles = requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LIBRARIAN, ROLES.STAFF, ROLES.STUDENT);

// ─────────────────────────────────────────────────────────
module.exports = {
  ROLES,
  requireAuth,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireStaff,
  requireLibrarian,
  requireAdminOrStaff,
  requireAdminOrLibrarian,
  requireSuperAdminOrAdmin,
  requireAnyRole,
  requireStudent,
  requireAllRoles,
};
