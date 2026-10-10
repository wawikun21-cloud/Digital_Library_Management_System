# Granular Permission System (LMS-SOP Parity) — Implementation Plan

## Goal

Add a permission + action-level access control system to DLMS with **full LMS-SOP parity**: permissions catalog with module-specific actions, role-level grants (`role_permissions`), per-user overrides (`user_permission_overrides`), per-entity overrides (`entity_permission_overrides` + `role_entity_permissions`) — plus two management surfaces (general role permissions, and specific-user permissions).

**Enforcement is in scope this phase.** Both the backend (API route guards) and the frontend (nav, route guards, action buttons) are retrofitted from role checks to permission checks. The seeded grants mirror today's effective role access, so behavior at launch is identical for every role (two documented exceptions below).

## Resolved Decisions

| Decision | Choice |
|---|---|
| Scope | Full LMS-SOP parity: role grants + user overrides + entity overrides |
| Enforcement | Backend **and** frontend retrofit in this phase |
| Default role grants | Mirror today's effective behavior exactly (see catalog) |
| Resolution | Per-request `resolvePermissions` middleware; lazy fallback inside guards |
| UI | Two Super-Admin surfaces: general role permissions at `/dashboard/roles`, and a specific-user permission editor shared between that page and a deep-link from the Users page |
| Roles table | Fixed 5 roles with editable grants; no custom role creation |
| Entity types | `users`, `books`, `lexora_books`, `courses`, `tools` |
| Bypass rule | Only `super_admin` bypasses checks (mirrors LMS-SOP) |
| Validation | Hand-rolled validators (no `express-validator` in this project) |
| Audit actions | `PERM_UPDATE` / `USER_PERM_UPDATE` / `ENTITY_PERM_UPDATE` (≤20 chars for `audit_logs.action VARCHAR(20)`) |
| CSRF | None on new routes — consistent with every other feature route (only `/api/auth` uses csurf) |
| `ROLE_PERMISSIONS` constants | Deleted — already has zero consumers (verified by grep); it is the stale duplicate source of truth |
| General role permissions | Editable on `/dashboard/roles`: per-role permission + action grant matrix |
| Specific user permissions | Narrow/deny-only overrides (LMS-SOP semantics — a user can never gain a permission their role lacks). Two entry points into one shared editor: role-scoped user picker on `/dashboard/roles`, and a **Permissions** row action on the Users page (deep-link `/dashboard/users?permissions=<id>`) |

## Permission Catalog (20 permissions)

`✓` = default grant; grants seeded with **all** defined actions (`actions = NULL` in `role_permissions` meaning "all defined").

| Permission | Category | Actions | super_admin | admin | librarian | staff | student |
|---|---|---|---|---|---|---|---|
| `view_dashboard` | dashboard | `view` | ✓ | ✓ | | | |
| `view_reports` **(new)** | reports | `view, export` | ✓ | ✓ | | | |
| `manage_books` | books | `view, create, edit, delete, import` | ✓ | ✓ | ✓ | | |
| `manage_lexora_books` | lexora | `view, create, edit, delete, publish, archive, import` | ✓ | ✓ | ✓ | | |
| `view_lexora_books` | lexora | `view, read, download` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `manage_transactions` | transactions | `view, create, edit, return, extend, delete, pay_fine` | ✓ | ✓ | | | |
| `manage_trash` | trash | `view, restore, delete` | ✓ | ✓ | | | |
| `view_audit_logs` | audit | `view, export` | ✓ | ✓ | | | |
| `manage_attendance` | attendance | `view, create, edit, delete, export` | ✓ | ✓ | | ✓ | |
| `manage_students` | students | `view, create, edit, delete, import` | ✓ | ✓ | | ✓ | |
| `manage_faculty` | faculty | `view, create, edit, delete, import` | ✓ | ✓ | | ✓ | |
| `use_kiosk` | attendance | `check_in, check_out` | ✓ | ✓ | | ✓ | |
| `manage_rfid` | rfid | `view, register, delete` | ✓ | ✓ | | ✓ | |
| `manage_courses` | courses | `view, create, edit, delete, publish, archive, enroll, grade, approve, submit_review` | ✓ | ✓ | | ✓ | |
| `view_course_library` | courses | `view, enroll, complete` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `manage_users` | users | `view, create, edit, delete, manage_roles, reactivate` | ✓ | ✓ | | | |
| `manage_settings` | settings | `view, create, edit, delete, reorder` | ✓ | ✓ | | | |
| `manage_tools` | tools | `view, create, edit, delete` | ✓ | ✓ | | ✓ | |
| `use_tools` | tools | `view, download` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `manage_permissions` | roles | `view, edit` | ✓ | | | | |

