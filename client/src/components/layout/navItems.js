// ─────────────────────────────────────────────────────────
//  components/layout/navItems.js
//
//  The navigation catalog and its visibility rules, shared by the
//  Sidebar (desktop + mobile) and BottomNav so both answer "may this
//  user see this item?" the same way.
//
//  Visibility model (one rule, no special cases):
//    • flat item  → visible when it declares no gate, or the user holds
//                   its `permission` (or its `roles` exception applies)
//    • group      → container visible when the user can open the group's
//                   own route (`permission`, the route's real guard) OR
//                   at least one child is visible
//    • child      → filtered with the flat-item rule; a child whose
//                   permission is missing is never rendered
//
//  The group's parent link renders only when the group's own route is
//  reachable; otherwise the group header renders without the link, so a
//  user never clicks a link that PermissionRoute would bounce back.
//
//  The server remains the source of truth — these helpers only decide
//  what to render, never compute a permission the server did not grant.
// ─────────────────────────────────────────────────────────
import {
  BarChart3, BookOpen, ClipboardList, Trash2,
  ChevronDown, Library, Users, User, Globe, UserCheck,
  LayoutDashboard, GraduationCap, Settings, Package,
  ShieldCheck, KeyRound, BookMarked, Layers,
  School, Building2, Tag,
} from "lucide-react";
import { ROLES } from "../../constants/roles.js";
import { hasPermission } from "../../utils/permissionUtils";

// ─────────────────────────────────────────────────────────
//  Section map
//  Controls the order sections render in. Items without a
//  matching section fall back to "MORE".
// ─────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "OVERVIEW",     label: "Overview" },
  { id: "CATALOG",      label: "Catalog" },
  { id: "ORGANIZATION", label: "Organization" },
  { id: "TRANSACTIONS", label: "Transactions" },
  { id: "ATTENDANCE",   label: "Attendance" },
  { id: "PEOPLE",       label: "People" },
  { id: "SYSTEM",       label: "System" },
  { id: "MORE",         label: "More" },
];

