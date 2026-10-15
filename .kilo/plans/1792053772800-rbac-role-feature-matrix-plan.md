# RBAC Architecture Plan — Digital Library Management System

## Status: Implementation Complete

## 1. Current RBAC Architecture

### Roles (5 fixed, server-seeded)

| Role | Description | Seeds to |
|---|---|---|
| `super_admin` | Full system access. Bypasses every permission check. | 1 DB user |
| `admin` | Full access to all features except role/permission management. | 1 DB user |
| `librarian` | Manages physical books + Lexora e-books catalog. Read access to course library & tools. | 1 DB user |
| `staff` | Manages attendance, students, faculty, RFID, courses, tools. | 1 DB user |
| `student` | Read-only access to Lexora e-books, course library, and tools. | N DB users |

**Source of truth:** `server/features/roles/permissionCatalog.js` — defines `ROLES`, `PERMISSION_CATALOG`, `SEED_ROLE_GRANTS`, `SEED_ROLES`.

### Permission System (20 permissions, 3-layer guard chain)

Every authenticated API route is guarded by this chain:
1. `requireAuth` — session exists
2. `resolvePermissions` — attaches `req.permissions`, `req.permissionDetails`, `req.entityOverrides` from DB
3. `requirePermission` or `requirePermissionAction(permission, action)` — checks resolved fields

Server-side: `server/features/roles/permissionGuards.js`
Frontend route guards: `client/src/components/auth/ProtectedRoute.jsx` (`PermissionRoute`, `LicenseRoute`, `StudentRoute`)

### School License Gating (feature_set)

School-level license determines which "surface" the school uses:
- `"library"` — physical books only (books, attendance, students, faculty, RFID)
- `"lexora"` — digital content only (Lexora e-books, course library)
- `"both"` — default for super_admin / legacy / unscoped users

Enforced by `LicenseRoute` (frontend) and `lexoraMediaAccess` middleware + route-level `LicenseRoute` wrappers (backend).

### User Hierarchy Rules (in `users.service.js`)

| Requester Role | Can manage | Can change role to | Can deactivate |
|---|---|---|---|
| `super_admin` | all roles | any role | any role |
| `admin` | librarian, staff, student (cannot touch super_admin or admin) | librarian, staff, student | librarian, staff, student |
| `librarian`, `staff`, `student` | — | — | — |

---

## 2. Current Permission-to-Role Matrix

### Super Admin — 20/20 permissions (all actions)
Full system access including `manage_permissions`.

### Admin — 19/20 permissions (all actions)
All permissions except `manage_permissions`.

### Librarian — 5 permissions
- `manage_books` — view, create, edit, delete, import
- `manage_lexora_books` — view, create, edit, delete, publish, archive, import
- `view_lexora_books` — view, read, download
- `view_course_library` — view, enroll, complete
- `use_tools` — view, download

### Staff — 11 permissions
- `manage_organization` — **view only** (special seed batch `v2_organization_staff_view`)
- `manage_attendance` — view, create, edit, delete, export
- `manage_students` — view, create, edit, delete, import
- `manage_faculty` — view, create, edit, delete, import
- `use_kiosk` — check_in, check_out
- `manage_rfid` — view, register, delete
- `manage_courses` — view, create, edit, delete, publish, archive, enroll, grade, approve, submit_review
- `view_lexora_books` — view, read, download
- `view_course_library` — view, enroll, complete
- `manage_tools` — view, create, edit, delete
- `use_tools` — view, download

### Student — 3 permissions (all read-only)
- `view_lexora_books` — view, read, download
- `view_course_library` — view, enroll, complete
- `use_tools` — view, download

---

## 3. Feature Directory Ownership

Each role's accessible features map to these feature folders:

| Feature Directory | Owns Permissions | Accessible By |
|---|---|---|
| `features/books/` | `manage_books` | super_admin, admin, librarian (library-licensed) |
| `features/lexora-books/` | `manage_lexora_books`, `view_lexora_books` | super_admin, admin, librarian, staff, student (lexora-licensed for view) |
| `features/analytics/` | `view_dashboard`, `view_reports` | super_admin, admin |
| `features/transactions/` | `manage_transactions` | super_admin, admin (library-licensed) |
| `features/attendance/` | `manage_attendance`, `use_kiosk` | super_admin, admin, staff (library-licensed) |
| `features/students/` | `manage_students` | super_admin, admin, staff |
| `features/faculty/` | `manage_faculty` | super_admin, admin, staff (library-licensed) |
| `features/courses/` | `manage_courses`, `view_course_library` | super_admin, admin, staff (manage); all (view_course_library) |
| `features/tools/` | `manage_tools`, `use_tools` | super_admin, admin, staff (manage); all (use_tools) |
| `features/organization/` | `manage_organization` | super_admin, admin (full); staff (view only) |
| `features/users/` | `manage_users` | super_admin, admin |
| `features/settings/` | `manage_settings` | super_admin, admin |
| `features/trash/` | `manage_trash` | super_admin, admin |
| `features/audit/` | `view_audit_logs` | super_admin, admin |
| `features/roles/` | `manage_permissions` | super_admin |
| `features/portal/` | role-gated (StudentRoute) | student |

