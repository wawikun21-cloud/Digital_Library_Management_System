// ─────────────────────────────────────────────────────────
//  features/roles/permissionCatalog.js
//
//  Server-owned source of truth for:
//    • the permission catalog (name → display name, category, actions)
//    • the default role grant matrix (the seed)
//
//  Pure data — no DB, no Express, no other module. Imported by
//  config/db.js (boot-time seed) and by the roles feature
//  (`restoreRoleDefaults`). Keep the grant matrix in lockstep
//  with the route retrofit table: a grant seeded here must match
//  the permission action the swapped route guards require.
// ─────────────────────────────────────────────────────────

const PERMISSION_CATEGORIES = {
  dashboard:    "Dashboard",
  reports:      "Reports",
  books:        "Books",
  lexora:       "Lexora E-Books",
  transactions: "Transactions",
  trash:        "Recently Deleted",
  audit:        "Audit Trail",
  attendance:   "Attendance",
  students:     "Students",
  faculty:      "Faculty",
  rfid:         "RFID",
  courses:      "Courses",
  users:        "Users",
  settings:     "Settings",
  tools:        "Tools",
  roles:        "Roles & Permissions",
};

/**
 * The 20 permissions. `actions` lists every action the permission
 * defines — it is server-owned and never user-editable.
 *
 * `check` marks the default (seeded) grant. Grants are stored with
 * `actions = NULL`, meaning "all defined actions".
 */
const PERMISSION_CATALOG = [
  {
    name: "view_dashboard",
    display_name: "View Dashboard",
    category: "dashboard",
    actions: ["view"],
    grants: ["super_admin", "admin"],
  },
  {
    name: "view_reports",
    display_name: "View Reports",
    category: "reports",
    actions: ["view", "export"],
    grants: ["super_admin", "admin"],
  },
  {
    name: "manage_books",
    display_name: "Manage Books",
    category: "books",
    actions: ["view", "create", "edit", "delete", "import"],
    grants: ["super_admin", "admin", "librarian"],
  },
  {
    name: "manage_lexora_books",
    display_name: "Manage Lexora E-Books",
    category: "lexora",
    actions: ["view", "create", "edit", "delete", "publish", "archive", "import"],
    grants: ["super_admin", "admin", "librarian"],
  },
  {
    name: "view_lexora_books",
    display_name: "View Lexora E-Books",
    category: "lexora",
    actions: ["view", "read", "download"],
    grants: ["super_admin", "admin", "librarian", "staff", "student"],
  },
  {
    name: "manage_transactions",
    display_name: "Manage Transactions",
    category: "transactions",
    actions: ["view", "create", "edit", "return", "extend", "delete", "pay_fine"],
    grants: ["super_admin", "admin"],
  },
  {
    name: "manage_trash",
    display_name: "Manage Recently Deleted",
    category: "trash",
    actions: ["view", "restore", "delete"],
    grants: ["super_admin", "admin"],
  },
  {
    name: "view_audit_logs",
    display_name: "View Audit Trail",
    category: "audit",
    actions: ["view", "export"],
    grants: ["super_admin", "admin"],
  },
  {
    name: "manage_attendance",
    display_name: "Manage Attendance",
    category: "attendance",
    actions: ["view", "create", "edit", "delete", "export"],
    grants: ["super_admin", "admin", "staff"],
  },
  {
    name: "manage_students",
    display_name: "Manage Students",
    category: "students",
    actions: ["view", "create", "edit", "delete", "import"],
    grants: ["super_admin", "admin", "staff"],
  },
  {
    name: "manage_faculty",
    display_name: "Manage Faculty",
    category: "faculty",
    actions: ["view", "create", "edit", "delete", "import"],
    grants: ["super_admin", "admin", "staff"],
  },
  {
    name: "use_kiosk",
    display_name: "Use Kiosk",
    category: "attendance",
    actions: ["check_in", "check_out"],
    grants: ["super_admin", "admin", "staff"],
  },
  {
    name: "manage_rfid",
    display_name: "Manage RFID Cards",
    category: "rfid",
    actions: ["view", "register", "delete"],
    grants: ["super_admin", "admin", "staff"],
  },
  {
    name: "manage_courses",
    display_name: "Manage Courses",
    category: "courses",
    actions: [
      "view", "create", "edit", "delete", "publish", "archive",
      "enroll", "grade", "approve", "submit_review",
    ],
    grants: ["super_admin", "admin", "staff"],
  },
  {
    name: "view_course_library",
    display_name: "View Course Library",
    category: "courses",
    actions: ["view", "enroll", "complete"],
    grants: ["super_admin", "admin", "librarian", "staff", "student"],
  },
  {
    name: "manage_users",
    display_name: "Manage Users",
    category: "users",
    actions: ["view", "create", "edit", "delete", "manage_roles", "reactivate"],
    grants: ["super_admin", "admin"],
  },
  {
    name: "manage_settings",
    display_name: "Manage Settings",
    category: "settings",
    actions: ["view", "create", "edit", "delete", "reorder"],
    grants: ["super_admin", "admin"],
  },
  {
    name: "manage_tools",
    display_name: "Manage Tools",
    category: "tools",
    actions: ["view", "create", "edit", "delete"],
    grants: ["super_admin", "admin", "staff"],
  },
  {
    name: "use_tools",
    display_name: "Use Tools",
    category: "tools",
    actions: ["view", "download"],
    grants: ["super_admin", "admin", "librarian", "staff", "student"],
  },
  {
    name: "manage_permissions",
    display_name: "Manage Permissions",
    category: "roles",
    actions: ["view", "edit"],
    grants: ["super_admin"],
  },
];