`view_reports` replaces the bare `requireAdmin` on `routes/analytics.js` (grants to super_admin + admin mirror that guard exactly). `manage_courses` gains `approve` / `submit_review` for the builder workflow; `manage_settings` gains `create` / `delete` / `reorder` for hero-slide management.

**Split-permission note:** tools, lexora, and courses each split into a manage permission (writers) and a use/view permission (readers), matching how existing guards separate writes from reads.

**Two intentional behavior changes** (everything else is behavior-identical because the seed mirrors current guards):
1. `routes/attendance.js` is currently `requireAuth`-only, so **students can call attendance APIs today** while the UI blocks them. Retrofit closes this gap: attendance endpoints require `manage_attendance:*` / `use_kiosk:*` (students lose API access — UI never exposed it).
2. `GET /api/books/stats` (`server/index.js:161`) has **no auth middleware at all**. Adding `requireAuth, requirePermissionAction('view_reports','view')` closes an anonymous-access gap. Verified no in-app caller (client uses `/api/analytics/*`).

**Retained role guards (not retrofitted — no permission semantics apply):**
`routes/search.js` (public search), `GET /api/auth/*` (session), `GET /api/users/me`, `GET /api/lexora-books/my-bookmarks` (user-scoped), `GET /api/portal/home` (all authenticated roles — student portal feed), `GET /api/books/count/all` + `GET /api/books/stats` in `routes/books.js` (admin-only stats; mapping to `manage_books:view` would newly grant librarians access), and the student-portal shell routes (`/dashboard/student`, `/dashboard/student-tools*`), which stay `StudentRoute` because "student" is an audience, not a capability.

## Resolution Semantics (authoritative)

1. **Role grant**: `role_permissions.actions = NULL` → all defined actions; an array → only those actions (role-level narrowing).
2. **User override** on a permission the role grants: `granted = FALSE` → dropped; `actions = NULL` → all of (role ∩ defined); `actions = [...]` → user ∩ role ∩ defined, empty ⇒ dropped.
3. **Overrides for permissions the role does not grant** are stored but always ignored — a specific user cannot gain a permission their role lacks (LMS-SOP override semantics). The specific-user editor therefore only lists permissions the role already grants, and offers per-permission actions to uncheck or a deny toggle. `GET /api/roles/users/:userId/permissions` returns the whole editor context in one response: user, role, role grants (with `role_actions`), all permissions with defined `actions`, the user's overrides, and the user's entity overrides.
4. **super_admin**: resolvers return everything; guards short-circuit. Overrides on super_admin accounts are no-ops — the drawer warns to that effect but still allows viewing.
5. **Entity overrides are allowlist-per-type**: once any row exists for (subject, entity_type), only entities with a granted row are accessible; deleting all rows for a type restores default access. UI scopes: **All** = no rows; **None** = deny row for every entity; **Selected** = grant rows for chosen entities.
6. **Session is never mutated with resolved data** (avoids express-session store writes). `resolvePermissions` attaches to `req.permissions`, `req.permissionDetails`, `req.entityOverrides`.
7. **Frontend truth source**: `localStorage.lexora_user.permissions` / `.permission_details`, refreshed on every page load from `GET /api/auth/me`.

## Data Model (6 tables + 1 seed marker, in `migrateSchema` of `server/config/db.js`)

