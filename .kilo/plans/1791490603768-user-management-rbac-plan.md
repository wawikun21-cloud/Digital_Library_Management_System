# User Management & RBAC Implementation Plan

## Context Summary

### What Exists Today (Digital Library)

The Digital Library Management System (`Digital_Library_Management_System`) has a **partial** user management system:

**Backend:**
- `server/models/User.js` — Simple model with `findByUsername`, `findById`, `create`, `verifyPassword`, `updateProfile` (username, password, avatar only)
- `server/middleware/authMiddleware.js` — Has `ROLES = { ADMIN, STAFF, LIBRARIAN }` and `requireRole(...)`, `requireAdmin`, `requireStaff`, `requireLibrarian`, `requireAdminOrLibrarian`, `requireAnyRole`, `requireAuth`
- `server/config/db.js` — `users` table with only `(id, username, password, role, avatar_url, created_at)` columns. Role ENUM is `('admin', 'staff', 'librarian')`
- `server/routes/auth.js` + `server/controllers/authController.js` — Login/logout/me/profile update only. **No user management endpoints** (no CRUD, no admin panel)

**Frontend:**
- `client/src/constants/roles.js` — `ROLES = { ADMIN, STAFF, LIBRARIAN }` with `ROLE_DEFAULT_ROUTES` and `ROLE_LABELS`
- `client/src/components/auth/ProtectedRoute.jsx` — `ProtectedRoute`, `AdminRoute`, `AdminOrStaffRoute`, `CatalogRoute`, `AnyRoleRoute`
- `client/src/components/layout/Sidebar.jsx` — NAV_ITEMS with `roles` arrays for filtering
- `client/src/pages/Login.jsx` — Login with role-based redirect
- `client/src/hooks/useAuth.js` — Minimal (reads from localStorage)

### What Exists in LMS-SOP (Reference Implementation)

The LMS-SOP project has a **robust, production-grade** user management + RBAC system:

1. **Roles**: `super_admin`, `admin`, `department_head`, `employee` — hierarchical
2. **Database schema** (`sql/schema.sql`):
   - `users` — 24 columns including `full_name`, `email`, `position_title`, `employee_id`, `contact_number`, `employment_status`, `date_hired`, `birthdate`, `address`, `bio`, `cover_photo_url`, `failed_attempts`, `locked_at`, `reset_token`, etc.
   - `roles` — role definitions table
   - `permissions` — granular permission definitions
   - `role_permissions` — many-to-many role→permission mapping
   - `user_permission_overrides` — per-user permission overrides
   - `role_entity_permissions` — per-role entity-scoped permissions
   - `entity_permission_overrides` — per-user entity-scoped permission overrides
   - `department_scope_grants` — department-level scope for department heads
   - `user_role_history` — audit trail of role changes
3. **Backend middleware**:
   - `server/middleware/auth.js` — JWT auth, `authenticateToken`, `requireSuperAdmin`, `requireAdmin`, `requireDepartmentHead`, `authorize(...)`, `resolveScope`
   - `server/middleware/scope.js` — `requireBusinessScope`, `requireDepartmentScope`, `requirePermission`, `requirePermissionAction`, `resolveUserPermissions`, `resolveUserPermissionDetails`, entity-level overrides
   - `server/middleware/rbac.js` — Hierarchy-based scope containment (`authorizeManageEntity`, `attachCanManage`, `getUserHierarchyScope`)
   - `server/middleware/scopedUserManagement.js` — `canAssignRole`, `canManageUser`, `validateScopeAssignment`, `fetchUsersWithHierarchyForAdmin`