/** Role grants mirror today's effective role access exactly. */
const SEED_ROLE_GRANTS = {
  super_admin: PERMISSION_CATALOG.map((p) => p.name),
  admin:       PERMISSION_CATALOG.filter((p) => p.grants.includes("admin")).map((p) => p.name),
  librarian:   PERMISSION_CATALOG.filter((p) => p.grants.includes("librarian")).map((p) => p.name),
  staff:       PERMISSION_CATALOG.filter((p) => p.grants.includes("staff")).map((p) => p.name),
  student:     PERMISSION_CATALOG.filter((p) => p.grants.includes("student")).map((p) => p.name),
};

/** Entity types that support per-entity overrides. */
const ENTITY_TYPES = ["users", "books", "lexora_books", "courses", "tools"];

/** Fixed role list (no custom role creation in this phase). */
const SEED_ROLES = [
  {
    name: "super_admin",
    display_name: "Super Admin",
    description: "Full system access. Bypasses every permission check.",
  },
  {
    name: "admin",
    display_name: "Administrator",
    description: "Full access to dashboard, books, lexora, transactions, trash, audit, attendance, students, faculty, RFID, courses, users, settings, and tools.",
  },
  {
    name: "librarian",
    display_name: "Librarian",
    description: "Manages the Books catalog and Lexora E-Books, plus read access to the course library and tools.",
  },
  {
    name: "staff",
    display_name: "Staff",
    description: "Manages attendance, kiosk, students, faculty, RFID cards, courses, and tools.",
  },
  {
    name: "student",
    display_name: "Student",
    description: "Read-only access to Lexora E-Books, the Course Library, and Tools.",
  },
];

/** Seed batch markers — each batch runs exactly once, ever. */
const SEED_BATCHES = {
  ROLES:        "v1_roles",
  PERMISSIONS:  "v1_permissions",
  ROLE_GRANTS:  "v1_role_grants",
  ACTION_BACKFILL: "v1_action_backfill",
};

function getPermissionDefinition(name) {
  return PERMISSION_CATALOG.find((p) => p.name === name) || null;
}

function definedActionsFor(name) {
  return getPermissionDefinition(name)?.actions ?? [];
}

module.exports = {
  PERMISSION_CATEGORIES,
  PERMISSION_CATALOG,
  SEED_ROLE_GRANTS,
  SEED_ROLES,
  SEED_BATCHES,
  ENTITY_TYPES,
  getPermissionDefinition,
  definedActionsFor,
};