`roles`, `permissions` (with `actions JSON`), `role_permissions` (with `actions JSON`), `user_permission_overrides` (`granted`, `actions JSON`), `role_entity_permissions`, `entity_permission_overrides`, plus `permission_seed_batches (batch VARCHAR(50) PRIMARY KEY, applied_at)`.

- No FKs on `role_name`/`permission_name` (MySQL 5.7/MariaDB friendly); `user_id`/`granted_by` plain indexed INTs.
- **Seed batches** (`v1_roles`, `v1_permissions`, `v1_role_grants`, `v1_action_backfill`) each run once, tracked in `permission_seed_batches`. Never re-run later — a plain `INSERT IGNORE` would re-insert grants a Super Admin deleted via the UI.
- `permissions` seed uses `INSERT … ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)` (never touches `actions` once set — actions are server-owned).
- Migration order: (1) all `CREATE TABLE IF NOT EXISTS`, (2) `ALTER TABLE … ADD COLUMN actions JSON DEFAULT NULL` (existing errno-1060 tolerance covers re-runs), (3) `UPDATE … WHERE actions IS NULL` backfills, (4) batch-guarded seeds. Avoids errno-1146.

## Backend Tasks

### New feature: `server/features/roles/` (mounted at `/api/roles` in `server/index.js`)

1. **`roles.repository.js`** — all SQL: list roles (with `permission_count`, `user_count`), list/get permissions, get role + grants (`rp.actions AS role_actions`), replace role grants (`DELETE` + bulk `INSERT`), overrides get/replace (user + entity, user + role variants), entity lookup/search via config: `users → users(username, is_active = 1)`, `books → books(title, is_deleted = 0)`, `lexora_books → lexora_books(title, is_deleted = 0)`, `courses → courses(title, is_deleted = 0)`, `tools → tools(title, is_active = 1)`; `LIMIT 200` list / `LIMIT 50` search.
2. **`roles.validation.js`** — hand-rolled `{errors, isValid}`: role name ∈ fixed 5; permission must exist + active; `actions` must be string array and **subset** of defined actions; `granted` boolean; `entity_type` ∈ 5 types; user exists.
3. **`roles.service.js`** — `parseActions` (JSON/array/string; fallbacks `view_*`→`[view]`, `manage_*`→CRUD set, `x.y`→`[view,y]`), `resolveUserPermissions`, `resolveUserPermissionDetails` (semantics above), **`applyOverride(roleActions, definedActions, override)` pure helper** (unit-tested), `resolveUserEntityOverrides`, `resolveRoleEntityPermissions`, use cases (`getRoles`, `getPermissions`, `getRoleDetail`, `saveRolePermissions`, `restoreRoleDefaults(roleName)` re-applying the seed matrix for one role, `get/saveUserOverrides`, `get/saveUserEntityOverrides`, `get/saveRoleEntityPermissions`, `getEntities`, `saveUserFull` transactional via `pool.getConnection()` + commit/rollback/release like `models/Trash.js`).
4. **`permissionGuards.js`** — `resolvePermissions` middleware (attaches to `req.*`), `requirePermission(name)`, `requirePermissionAction(name, action)` (super_admin short-circuit; lazy resolve fallback; `403 {success:false, error}`), `canAccessEntity`, `requireEntityTypeAccess`.
5. **`roles.controller.js`** — thin; `handleError` mapping like `users.controller.js`; audit every save (`PERM_UPDATE` / `USER_PERM_UPDATE` / `ENTITY_PERM_UPDATE`).
6. **`roles.routes.js`** — behind `requireAuth, requireSuperAdmin`, **static paths before param paths**: `GET /my-permissions` (requireAuth only), `GET /`, `GET /permissions`, `GET /entities`, `GET /entities/search`, user overrides GET/PUT, user entity-overrides GET/PUT, `POST /users/:userId/full-save`, `POST /roles/:roleName/restore-defaults`, `PUT /permissions/:roleName`, role entity-permissions GET/PUT, `GET /:id`.
7. **`index.js`** — public API (router + guards + resolvers); other features import only through here.
8. **Auth response wiring** — `authController.login` + `me` and `users.controller.getCurrentUser` include `permissions`, `permission_details`, `entity_overrides` (resolved fresh; never persisted into the session).

