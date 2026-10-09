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
 * Routes each role lands on after a successful login.
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
  [ROLES.ADMIN]:       "Full access to dashboard, books, lexora, attendance, students, courses, and user management. Cannot manage Admins or Super Admins.",
  [ROLES.LIBRARIAN]:   "Can manage Books catalog and Lexora E-Books. No access to attendance, students, or user management.",
  [ROLES.STAFF]:       "Can manage Student Attendance, Students, Faculty, RFID cards, and Courses. No access to books or user management.",
  [ROLES.STUDENT]:     "Read-only access to Lexora E-Books catalog, Course Library, and Tools.",
};

/**
 * Role-based feature permissions.
 * Each role maps to a set of features it can access.
 */
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    dashboard: true,
    books: true,
    lexora_manage: true,
    lexora_read: true,
    borrowed: true,
    recently_deleted: true,
    audit_trail: true,
    attendance: true,
    students: true,
    faculty: true,
    kiosk_attendance: true,
    courses_manage: true,
    course_library: true,
    users: true,
    tools: true,
  },
  [ROLES.ADMIN]: {
    dashboard: true,
    books: true,
    lexora_manage: true,
    lexora_read: true,
    borrowed: true,
    recently_deleted: false,
    audit_trail: true,
    attendance: true,
    students: true,
    faculty: true,
    kiosk_attendance: true,
    courses_manage: true,
    course_library: true,
    users: true,
    tools: true,
  },
  [ROLES.LIBRARIAN]: {
    dashboard: false,
    books: true,
    lexora_manage: true,
    lexora_read: true,
    borrowed: true,
    recently_deleted: false,
    audit_trail: false,
    attendance: false,
    students: false,
    faculty: false,
    kiosk_attendance: false,
    courses_manage: false,
    course_library: true,
    users: false,
    tools: true,
  },
  [ROLES.STAFF]: {
    dashboard: false,
    books: false,
    lexora_manage: false,
    lexora_read: true,
    borrowed: false,
    recently_deleted: false,
    audit_trail: false,
    attendance: true,
    students: true,
    faculty: true,
    kiosk_attendance: true,
    courses_manage: true,
    course_library: true,
    users: false,
    tools: true,
  },
  [ROLES.STUDENT]: {
    dashboard: false,
    books: false,
    lexora_manage: false,
    lexora_read: true,
    borrowed: false,
    recently_deleted: false,
    audit_trail: false,
    attendance: false,
    students: false,
    faculty: false,
    kiosk_attendance: false,
    courses_manage: false,
    course_library: true,
    users: false,
    tools: true,
  },
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