// ─────────────────────────────────────────────────────────
//  AttendancePage / StudentsPage / FacultyPage — separate
//  top-level sections, not children of the Attendance group.
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
//  NAV_ITEMS
//
//  `permission` on a group is the guard of the group's OWN route
//  (App.jsx PermissionRoute), so it decides whether the parent link
//  renders. Children each carry their own route's permission.
// ─────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  // ── Overview ──────────────────────────────────────────
  // Student Portal / student Tools stay role-gated: they are audience pages
  // and the portal is the student's landing route, so no permission applies.
  { section: "OVERVIEW", to: "/dashboard/student", label: "Student Portal", Icon: GraduationCap, roles: [ROLES.STUDENT] },
  { section: "OVERVIEW", to: "/dashboard/student-tools", label: "Tools", Icon: Package, roles: [ROLES.STUDENT] },

  {
    section: "OVERVIEW",
    label: "Dashboard Analytics",
    to: "/dashboard",
    Icon: BarChart3,
    isGroup: true,
    permission: "view_dashboard",
    children: [
      { to: "/dashboard/attendance/dashboard", label: "Attendance", Icon: LayoutDashboard, permission: "view_dashboard", featureSet: "library" },
      { to: "/dashboard/books/dashboard",      label: "Book",       Icon: BookOpen, permission: "view_dashboard", featureSet: "library" },
    ],
  },

  // ── Catalog ───────────────────────────────────────────
  // `featureSet` binds a nav item to a school's module license
  // ('library' → physical books only; 'lexora' → digital only; 'both' → both).
  // The sidebar hides an item whose featureSet the user's school license
  // excludes; the backend independently 404s the route regardless.
  { section: "CATALOG", to: "/dashboard/books",        label: "Books",            Icon: BookOpen, permission: "manage_books", end: true, featureSet: "library" },
  { section: "CATALOG", to: "/lexora-books",             label: "Lexora E-Books",    Icon: Globe, permission: "view_lexora_books", featureSet: "lexora" },
  { section: "CATALOG", to: "/dashboard/lexora-books",   label: "Manage Lexora Books", Icon: BookMarked, permission: "manage_lexora_books", featureSet: "lexora" },
  // Courses — Operational feature for  Lexora
  { section: "CATALOG", to: "/dashboard/courses",        label: "Courses",            Icon: Library, permission: "manage_courses", end: true, featureSet: "lexora" },
  // Course Library — digital-only course content
  { section: "CATALOG", to: "/dashboard/course-library", label: "Course Library",  Icon: Layers, permission: "view_course_library", featureSet: "lexora" },
  // Tools —  operational feature for Lexora Only
  { section: "CATALOG", to: "/dashboard/tools",          label: "Tools",            Icon: Package, permission: "manage_tools", featureSet: "lexora" },

   // ── Organization ────────────────────────────────────────
  // Overview is the section landing: the whole hierarchy tree with
  // links into the management pages below it.
  // Organization management is super_admin/admin only — staff and
  // librarian consume their school scope through the form-level
  // SchoolSelect/DepartmentSelect (which no longer call the org API
  // when the school is fixed), but they must never see these pages.
  { section: "ORGANIZATION", to: "/dashboard/organization", label: "Overview", Icon: LayoutDashboard, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  // Schools is the one role-gated item here: "create/manage schools"
  // is a super-admin capability, not an action inside
  // manage_organization (admins hold that permission for
  // departments/categories). The page itself re-checks the role.
  { section: "ORGANIZATION", to: "/dashboard/organization/schools", label: "Schools", Icon: School, roles: [ROLES.SUPER_ADMIN] },
  { section: "ORGANIZATION", to: "/dashboard/organization/departments", label: "Departments", Icon: Building2, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
  { section: "ORGANIZATION", to: "/dashboard/organization/categories", label: "Categories", Icon: Tag, roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },


  // ── Transactions ──────────────────────────────────────
  { section: "TRANSACTIONS", to: "/dashboard/borrowed", label: "Borrowed", Icon: ClipboardList, permission: "manage_transactions", featureSet: "library" },

  // ── Attendance ────────────────────────────────────────
  // AttendancePage, StudentsPage, FacultyPage, and KioskAttendancePage
  // are separate top-level sections (not children under an Attendance group).
  // AttendancePage and KioskAttendancePage are library-only surfaces.
  { section: "ATTENDANCE", to: "/dashboard/attendance",      label: "Attendance",      Icon: Users, permission: "manage_attendance", featureSet: "library" },
  { section: "ATTENDANCE", to: "/dashboard/attendance/kiosk",  label: "Kiosk Attendance", Icon: UserCheck, permission: "use_kiosk", featureSet: "library" },

  // ── People ────────────────────────────────────────────
  // Students is a shared operational feature accessible to all license types
  { section: "PEOPLE",     to: "/dashboard/students",          label: "Students",        Icon: User, permission: "manage_students" },
  // Faculty is a library-only feature (library schools manage faculty; lexora schools don't)
  { section: "PEOPLE",     to: "/dashboard/faculty",           label: "Faculty",         Icon: UserCheck, permission: "manage_faculty", featureSet: "library" },


  // ── System ────────────────────────────────────────────
  { section: "SYSTEM", to: "/dashboard/audit-log", label: "Audit Trail",      Icon: ShieldCheck, permission: "view_audit_logs" },

  // ── More ──────────────────────────────────────────────
  {
    section: "MORE",
    label: "Settings",
    to: "/dashboard/settings",
    Icon: Settings,
    isGroup: true,
    // The parent link's own route guard. Without manage_settings the group
    // header still renders (chevron only) when a child such as Users or
    // Recently Deleted is reachable — no dead link to /dashboard/settings.
    permission: "manage_settings",
    children: [
      { to: "/dashboard/settings/student-portal", label: "Student Portal",     Icon: GraduationCap, permission: "manage_settings" },
      { to: "/dashboard/users",                   label: "Users",              Icon: Users,         permission: "manage_users" },
      { to: "/dashboard/roles",                   label: "Roles & Permissions", Icon: KeyRound,      permission: "manage_permissions" },
      { to: "/dashboard/deleted",   label: "Recently Deleted", Icon: Trash2,      permission: "manage_trash" },

    ],
  },
];

// ─────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────
/**
 * Visibility follows resolved permissions.
 *
 * `roles` is the one role-based exception left: the Student Portal is an
 * audience page, not a capability, and it is the student's landing route —
 * no permission expresses "is a student". It is never granted by the seed
 * as a capability, so gating it on a permission would loop students back
 * to their own redirect target.
 *
 * A user whose cached entry predates the permission fields falls back to a
 * conservative role check, so a stale localStorage cannot reveal an item —
 * ProtectedRoute refreshes the entry from /api/auth/me right after.
 */
export function isItemVisibleForUser(item, user) {
  if (item.permission) {
    if (!hasPermission(user, item.permission)) return false;
  } else if (item.roles) {
    const role = user?.role;
    if (!(role ? item.roles.includes(role) : item.roles.includes(ROLES.ADMIN))) return false;
  }
  // School module-license gate (sidebar hide). `featureSet` tags an item as
  // belonging to the physical-library ('library') or Lexora ('lexora') surface.
  // A school licensed for only one surface hides the other. super_admin and
  // legacy/anonymous users carry feature_set 'both' (or none), so this is a
  // no-op for them — the backend enforces the real boundary.
  if (!isFeatureAllowed(item, user)) return false;
  return true;
}

/** True unless the item is license-bound to a surface this school lacks. */
function isFeatureAllowed(item, user) {
  if (!item.featureSet) return true;
  const license = user?.feature_set || "both"; // missing → legacy 'both' default
  if (item.featureSet === "library" && license === "lexora") return false;
  if (item.featureSet === "lexora" && license === "library") return false;
  return true;
}

/** Children of a group the user may actually open. */
function visibleChildren(item, user) {
  return (item.children || []).filter((child) => isItemVisibleForUser(child, user));
}

/**
 * May the group's own parent link render? It is a route like any other,
 * guarded by the group's `permission` in App.jsx AND by the school license.
 */
export function isGroupLinkVisible(item, user) {
  if (!isFeatureAllowed(item, user)) return false;
  if (item.permission) return hasPermission(user, item.permission);
  return true;
}

/** A group renders when its own route is reachable or any child is. */
function isGroupContainerVisible(item, user) {
  return isGroupLinkVisible(item, user) || visibleChildren(item, user).length > 0;
}

export function isChildActive(children, pathname) {
  return children.some((c) => pathname === c.to || pathname.startsWith(c.to + "/"));
}

/**
 * Flat item list (flat items and groups alike, already visibility-filtered)
 * into ordered sections, with each group's children filtered too.
 */
export function buildVisibleItems(items, user) {
  return items
    .filter((item) => (item.isGroup ? isGroupContainerVisible(item, user) : isItemVisibleForUser(item, user)))
    .map((item) => (item.isGroup ? { ...item, children: visibleChildren(item, user) } : item));
}

/** Collapse a flat item list into ordered sections (already filtered). */
export function groupBySection(items) {
  const buckets = {};
  items.forEach((item) => {
    const key = item.section ?? "MORE";
    (buckets[key] = buckets[key] || []).push(item);
  });
  return SECTIONS.filter((s) => buckets[s.id]?.length)
    .map((s) => ({ id: s.id, label: s.label, items: buckets[s.id] }));
}