### Route retrofit (replace role guards with permission guards)

Pattern per file: add `router.use(requireAuth, resolvePermissions)` (or chain per route where a router-level `use` already exists), then swap each guard. Import guards from `../../features/roles` / `../features/roles` per file depth.

| File | Endpoint(s) | New guard |
|---|---|---|
| `routes/books.js` | `GET /`, `GET /:id`, `GET /:id/copies` | `manage_books:view` |
| | `POST /`, `POST /bulk-import` | `manage_books:create`, `manage_books:import` |
| | `PUT /:id` | `manage_books:edit` |
| | `DELETE /:id` | `manage_books:delete` |
| | `GET/POST /lexora`, `PUT/DELETE /lexora/:id`, `/lexora-import`, `*-check-duplicates` | `manage_lexora_books:{view,create,edit,delete,import}` |
| | `GET /count/all`, `GET /stats` | **unchanged** (`requireAdmin`) |
| `routes/lexoraBooksRoutes.js` | `GET /`, `GET /:id` | `view_lexora_books:view` |
| | `GET /:id/pages` | `view_lexora_books:read` |
| | `GET /categories/all`, `/tags/all` | `manage_lexora_books:view` |
| | `POST /`, `PUT /:id` | `manage_lexora_books:create`, `:edit` |
| | `DELETE /:id`, `/:id/pdf`, `/:id/cover` | `manage_lexora_books:delete`, `:edit` |
| | `POST /:id/publish`, `/unpublish` | `manage_lexora_books:publish` |
| | `POST /:id/archive`, `/restore` | `manage_lexora_books:archive` |
| | `GET /my-bookmarks` | unchanged (`requireAuth`) |
| `routes/transactions.js` | all 12 endpoints | `manage_transactions:{view,create,edit,return,extend,delete,pay_fine}` |
| `routes/attendance.js` | all `GET`s | `manage_attendance:view` |
| | `POST /tap/:studentIdNumber`, `POST /check-in` | `use_kiosk:check_in` |
| | `POST /check-out/:studentIdNumber` | `use_kiosk:check_out` |
| | `DELETE /:id` | `manage_attendance:delete` |
| `routes/students.js` | `/faculty*` (5 endpoints) | `manage_faculty:{view,create,edit,delete,import}` |
| | remaining 9 endpoints | `manage_students:{view,create,edit,delete,import}` |
| `routes/rfid.js` | `GET /simulate`, `GET /` | `manage_rfid:view` |
| | `POST /register`, `DELETE /:id` | `manage_rfid:register`, `:delete` |
| `routes/trash.js` | `GET /`, `POST /restore/:id`, `DELETE /all`, `DELETE /:id` | `manage_trash:{view,restore,delete}` |
| `routes/audit.js` | `router.use` → `view_audit_logs:view`; `GET /export` | `view_audit_logs:export` |
| `routes/analytics.js` | `router.use(requireAuth, requireAdmin)` → `requireAuth, requirePermissionAction('view_reports','view')` |
| `features/courses/courses.routes.js` | `GET /`, `/categories`, `POST /thumbnail` | `manage_courses:{view,edit}` |
| | `GET /library`, `GET /:id`, `/:courseId/modules|content|enrollments|progress` | `view_course_library:view` |
| | `POST /lessons/:lessonId/complete` | `view_course_library:complete` |
| | `POST /`, `PUT /:id`, `DELETE /:id` | `manage_courses:{create,edit,delete}` |
| | `PATCH /:id/publish`, `/archive` | `manage_courses:publish`, `:archive` |
| | `POST|DELETE /:courseId/enrollments` | `manage_courses:enroll` |
| | module/content writes | `manage_courses:edit` |
| `features/courses/builder.routes.js` | `GET|PUT /:id/builder` | `manage_courses:{view,edit}` |
| | `PATCH /:id/publish`, `/submit-review`, `/approve` | `manage_courses:{publish,submit_review,approve}` |
| `features/users/users.routes.js` | `GET /`, `/stats`, `/:id` | `manage_users:view` |
| | `POST /`, `PUT /:id`, `PUT /:id/password` | `manage_users:{create,edit}` |
| | `PUT /:id/role` | `manage_users:manage_roles` |
| | `DELETE /:id`, `PATCH /:id/reactivate` | `manage_users:{delete,reactivate}` |
| | `GET /me` | unchanged (`requireAuth`) |
| | **keep** `users.service.js` hierarchy rules (`canManageTarget`, `canChangeRole`, …) — orthogonal to permissions |
| `features/portal/portal.routes.js` | `GET /slides` | `manage_settings:view` |
| | `POST /slides`, `PUT /slides/:id`, `PATCH /slides/reorder`, `DELETE /slides/:id` | `manage_settings:{create,edit,reorder,delete}` |
| | `GET /home` | unchanged (`requireAllRoles`) |
| `features/tools/tools.routes.js` | `GET /`, `/categories`, `/:id` | `use_tools:view` |
| | `GET /:id/download` | `use_tools:download` |
| | `GET /stats` | `manage_tools:view` |
| | `POST /`, `PUT /:id`, `DELETE /:id` | `manage_tools:{create,edit,delete}` |
| `routes/search.js` | — | unchanged (public) |
| `server/index.js` | `GET /api/books/stats` | add `requireAuth, requirePermissionAction('view_reports','view')` |