4. **Backend routes** (`server/routes/users.js`):
   - Full CRUD: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`
   - Password change: `PUT /:id/password`
   - Stats: `GET /stats`, `GET /leaderboard`
   - Current user: `GET /me`
   - Bulk upload: `POST /bulk-upload`
   - Onboarding: `POST /:userId/onboarding-sops`
   - Role-based scoping: super_admin sees everything, admin scoped to business, department_head scoped to their departments
   - Granular permission checks: `requirePermissionAction('manage_users', 'create')`, `'edit'`, `'delete'`, `'manage_roles'`
5. **Backend routes** (`server/routes/roles.js`):
   - `GET /` — list roles with counts
   - `GET /:id` — role details with permissions
   - `POST /` — create role (super_admin only)
   - `PUT /:id` — update role
   - `DELETE /:id` — delete role
   - `GET /permissions` — list all permissions
   - `PUT /permissions/:roleName` — assign permissions to role
   - `GET /users/:userId/permissions` — get user's permission overrides
   - `PUT /users/:userId/permissions` — set user permission overrides
   - `GET /entities` — entity lookup for permission assignment
   - `GET /users/:userId/entity-overrides` — get entity-scoped overrides
   - `PUT /users/:userId/entity-overrides` — set entity-scoped overrides
   - `POST /users/:userId/full-save` — transactional save of role + all overrides
   - `GET /:roleName/entity-permissions` — get role entity-level permissions
   - `PUT /:roleName/entity-permissions` — set role entity-level permissions
6. **Database migrations** — `roles`, `permissions`, `role_permissions`, `user_permission_overrides`, `role_entity_permissions`, `entity_permission_overrides`, `user_role_history`, `department_scope_grants` tables with full DDL
7. **Frontend** (`client/src/contexts/AuthContext.jsx`):
   - Full auth state management with login, logout, forgotPassword, resetPassword, switchSession
   - `hasPermission()`, `hasPermissionAction()` — checks against user's resolved permissions
   - `isSuperAdmin`, `isAdmin`, `isDepartmentHead`, `isEmployee`, `isAnyAdmin` flags
   - `canCreateSops` derived permission
8. **Seed data** — `sql/seed.sql` with hashed passwords, test users, role-permission mappings

## Current Gap Analysis

| Capability | LMS-SOP | Digital Library (Current) | Digital Library (Target) |
|---|---|---|---|
| Roles | 4 (super_admin, admin, department_head, employee) | 3 (admin, staff, librarian) | 5 (super_admin, admin, librarian, staff, student) |
| User table columns | 24 (full profile) | 6 (minimal) | 20+ (profile + role management) |
| Role management UI | Full admin panel | None | Full admin panel for Super Admin/Admin |
| Permission system | Granular (roles + permissions + overrides) | None | Role-based (no granular permissions needed) |
| Scope containment | Hierarchy-based | None | N/A (flat roles) |
| User CRUD | Full | None | Full (role-dependent) |
| Audit trail | role_history + audit_logs | audit_logs only | audit_logs for role changes |

## Target Role Model

```
Super Admin  — New role. Full system access. Can create/manage ALL user types including other Super Admins and Admins.
Admin        — Full access except Permission Management (future). Can manage Librarian, Staff, Student users but NOT other Admins or Super Admins.
Librarian    — Can manage Books only (books CRUD, lexora books). Cannot access attendance, students, courses, or user management.
Staff        — Can manage Student Attendance RFID (attendance CRUD, students, faculty, RFID cards). Cannot access books, courses, or user management.
Student      — Can access Flipbook (lexora books catalog/reader), Course (course library), and Tools. Read-only access to assigned resources.
```

**Key difference from LMS-SOP**: The Digital Library uses a **flat role model** (no hierarchy containment like ARSEN→Group→Squadron). Roles map directly to feature access. No scope containment needed — each role either can or cannot access a feature area.

## Suggested User Fields (per Role)

### Shared (all roles)
| Field | Type | Required | Notes |
|---|---|---|---|
| `username` | VARCHAR(100) | Yes | **"ID No / Username"** — unique, used for login |
| `password` | VARCHAR(255) | Yes | bcrypt hashed; default `password123` for seeded accounts |
| `role` | ENUM | Yes | `super_admin`, `admin`, `librarian`, `staff`, `student` |
| `avatar_url` | TEXT | No | Profile picture |
| `created_at` | TIMESTAMP | Auto | Record created |
| `updated_at` | TIMESTAMP | Auto | Last updated |
| `is_active` | TINYINT(1) | Yes, default TRUE | Soft-deletable account |

### Admin / Staff / Librarian (staff-type users)
| Field | Type | Required | Notes |
|---|---|---|---|
| `full_name` | VARCHAR(255) | Yes | Full name |
| `email` | VARCHAR(255) | No | Work email |
| `position_title` | VARCHAR(255) | No | Job title |
| `employee_id` | VARCHAR(100) | No | Staff employee ID |
| `contact_number` | VARCHAR(50) | No | Phone |
| `date_hired` | DATE | No | When hired |
| `birthdate` | DATE | No | Date of birth |
| `address` | TEXT | No | Home address |
| `employment_status` | VARCHAR(100) | No | Regular, Probationary, etc. |

### Student-specific
| Field | Type | Required | No |
|---|---|---|---|
| `student_id_number` | VARCHAR(100) | Yes | Student ID (can be same as username) |
| `student_name` | VARCHAR(255) | Yes | Full name (can sync from full_name) |
| `student_course` | VARCHAR(100) | No | Course/program |
| `student_yr_level` | VARCHAR(50) | No | Year level |
| `student_email` | VARCHAR(255) | No | Student email |
| `student_contact` | VARCHAR(100) | No | Contact number |

> **Note**: The Digital Library already has a `students` table with these fields. The question is whether Student users are stored in the `users` table (with a `student` role) or kept separate. Given the requirement for a unified login (the username is "ID No/Username"), Student users should exist in the `users` table AND optionally link to the `students` table.

### Super Admin-specific
| Field | Type | Required | Notes |
|---|---|---|---|
| `full_name` | VARCHAR(255) | Yes | |
| `email` | VARCHAR(255) | Yes | Unique |
| `position_title` | VARCHAR(255) | No | |

## Clarifying Questions

### Q1: Student user storage — unified vs. separate table?
**Context**: The Digital Library already has a `students` table with `student_id_number`, `student_name`, `student_course`, etc. Students need to log in with "ID No / Username" + `password123`.

**Options**:
- **A** (Recommended): Store Student users in the `users` table with `role='student'`. Add a nullable `student_id_number` FK column on `users`. Students can optionally link to the existing `students` table via `student_id_number`, but login uses the `users.username` column.
- **B**: Keep Student records in `students` table. Create a separate login bridge table that maps `student_id_number` → `password_hash`. This duplicates auth logic.
- **C**: Store Student users in `users` table only. Drop the link to `students` table entirely for system login (the `students` table is then only for attendance/transaction records).

**My recommendation**: Option A — it keeps a single source of truth for authentication while preserving the existing `students` table for attendance/RFID linkage.

### Q2: "Permission Management" exclusion for Admin
**Context**: The requirement says Admin has "Full access, but except in Permission Management (later to be implemented)."

**Question**: When "Permission Management" is later implemented, what exactly will it cover?
- **A** (Recommended): Permission Management = the ability to assign/modify roles and granular permissions. Admins can manage users (create/edit/delete Librarian, Staff, Student) but cannot change roles of other Admins or Super Admins, and cannot grant/revoke system permissions.
- **B**: Permission Management is a separate UI section (e.g., `/dashboard/permissions`) that only Super Admin can access. Admins get full user management but are blocked from a permissions UI.

### Q3: Student access to "Flipbook, Course, and Tools" — granularity
**Context**: Students can access "Flipbook, Course, and Tools."

**Question**: Are these the existing pages already in the app?
- **Flipbook** → likely the Lexora e-book reader (`LexoraBookReader`) and/or `LexoraBooksCatalog`?
- **Course** → the `Courses` / `CourseLibrary` pages?
- **Tools** → what specific tools? RFID kiosk? Something else?

**My recommendation**: Treat these as route-level access. Students get read-only access to `lexora-books` (catalog + reader), `courses`/`course-library`, and a generic "Tools" section. Need to confirm the exact route paths.

### Q4: Should Student be a loginable system user or read-only?
**Context**: Students log in with ID No + password123. But the Digital Library is described as a "Library" system.

**Question**: Do Students need a full dashboard with sidebar navigation, or just a simplified portal?
- **A** (Recommended): Students get a simplified dashboard — access to Flipbook, Course, Tools only. No sidebar items for Books management, Attendance, Borrowed, etc.
- **B**: Students get the same Layout/Sidebar but with only 3 nav items visible.

### Q5: Default password policy
**Context**: "Password is Default 'password123'" for seeded accounts.

**Question**: Is `password123` the default for ALL seeded users (all 5 roles), or only for students? Should there be a password change prompt on first login?
- **A** (Recommended): All seeded users use `password123`. No forced first-login change (matches existing Digital Library pattern where `admin123` is used for dev). Production should use env vars like `DEFAULT_ADMIN_PASSWORD`.
- **B**: Force password change on first login for all seeded accounts.

### Q6: Role hierarchy for user management
**Context**: Who can create/modify which users?

**Proposed matrix**:

| Action | Super Admin | Admin | Librarian | Staff | Student |
|---|---|---|---|---|---|
| Create Super Admin | ✓ | ✗ | ✗ | ✗ | ✗ |
| Create Admin | ✓ | ✗ | ✗ | ✗ | ✗ |
| Create Librarian | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create Staff | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create Student | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit own profile | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit other users | ✓ | limited (own business/same role tier) | ✗ | ✗ | ✗ |
| Change role | ✓ | ✗ (cannot promote to Admin/Super Admin) | ✗ | ✗ | ✗ |
| Deactivate user | ✓ | ✓ (cannot deactivate Admin/Super Admin) | ✗ | ✗ | ✗ |

**Question**: Does this matrix look correct? Specifically:
- Should Admin be able to create other Admins? (Currently no — matches LMS-SOP pattern)
- Should Staff or Librarian ever manage users? (Currently no)

### Q7: Migration strategy for existing `users` table
**Context**: The existing `users` table has only 6 columns. We need to expand it.

**Options**:
- **A** (Recommended): Add columns via migration (`ALTER TABLE users ADD COLUMN ...`). Preserve existing data. The existing single `admin` user becomes `role='admin'` with full profile fields.
- **B**: Drop and recreate the `users` table with the full schema, losing existing data.

**My recommendation**: Option A — additive migration that preserves existing rows.

## Implementation Plan (Phased)

### Phase 0: Database Schema (Backend)
**Goal**: Expand the `users` table and seed default roles

1. **Migration file**: `server/migrations/006_user_management_rbac.sql`
   - ALTER `users` table: add `full_name`, `email`, `position_title`, `employee_id`, `contact_number`, `date_hired`, `birthdate`, `address`, `employment_status`, `is_active`, `updated_at`, `student_id_number`
   - ALTER `users.role` ENUM to add `super_admin` and `student`
   - Add indexes: `idx_users_role`, `idx_users_active`, `UNIQUE KEY uk_users_email`
2. **Seed data**: Insert `password123` default admin (re-hash existing) + seed roles
3. **Update `server/config/db.js`**: Apply migration on startup alongside existing migrations

### Phase 1: Backend Routes (Backend)
**Goal**: Build `/api/users` CRUD endpoints with role-based authorization

**New files** (following Anti-Spaghetti rules — feature-based, controller/service/repository split):
- `server/features/users/users.routes.js` — Route definitions only
- `server/features/users/users.controller.js` — Thin request/response handlers
- `server/features/users/users.service.js` — Business rules (role assignment hierarchy, permission checks)
- `server/features/users/users.repository.js` — SQL-only queries
- `server/features/users/users.validation.js` — Express-validator schemas

**Key endpoints**:
- `GET /api/users` — List users (Super Admin sees all; Admin sees their scope)
- `GET /api/users/stats` — User stats by role
- `GET /api/users/me` — Current user profile
- `GET /api/users/:id` — Get single user
- `POST /api/users` — Create user (role-gated)
- `PUT /api/users/:id` — Update user (role-gated)
- `PUT /api/users/:id/role` — Change role (Super Admin + Admin, can't promote to Admin/Super Admin)
- `DELETE /api/users/:id` — Deactivate user (soft delete)

**Authorization middleware to update**:
- `server/middleware/authMiddleware.js` — Add `SUPER_ADMIN` role, `requireSuperAdmin`, `requireAdminOrLibrarian`, `requireAdminOrStaff`, `requireStudent`

### Phase 2: Frontend Constants (Frontend)
**Goal**: Update role constants

1. **`client/src/constants/roles.js`** — Add `SUPER_ADMIN` and `STUDENT` roles
   - `ROLE_DEFAULT_ROUTES`: super_admin → `/dashboard`, admin → `/dashboard`, librarian → `/dashboard/books`, staff → `/dashboard/attendance`, student → `/student`
   - `ROLE_LABELS`: Add "Super Admin" and "Student"
   - `ROLE_DESCRIPTIONS`: Human-readable for user creation UI
   - `ROLE_PERMISSIONS`: Map each role to feature access (books, attendance, courses, lexora, users)

### Phase 3: Frontend Auth Context (Frontend)
**Goal**: Update auth context to support new roles

1. **`client/src/hooks/useAuth.js`** — Update to read from localStorage and expose `isSuperAdmin`, `isAdmin`, `isLibrarian`, `isStaff`, `isStudent`
2. **`client/src/components/auth/ProtectedRoute.jsx`** — Add `SuperAdminRoute`, `StudentRoute`, update `AnyRoleRoute` to include all 5 roles

### Phase 4: Frontend — Users Feature (Frontend)
**Goal**: Build user management UI as a feature module

Following the Anti-Spaghetti rules (`server/src/features/` and `client/src/features/`):

```
client/src/features/users/
├── api/
│   └── usersApi.js            # HTTP client for /api/users
├── components/
│   ├── UserForm.jsx           # Create/edit user form (with role dropdown)
│   ├── UserTable.jsx          # User list table
│   ├── UserCard.jsx           # Mobile-friendly card view
│   └── UserRoleBadge.jsx      # Role display badge
├── hooks/
│   └── useUsers.js            # Data fetching + mutations
├── validation/
│   └── userValidation.js      # Form validation
├── pages/
│   └── UsersPage.jsx          # Composition-only page
└── index.js                   # Public API exports
```

### Phase 5: Frontend — Sidebar & Routing (Frontend)
**Goal**: Wire up nav visibility and routes

1. **`client/src/components/layout/Sidebar.jsx`** — Add "Users" nav item (Super Admin + Admin only)
2. **`client/src/App.jsx`** — Add `/dashboard/users` route (protected by Super Admin + Admin)
3. **`client/src/components/layout/Topbar.jsx`** — Update role display

### Phase 6: Seed Data & Testing
**Goal**: Seed default users, verify role-based access

1. Seed script: Create one user of each role with `password123`
2. Test login + redirect for each role
3. Verify route protection
4. Verify user CRUD permissions

## Role → Feature Access Matrix

| Feature | Super Admin | Admin | Librarian | Staff | Student |
|---|---|---|---|---|---|
| Dashboard Analytics | ✓ | ✓ | ✗ | ✗ | ✗ |
| Books (CRUD) | ✓ | ✗ | ✓ | ✗ | ✗ |
| Lexora Books (Manage) | ✓ | ✓ | ✓ | ✗ | ✗ |
| Lexora Books (Read/Flipbook) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Borrowed Books | ✓ | ✓ | ✓ | ✗ | ✗ |
| Recently Deleted | ✓ | ✗ | ✗ | ✗ | ✗ |
| Audit Trail | ✓ | ✗ | ✗ | ✗ | ✗ |
| Attendance (CRUD) | ✓ | ✓ | ✗ | ✓ | ✗ |
| Students (CRUD) | ✓ | ✓ | ✗ | ✓ | ✗ |
| Faculty (CRUD) | ✓ | ✓ | ✗ | ✓ | ✗ |
| Kiosk Attendance | ✓ | ✓ | ✗ | ✓ | ✗ |
| Courses (Manage) | ✓ | ✓ | ✗ | ✓ | ✗ |
| Course Library (Read) | ✓ | ✓ | ✓ | ✓ | ✓ |
| User Management | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Tools** | ✓ | ✓ | ✓ | ✓ | ✓ |

## Open Questions for User

1. **Q1**: Storage strategy for Student users (A/B/C above)
2. **Q2**: Definition of "Permission Management" exclusion for Admin
3. **Q3**: Exact routes for "Flipbook", "Course", and "Tools" for Students
4. **Q4**: Student UI complexity (simplified portal vs. same layout with filtered nav)
5. **Q5**: Password change-on-first-login requirement
6. **Q6**: Confirm the user management permission matrix
7. **Q7**: Migration strategy (additive ALTER vs. drop-and-recreate)
