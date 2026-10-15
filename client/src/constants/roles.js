// ─────────────────────────────────────────────────────────
//  constants/roles.js
//  Single source of truth for all role strings.
//  Import ROLES everywhere — never hardcode "admin" or "librarian".
// ─────────────────────────────────────────────────────────

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN:       "admin",
  LIBRARIAN:   "librarian",
  STAFF:       "staff",
  STUDENT:     "student",
};

/**
 * Preferred landing route per role. Use getLandingRoute(user)
 * (utils/permissionUtils) for the actual redirect — it falls back when the
 * school license or permissions make this route unreachable.
 */
export const ROLE_DEFAULT_ROUTES = {
  [ROLES.SUPER_ADMIN]: "/dashboard",
  [ROLES.ADMIN]:       "/dashboard",
  [ROLES.LIBRARIAN]:   "/dashboard/books",
  [ROLES.STAFF]:       "/dashboard/attendance",
  [ROLES.STUDENT]:     "/dashboard/student",
};

/**
 * Human-readable label for each role (e.g. for UI display).
 */
export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]:       "Administrator",
  [ROLES.LIBRARIAN]:   "Librarian",
  [ROLES.STAFF]:       "Staff",
  [ROLES.STUDENT]:     "Student",
};

/**
 * Human-readable description for each role (used in user creation UI).
 */
export const ROLE_DESCRIPTIONS = {
  [ROLES.SUPER_ADMIN]: "Full system access. Can manage all user types including Admins and other Super Admins.",
  [ROLES.ADMIN]:       "Full access to dashboard, books, lexora, transactions, trash, audit, attendance, students, faculty, RFID, courses, users, settings, and tools. Cannot manage Admins or Super Admins.",
  [ROLES.LIBRARIAN]:   "Manages Books, Lexora E-Books, borrowing (transactions), Courses and Tools, with read access to the Course Library.",
  [ROLES.STAFF]:       "Manages Attendance, Kiosk, Students, Faculty and RFID cards. View-only access to organization.",
  [ROLES.STUDENT]:     "Read-only access to Lexora E-Books catalog, Course Library, and Tools.",
};

/**
 * Roles that can be assigned by a given role.
 * Used in the user creation form role dropdown.
 */
export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LIBRARIAN, ROLES.STAFF, ROLES.STUDENT],
  [ROLES.ADMIN]:       [ROLES.LIBRARIAN, ROLES.STAFF, ROLES.STUDENT],
};

/**
 * Default password for seeded accounts (dev only).
 */
export const DEFAULT_SEED_PASSWORD = "password123";