## Frontend Tasks

New feature folder `client/src/features/roles/` (all pages import it through its `index.js` only):
- `api/rolesApi.js` — `fetch` + `credentials: "include"` (no axios in this project): `fetchRoles`, `fetchPermissions`, `fetchRole(id)`, `saveRolePermissions`, `restoreRoleDefaults`, `fetchMyPermissions`, `fetchUserPermissions(userId)` (full editor context), `saveUserOverrides`, `fetchEntities(type, q)`, `fetchUserEntityOverrides`, `saveUserEntityOverrides`, `fetchRoleEntityPermissions`, `saveRoleEntityPermissions`, `saveUserFull`. Transport errors throw; business failures return `{success:false, error}`; `actions` normalized (JSON → array) exactly once here.
- `utils/rolePermissionHelpers.js` — `parseActions`, `getDefinedActions`, `groupByCategory`, `computeRolePermState`, `computeUserOverridesToSave` (emit only overrides that differ from role defaults; all actions unchecked ⇒ `{granted:false, actions:[]}`), `computeEntityOverridesToSave` (deny-scope writes a deny row per entity; selected-scope writes grant rows), `initEntityStates`, `toggleUserAction`, `CATEGORY_LABELS`, `ACTION_LABELS`, `ENTITY_TYPE_CONFIG` (5 types → owner permission + label).
- `index.js` — exports `RolesPage`, `UserPermissionsDrawer`, the hooks, and api functions other features consume.