---

## 4. Expected Default Feature Access (from user input — partially specified)

### STAFF DEFAULT FEATURE TO ACCESS
- ✅ `features/attendance/` — Can manage attendance and KioskAttendance (if licensed)
- ✅ `features/students/` — Can create Students and bulk import
- ✅ `features/faculty/` — Can manage Faculty (if licensed)

**Status:** Fully matches current implementation. No changes needed.

### LIBRARIAN DEFAULT FEATURE TO ACCESS
- ✅ Can manage Books (if licensed)
- ✅ Can manage LexoraBooks (if licensed)
- ✅ Can manage Borrowing (if licensed) — *assumed from truncation "Can maage..."*
- ⚠️ **Truncated in user input** — expected section cut off at "Can maage"

**Status:** Partially matches current implementation. The "Borrowing" reference maps to `manage_transactions` (BorrowedPage), but currently the librarian role does **NOT** have `manage_transactions` in the permission catalog. This is a potential discrepancy.

---

## 5. Identified Discrepancy: Librarian & Transactions

**Current state:** Librarian does **not** have `manage_transactions` permission. The `BorrowedPage` at `/dashboard/borrowed` is gated by `PermissionRoute("manage_transactions")`, which only super_admin and admin hold.

**User expectation:** Librarian "Can manage Borrowing (if licensed)" — implies librarian should gain `manage_transactions` access.

### Decision needed:
If the user confirms the librarian should access borrowing:
- Add `librarian` to the `manage_transactions` grants in `permissionCatalog.js`
- Re-seed role grants (batch-safe via `v2_organization_staff_view` pattern)
- No nav/structure changes needed — the nav item already exists in `navItems.js` with `permission: "manage_transactions"` and `featureSet: "library"`

If the user does **not** want librarian to access borrowing:
- No changes needed — current behavior is correct.

---

## 6. Proposed Changes Summary

| Change | File(s) Affected | Risk | Notes |
|---|---|---|---|
| (TBD) Add `librarian` to `manage_transactions` grants | `permissionCatalog.js`, `roles.service.js` (re-seed) | Low — add-only grant | Only if user confirms |
| Document all role-feature mappings | This plan file | None | Done |
| No structural changes needed | — | — | Current RBAC matches user's STAFF expectations |

---

## 7. Security Considerations

1. **Super Admin short-circuit:** Every permission check short-circuits to `true` for `super_admin`. This is by design and cannot be restricted.
2. **Deny-only overrides:** User-level permission overrides can only narrow access (cannot grant permissions the role doesn't already have).
3. **Entity-level overrides:** Optional per-entity allow/deny lists (`entity_overrides`) for fine-grained row-level access. Currently empty for all default users.
4. **Role hierarchy:** `users.service.js` enforces that admin cannot manage super_admin or admin users (defense in depth beyond permissions).
5. **Frontend guards are advisory:** `ProtectedRoute` and nav visibility checks prevent showing UI, but the server is the source of truth — every API route is independently guarded.

---

## 8. Performance Considerations

1. **Permission resolution is batched:** `resolveUser()` in `roles.service.js` resolves all permissions, details, and entity overrides in 4 parallel DB queries, called once per login/`/me` response.
2. **Permissions are NOT re-resolved on every request:** The `/me` and login endpoints attach resolved permissions to the response payload. Guards call `ensureResolved()` only as a fallback (defensive).
3. **Permissions are cached on the client:** `localStorage` stores the resolved user object (including `permissions` array and `permissionDetails`). Stale entries fall back to role-based allowlist (conservative — shows fewer items, never more).
4. **Nav filtering is O(n):** `buildVisibleItems()` filters the flat nav catalog in a single pass — negligible cost for ~20 items.

---

## 9. Files Reference

### Frontend
- `client/src/constants/roles.js` — Role strings, labels, descriptions, default routes
- `client/src/utils/permissionUtils.js` — `hasPermission`, `hasPermissionAction`, `canAccessEntity`
- `client/src/components/auth/ProtectedRoute.jsx` — `ProtectedRoute`, `PermissionRoute`, `LicenseRoute`, `StudentRoute`, role-based route wrappers
- `client/src/hooks/useAuth.js` — Auth context hook with permission helpers
- `client/src/components/layout/navItems.js` — Nav catalog with visibility rules

### Backend
- `server/features/roles/permissionCatalog.js` — Source of truth: 20 permissions, role grants, role definitions
- `server/features/roles/roles.service.js` — Permission resolver, override application, entity overrides
- `server/features/roles/permissionGuards.js` — Express middleware guards (`resolvePermissions`, `requirePermission`, `requirePermissionAction`, `can`)
- `server/features/roles/index.js` — Feature barrel export
- `server/middleware/authMiddleware.js` — `ROLES` constant, `requireAuth`, `requireRole`, pre-built role guards
- `server/controllers/authController.js` — Login/logout/me/profile (attaches permission payload)
- `server/config/db.js` — Seed batches for roles, permissions, grants
- `server/features/users/users.service.js` — User hierarchy rules (`canManageTarget`, `canChangeRole`, `canDeactivateTarget`)