### Primitives
1. **`hooks/useAuth.js`** — add `permissions`, `permission_details`, `entity_overrides` from the stored user; `hasPermission(name)`, `hasPermissionAction(name, action)` (super_admin always true; **legacy fallback**: details absent but name present ⇒ true), `canAccessEntity(type, id)`.
2. **`components/auth/ProtectedRoute.jsx`** — add `PermissionRoute({ permission, action, children })`: reads `useAuth`, denied ⇒ `Navigate` to `ROLE_DEFAULT_ROUTES[role]` (same as `RoleRoute`). Also persist the fresh user from `authApi.me()` to `localStorage` + `sessionStorage` so permission edits apply on the next page load.
3. **`components/layout/Sidebar.jsx`** — add `permission` (+ optional `action`) to nav items; visibility = permission check when present, else existing role check (student-shell items keep role-only). Mapping: Dashboard Analytics → `view_dashboard:view` (children → `view_reports:view`); Books → `manage_books:view`; Manage Lexora Books → `manage_lexora_books:view`; Courses → `manage_courses:view`; Course Library → `view_course_library:view`; Borrowed → `manage_transactions:view`; Attendance group → `manage_attendance:view` (Students → `manage_students:view`, Faculty → `manage_faculty:view`, Kiosk → `use_kiosk:check_in`); Tools → `manage_tools:view`; Recently Deleted → `manage_trash:view`; Audit Trail → `view_audit_logs:view`; Settings group → `manage_settings:view` (Users child → `manage_users:view`); **new** Roles & Permissions → `manage_permissions:view` (System section, `ShieldCheck`).
4. **`App.jsx`** — swap capability routes to `PermissionRoute` (index → `view_dashboard:view`; books/lexora manage → `manage_books:view` / `manage_lexora_books:view`; books+attendance dashboards → `view_reports:view`; borrowed → `manage_transactions:view`; deleted → `manage_trash:view`; audit-log → `view_audit_logs:view`; attendance → `manage_attendance:view`; kiosk → `use_kiosk:check_in`; students/faculty → `manage_students:view` / `manage_faculty:view`; courses → `manage_courses:view`; courses/create → `manage_courses:create`; courses/:id + /learn + course-library → `view_course_library:view`; courses/:id/builder → `manage_courses:view`; users → `manage_users:view`; settings → `manage_settings:view`; tools → `manage_tools:view`; **new** roles → `manage_permissions:view` under `SuperAdminRoute`). Student shell routes keep `StudentRoute`.
5. **`constants/roles.js`** — delete `ROLE_PERMISSIONS` (zero consumers, proven stale). Keep `ROLES`, `ROLE_DEFAULT_ROUTES`, `ROLE_LABELS`, `ROLE_DESCRIPTIONS`, `ROLE_HIERARCHY`, `DEFAULT_SEED_PASSWORD`.

### Per-page action gating (pattern: `const canX = hasPermissionAction('perm','action')`)

| Page / component | Gate |
|---|---|
| `pages/Books.jsx` + `components/books/*` | Add/Edit/Delete/Bulk-Import → `manage_books:{create,edit,delete,import}` |
| `pages/Borrowed.jsx` | New borrow / return / extend / pay fine / delete → `manage_transactions:{create,return,extend,pay_fine,delete}` |
| `pages/RecentlyDeleted.jsx` | Restore / permanent delete → `manage_trash:{restore,delete}` |
| `pages/AuditLog.jsx`, `pages/AuditLogs.jsx` | Export CSV → `view_audit_logs:export` |
| `pages/Attendance.jsx`, `AttendanceDashboard.jsx` | Check-in/out, delete → `use_kiosk:{check_in,check_out}`, `manage_attendance:delete` |
| `pages/KioskAttendance.jsx` | Tap/check-in → `use_kiosk:*` |
| `pages/Students.jsx`, `pages/Faculty.jsx` | Add/Edit/Delete/Bulk import → `manage_students:*` / `manage_faculty:*` |
| `pages/Courses.jsx`, `CourseCreate.jsx`, `CourseDetails.jsx`, `CourseBuilder.jsx` | Create/Edit/Delete/Publish/Archive/Submit/Approve → `manage_courses:*`; enroll → `manage_courses:enroll` **or** `view_course_library:enroll`; mark-lesson-complete → `view_course_library:complete` |
| `features/users/pages/UsersPage.jsx`, `UserFormModal`, `UserRoleModal`, `UserTable` | Add/Edit/Deactivate/Change-role/Reactivate/Reset-password → `manage_users:{create,edit,delete,manage_roles,reactivate}`; **Permissions** row action → visible only with `manage_permissions:view` |
| `features/tools/pages/ToolsPage.jsx` | Create/Edit/Delete → `manage_tools:*` |
| `features/tools/pages/StudentToolsPage.jsx`, `ToolDetailsPage.jsx` | Download → `use_tools:download` |
| `features/lexora-books/*` (manage pages) | Create/Edit/Delete/Publish/Archive/Import → `manage_lexora_books:*`; reader → `view_lexora_books:read` |
| `features/settings` (HeroSlidesManager) | Add/Edit/Delete/Reorder → `manage_settings:{create,edit,delete,reorder}` |
| `pages/Dashboard.jsx`, `DashboardAnalytics.jsx`, `BookDashboard.jsx` | Route-level only (`view_dashboard:view` / `view_reports:view`) |

Where a permission gate hides the only entry point to a page, ensure the nav item and route agree (both use the same permission, per the mappings above).

### Permission management UI — two surfaces, one shared drawer

**Surface 1 — General Role Permissions** (`/dashboard/roles`, Super Admin only):
- `pages/RolesPage.jsx` composition only (≤150 lines): header, role table, matrix, drawer state, toasts.
- `components/RolesTable.jsx` — the 5 fixed roles with permission/user counts, select-to-edit.
- `components/RolePermissionMatrix.jsx` — category-grouped rows; per permission: grant toggle + action chips from the permission's defined actions; dirty tracking; Save/Cancel; **Restore defaults** button calling `POST /roles/:roleName/restore-defaults`.
- `hooks/useRolePermissions.js` — roles + permissions + selected role matrix; `saveRolePermissions(roleName, grants)`; `restoreRoleDefaults(roleName)`; saving state.

**Surface 2 — Specific User Permissions** (shared editor, two entry points into the same drawer):
- `components/UserPermissionsDrawer.jsx` — standalone modal, props `{ open, onClose, userId }`; tabs **Permissions** | **Entity Access**; shows each role-granted permission with its actions (checked = effective, dimmed = overridden away), a deny toggle per permission, and "reset to role default" per permission; warning banner when the target is a `super_admin` (bypass makes overrides no-ops).
- `components/EntityOverridePanel.jsx` — entity type selector (5), scope radios All / None / Selected, searchable entity checklist; used by both role-level and user-level drawers.
- `components/ActionChip.jsx` — accessible checkbox chip.
- `hooks/useUserPermissions.js` — accepts a `userId` (not role-scoped); loads the **entire** editor context from the single `GET /api/roles/users/:userId/permissions` response; `saveOverrides(userId, overrides)`; `saveEntityOverrides(...)`; saving state.
- `hooks/useEntityOverrides.js` — entity list/search per type (`GET /entities`, `GET /entities/search`).
- **Entry point A (Roles page):** a role-scoped user picker (users of the selected role via `fetchUsers({ role })` imported from `../../users`) that opens the drawer.
- **Entry point B (Users page):** a **Permissions** row action in `features/users/pages/UsersPage.jsx` + `UserTable.jsx`, rendered only when `hasPermissionAction('manage_permissions','view')` (i.e. super_admin — the management API is `requireSuperAdmin`). It sets `?permissions=<userId>` via `useSearchParams`; `UsersPage` reads the param, renders `<UserPermissionsDrawer>` imported from `../../roles` (through the feature `index.js`), and clears the param on close so the URL stays shareable and back/forward works.

Both surfaces use the same `UserPermissionsDrawer`, the same save endpoints, and the same audit actions — no duplicate logic.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Retrofit blast radius (13 route files, ~15 pages) | Seed mirrors current guards so behavior is neutral; per-role regression matrix in validation |
| Super Admin misconfigures grants and locks users out | `POST /roles/:roleName/restore-defaults` button; audit trail records every change; super_admin bypasses all checks |
| Re-seed on boot undoing UI edits | `permission_seed_batches` marker; each batch runs once |
| Session-store writes | Resolved data attaches to `req` only |
| Stale client copy after edits | `ProtectedRoute` refresh from `/auth/me`; management UI reads fresh from API |
| Concurrent editors on one role | Last-write-wins; audit records actor + payload |
| Route shadowing (`GET /permissions` vs `GET /:id`) | Static paths registered before param paths |
| Students losing attendance API access | Intentional (UI already blocked them); called out in this plan |
| Two permission entry points drifting apart | One shared `UserPermissionsDrawer` + one save endpoint per concern; both entry paths exercised in validation step 8 |

## Validation Plan

1. **Unit:** `node --test server/tests/permissionResolution.test.js` — `parseActions` + `applyOverride` cases (granted=false drop, actions=null ⇒ all, subset intersection, empty ⇒ drop).
2. **Syntax/boot:** `node -c` per file; `node index.js` twice — idempotent migrations, batches run once, edits survive restart.
3. **DB checks:** 20 permissions with correct `actions`; grants matrix matches catalog; deleted grant stays deleted after restart.
4. **API matrix (per role × endpoint sample):** for each of super_admin/admin/librarian/staff/student — one allowed call and one denied call per feature (books CRUD, lexora, transactions, trash, audit, attendance, students, faculty, rfid, courses, tools, users, portal, analytics). Confirm responses identical to pre-retrofit behavior for allowed calls.
5. **Guard behavior:** `restore-defaults` resets a role; invalid action subset ⇒ 400; non-super-admin on `/api/roles/*` ⇒ 403; `GET /api/books/stats` anonymous ⇒ 401.
6. **Regression:** log in as each seeded user; walk previously accessible pages/actions end-to-end; confirm students are blocked from attendance APIs (intentional).
7. **UI walkthrough:** `/dashboard/roles` as super_admin — edit role actions → save → reload; restore-defaults; user drawer override; entity override; then as librarian confirm nav/buttons reflect a removed action.
8. **Specific-user surface:** from the Users page, click **Permissions** on a librarian → URL becomes `?permissions=<id>` → uncheck `manage_books:delete` → save → reload → that librarian loses the Delete button and gets 403 from `DELETE /api/books/:id` while other librarians are unaffected; "reset to role default" restores access; editing a `super_admin` shows the bypass warning; browser back closes the drawer. Confirm the same drawer opened from the Roles page behaves identically.
9. **Build:** `npm run --prefix client run build` — zero errors; lint if a script exists.

## Rollout

1. Backend: migrations + seed + roles feature + guard retrofit (single PR; seed-mirrored grants make it behavior-neutral).
2. Frontend: `useAuth` + `PermissionRoute` + sidebar/nav + route swap + per-page gating + the two permission-management surfaces + `ROLE_PERMISSIONS` deletion.
3. Super Admin reviews the seeded matrix and adjusts grants.
4. Future: adopt `canAccessEntity` / `requireEntityTypeAccess` for row-level filtering where needed (entity overrides are manageable now but not yet applied inside queries).

## Open Items

- **Specific-user grants beyond the role (union semantics)** — the offered alternative to the chosen narrow/deny-only override model was not confirmed, so this plan implements LMS-SOP parity: a specific user can only have permissions **removed**, never added. If per-user *additions* are wanted later, the change is localized: `resolveUserPermissionDetails` unions role grants with `granted=TRUE` override rows instead of intersecting, `GET /users/:userId/permissions` returns all 20 permissions instead of only the role's grants, and the drawer gains a "not assigned" state. No schema change required.

## File Inventory

**New — backend:** `server/features/roles/{roles.repository.js, roles.service.js, roles.validation.js, roles.controller.js, roles.routes.js, permissionGuards.js, index.js}`, `server/tests/permissionResolution.test.js`
**Changed — backend:** `server/config/db.js`, `server/index.js`, `server/controllers/authController.js`, `server/features/users/users.controller.js`, all 13 route files in the retrofit table
**New — frontend:** `client/src/features/roles/{index.js, api/rolesApi.js, utils/rolePermissionHelpers.js, hooks/useRolePermissions.js, hooks/useUserPermissions.js, hooks/useEntityOverrides.js, pages/RolesPage.jsx, components/RolesTable.jsx, components/RolePermissionMatrix.jsx, components/UserPermissionsDrawer.jsx, components/EntityOverridePanel.jsx, components/ActionChip.jsx}`
**Changed — frontend:** `client/src/hooks/useAuth.js`, `client/src/components/auth/ProtectedRoute.jsx`, `client/src/components/layout/Sidebar.jsx`, `client/src/App.jsx`, `client/src/constants/roles.js`, `client/src/features/users/pages/UsersPage.jsx`, `client/src/features/users/components/UserTable.jsx`, plus the ~15 pages listed in the frontend retrofit tables
