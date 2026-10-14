# School Organization & Access Control — Implementation Plan

**Feature:** Multi-school organization hierarchy with backend-enforced access control
**Date:** 2026-10-13
**Approach:** Option B — new `organization` feature + targeted school-scoping hooks (per user's confirmed specification)

> **IMPLEMENTATION STATUS (2026-10-14): BACKEND COMPLETE.**
> All backend phases of this plan are implemented and verified:
> 5 new tables + scope columns + `manage_organization` permission + default school seeded;
> organization feature (`server/features/organization/`) with repository/service/validation/
> controller/routes/index; `schoolScope` middleware (fresh per-request DB read);
> `bookAccess` + `attendanceAccess` shared services; users/student consolidation
> (`/api/users/students/*`, faculty moved to `/api/faculty`, student backend files deleted);
> scope enforced on books (list/detail/search/copies/delete), lexora (list/detail/reader/
> pages/bookmarks/progress/media middleware), transactions (borrow assert, borrower lookup,
> loans list), attendance (all reads + kiosk fail-closed + analytics), courses, tools,
> faculty management, audit logs, trash, and both analytics dashboards.
> Verified: server boots clean, 80/80 unit tests pass, 42/42 endpoint sweep passes,
> cross-school isolation confirmed end-to-end (book detail/copies/search/borrower lookup
> all correctly isolated; faculty lookup unscoped as specified).
> Schema drift repairs included: attendance gained `attendance_date`/`attendance_day_of_week`/
> `duration_minutes` (+ backfill); users gained `student_school_year`.
>
> **FRONTEND COMPLETE (2026-10-14):**
> - `client/src/features/organization/` — Schools / Departments / Categories pages,
>   modals, tables, `AssignedBooksPanel` picker, `SchoolSelect`/`DepartmentSelect`/
>   `BookCategoryAssignment` shared controls, api/hooks/validation/index (public API).
> - Nav ORGANIZATION section + `PermissionRoute` (manage_organization) routes in App.jsx.
> - Users page: Student section + student role removed from creation; school/department
>   selectors; School/Department columns + Unassigned badges; `exclude_role=student`
>   default list with a super_admin "include students" toggle.
> - Students page: `studentsApi` is now a thin `role='student'` wrapper over the users
>   feature's public API (`/api/users/students/*`); form + import carry school/department;
>   import renders the per-row report (imported / failed + reason). Old
>   `services/api/studentsApi.js` deleted.
> - Faculty page: rewired to the new `/api/faculty` API module; per-row import report.
> - Attendance/RFID: student-user search via the students feature's public API; the
>   check-in panel's debounced lookup is wired to the ID field again (was disconnected).
> - Books: `BookCategoryAssignment` control in BookForm (immediate save on edit, pending
>   ids saved on create); School/Category badges on BookTable and LexoraBookAdminTable
>   (server sends `org_*` assignment summary columns).
> - Student Portal moved to `features/portal/` (route + StudentRoute gate unchanged);
>   `MustChangePasswordPrompt` in the dashboard layout drives the first-login password
>   change (self-service `PATCH /api/auth/profile` clears the server flag).
> - Organization Overview page added at `/dashboard/organization` (the section landing):
>   the full School → Department → Category tree from `GET /api/organization/hierarchy`
>   with search, expand/collapse and deep links into the management pages
>   (`?school_id=`, `?department_id=`, `?category_id=` preselects). Inline creation
>   (LMS-SOP pattern): `+` on a school creates a department (code auto-generated from the
>   name via `generateDepartmentCode`, server duplicate error surfaces in the row), `+` on a
>   department creates a category, both with a "More options" hand-off to the existing
>   modals; expanding a category embeds the shared `AssignedBooksPanel`. No new backend surface.
> - Bulk book assignment (no per-book toggling): `POST /api/organization/categories/:id/books`
>   assigns by filter ("all Fiction books") or explicit ids, physical or digital, with
>   `dry_run` previews (matched / already-assigned), server-side exclusions, an idempotent
>   `INSERT IGNORE` and a 10k safety cap. Filter predicates are extracted to
>   `server/shared/bookFilterSql.js` — the single source of truth shared by the catalog list
>   endpoints (Book.filter/search, LexoraBook.getAll) and the bulk path (verified identical
>   results live). Fixed along the way: `Book.filter` emitted broken SQL for unscoped callers
>   (empty scope fragment pushed into WHERE); the bulk INSERT bound parameters in the wrong
>   order (filter values landed in `category_id`, and `INSERT IGNORE` silently skipped every
>   row — `assigned: 0` with `matched: N`); the bulk panel's search channel queried both
>   endpoints and filled both result arrays, so searching e-books showed physical matches in
>   the Physical panel (now type-scoped with per-type request guards). All three were caught
>   by live sweeps that exercise the real-run paths, not just dry runs.
> Backend additions made for wiring (additive, no behavior change): `GET
> /api/organization/books|lexora-books/:id/categories`, `exclude_role` on the users list,
> school/department name joins on user reads, `org_*` assignment summary columns on book
> lists. Verified: 82/82 server tests, 123/123 client tests, vite build clean, live
> endpoint sweep (org CRUD + assignment round trips + badges + student default
> credentials + per-row import report) all green.
> **NEXT: data migration (see §7).**
> Remaining manual steps (not code): student→users data migration (plan §7.1 script),
> assigning existing users/students/books, retiring the `students` table.

> **Update (2026-10-13):** Attendance is now also scope-based. Attendance records link to students via `student_id_number`, so scoping attendance is achieved by assigning students a school/department and scoping every attendance query, statistic, and kiosk check-in through that link — **no attendance-table backfill is required**; historical records scope automatically once a student is assigned.

> **Update (2026-10-13, consolidation):** Student records live **only** in `users` with `role = 'student'` — the `students` table and its backend module are removed. The **Students page stays** as a dedicated, task-oriented management UI (roster, filters, bulk import) that creates/edits student **users** through `features/users`' public API. Attendance check-in, kiosk, RFID registration, and borrower lookup all operate on `users WHERE role = 'student'`. The Student Portal already reads users. Existing student records are migrated 1:1 preserving `student_id_number`, so attendance history and RFID mappings remain valid.

---

## 1. Goal & Confirmed Decisions

Implement `School → Department → Category → Assigned Books` where:

- **super_admin** manages all schools, assigns administrators, accesses all data.
- **admin** manages only their assigned school (departments, categories, users, books).
- **librarian / staff** access books and attendance across departments **within their own school** when granted (department assignment NULL = school-wide; set = department-scoped).
- **student** (a `users` row with `role = 'student'`) gets no management UI; book access follows their assigned school/department + existing role permissions.
- **Physical books (`books`) and digital books (`lexora_books`) follow the same access rules.**
- **Attendance (records + kiosk check-in + dashboard statistics) is scoped through the student user's assigned school/department.**
- **All restrictions enforced server-side.** React only mirrors what the server allows.

### Scoped data surfaces

| Surface | Scoped via | Notes |
|---|---|---|
| Schools / Departments / Categories | Direct ownership | Org tree itself |
| Users (incl. students) | `users.school_id` / `department_id` | Students = `users` rows with `role='student'`; the `students` table is removed |
| Attendance (records, stats, kiosk) | `users` link (JOIN on `student_id_number` + role) | No attendance backfill — history follows the student user's assignment |
| Physical books | `book_category_assignments` → category → department → school | Detail, list, borrow |
| Digital books | `lexora_book_assignments` → category → department → school | Reader, flipbook, PDFs, media files |
| Attendance KPIs on main dashboard | Same users-link scope | `analyticsService` attendance aggregation |
| Borrower lookup (students only) | `users` link (role='student') + school scope | Faculty borrowers are exempt — any patron type may borrow |
| Loans list (transactions) | Borrowed book's scope (`book_category_assignments` chain) | Upgraded from "unfiltered" — admin must not see another school's loans |
| Courses | `courses.school_id` | Course list/detail/enrollment + CRUD scoped |
| Tools | `tools.school_id` | Tool list/download + CRUD scoped |
| Faculty (management) | `faculty.school_id` / `department_id` | Faculty page CRUD scoped; faculty **borrower lookup stays unscoped** (patron rule) |
| Analytics dashboards (both) | Book scope + attendance scope + loan scope | KPI cards, charts, most-borrowed, holdings, fines, overdue, arrivals, low stock |
| Audit logs | Acting user's school (`audit_logs.user_id` → `users.school_id`) | NULL user (system action) = legacy fallback, visible |
| Trash | Deleter's school snapshotted on `trash_log.school_id` | NULL = legacy fallback; restore/permanent-delete scoped |

**Not scoped this phase:** portal settings, site settings, courses' *enrollment* records themselves (scoped through their course), and WebSocket broadcasts (scoped payloads are a frontend concern; the API remains the authority). The same `resolveSchoolScope` pattern extends to anything else later.

### Adopted design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Hierarchy depth | Flat: School → Department → Category | Exactly the specified 3 levels; `parent_department_id` can be added later if nesting is ever needed |
| Book ↔ Category | Many-to-many assignment tables | One book may serve several departments/categories; never duplicate book rows |
| Categories | One new org `categories` table used by **both** book types via separate assignment tables | Existing `lexora_book_categories` stays untouched (it is Lexora's content-tagging taxonomy, not an org concept) — no records duplicated, no Lexora admin UI broken |
| Legacy books (no assignment) | Visible per current role permissions (fail-open) until assigned; `ORG_STRICT_BOOKS` flag flips to fail-closed after migration | Prevents the whole catalog from vanishing on deploy; satisfies acceptance item 9 (existing features keep working) |
| Legacy users (no school) | `school_id NULL` = unscoped (current behavior) until an admin assigns them | Per instruction: *do not guess users' schools*; unassigned users are surfaced with badges + a cleanup task |
| Legacy students (no school) | `school_id NULL` = unscoped; their attendance stays visible to unscoped callers until assigned | No attendance backfill needed — scope follows the student link automatically |
| Faculty departments | Existing `faculty.department` enum values are **migrated into** the new `departments` table; a nullable `faculty.department_id` compatibility column is backfilled by name match | Replaces the hardcoded enum with real records without breaking the Faculty UI |
| Enforcement freshness | School scope resolved **fresh from DB per request** on scoped routes (not read from session) | An admin reassigning a user's school takes effect immediately; no stale-session bypass |
| Student records | **`students` table removed; students are `users` rows with `role='student'`** | One identity store for login, portal, attendance, RFID, and borrowing. `student_id_number` gains a UNIQUE key (attendance/RFID integrity). The Students page is the **only** student creation surface (the Users page's Student Information section is deleted); student records are never duplicated |
| Student default credentials | **Username = `student_id_number`, Password = `student_id_number`**, set server-side at creation (single rule in `users.service`) | Students log in with their ID and change it self-service via the existing profile password flow; `must_change_password` flag prompts the change on first login |
| Attendance scope | Derived from the student **user** link (`attendance.student_id_number` → `users.student_id_number` + role filter) | No attendance backfill; existing history scopes the moment a student user is assigned a school |

---

## 2. Architecture Impact

- **New backend feature:** `server/features/organization/` (repository → service → controller → routes → validation → `index.js` public API). Owns all org SQL, school-scope resolution, and the shared **access services** (books + students/attendance).
- **New frontend feature:** `client/src/features/organization/` (pages: Schools / Departments / Categories; components, hooks, api, `index.js`).
- **Modified, not rewritten:** `features/users` (school/department assignment + student fields + scoped listing), `routes/books.js` + `models/Book.js` (scope filters), `routes/lexoraBooksRoutes.js` + `models/LexoraBook.js` + `middleware/lexoraMediaAccess.js` (scope filters), `routes/transactions.js` + `models/Transaction.js` (borrow-time check + borrower lookup on users + loans-list scope), `routes/attendance.js` + `models/Attendance.js` + `models/RfidCard.js` (student-user lookups, attendance scope + kiosk check-in validation), `services/analyticsService.js` (scoped KPIs incl. both dashboards), `routes/courses.js` + `models/Course.js`, `routes/tools.js` + `models/Tool.js`, `routes/students.js` faculty routes + `models/Student.js` faculty methods, `models/AuditLog.js` + `routes/audit.js`, `models/Trash.js` + `routes/trash.js`, `features/roles/permissionCatalog.js` (new permission), `config/db.js` (DDL + migrations + seed batch), `client` nav + Users form + Book/Lexora forms + attendance/portal rewiring.
- **Removed:** `models/Student.js`, `routes/students.js`, `studentsController.js`, `students` table (retired post-migration).
- **Repurposed (not removed):** `features/students` management page — kept as a `role='student'`-scoped view over `features/users` (see 5.6/6.5). Two task-oriented UIs, one data store.
- **Layer flow preserved:** Page → Component → Hook → API module → Route → Controller → Service → Repository → MySQL. No SQL in controllers; no HTTP in services; cross-feature imports only through each feature's `index.js`.
- **Shared access services** (`bookAccess.service.js`, `attendanceAccess.service.js`) live in the organization feature (they encode org rules); books/lexora/transactions/attendance/students/analytics import them via `features/organization/index.js`. No circular dependency: organization imports nothing from those features.

### Enforcement model (single source of truth)

```
server/features/organization/
├── organization.routes.js        # /api/organization/* (schools, departments, categories, assignments)
├── organization.controller.js    # thin: parse → service → respond
├── organization.service.js       # business rules: validates dept∈school, category∈dept, user scope
├── organization.repository.js    # ALL SQL for org tables + scope-SQL builders
├── organization.validation.js    # input validation (name/code/description)
├── schoolScope.js                # resolveSchoolScope middleware + scope predicates
├── bookAccess.service.js         # shared physical/digital book access rules (SQL + row checks)
├── attendanceAccess.service.js   # shared student/attendance scope rules (SQL + row checks)
└── index.js                      # public API used by other features
```

---

## 3. Database Changes

### 3.1 New tables (created idempotently in `config/db.js` boot, same pattern as existing tables)

```sql
CREATE TABLE IF NOT EXISTS schools (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(50)  NOT NULL,                 -- unique school code
  name        VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  is_default  TINYINT(1)   NOT NULL DEFAULT 0,       -- the single seeded legacy school
  created_by  INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_schools_code (code),
  UNIQUE KEY uq_schools_name (name),
  CONSTRAINT fk_school_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  school_id   INT NOT NULL,                          -- MUST belong to a school
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(50)  NOT NULL,
  description TEXT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_by  INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_departments_school_name (school_id, name),
  UNIQUE KEY uq_departments_school_code (school_id, code),
  INDEX idx_departments_school (school_id),
  CONSTRAINT fk_department_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  department_id  INT NOT NULL,                       -- MUST belong to a department (hence a school)
  name           VARCHAR(255) NOT NULL,
  description    TEXT NULL,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  created_by     INT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     DATETIME NULL,                      -- soft delete
  UNIQUE KEY uq_categories_department_name (department_id, name),
  INDEX idx_categories_department (department_id),
  CONSTRAINT fk_category_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_category_created_by  FOREIGN KEY (created_by)    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Book ↔ Category assignments (many-to-many; no book duplication)
CREATE TABLE IF NOT EXISTS book_category_assignments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  book_id     INT NOT NULL,
  category_id INT NOT NULL,
  assigned_by INT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_book_category (book_id, category_id),
  INDEX idx_bca_category (category_id),
  CONSTRAINT fk_bca_book     FOREIGN KEY (book_id)     REFERENCES books(id)     ON DELETE CASCADE,
  CONSTRAINT fk_bca_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lexora_book_assignments (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  lexora_book_id   INT NOT NULL,
  category_id      INT NOT NULL,
  assigned_by      INT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lexora_category (lexora_book_id, category_id),
  INDEX idx_lba_category (category_id),
  CONSTRAINT fk_lba_book     FOREIGN KEY (lexora_book_id) REFERENCES lexora_books(id) ON DELETE CASCADE,
  CONSTRAINT fk_lba_category FOREIGN KEY (category_id)   REFERENCES categories(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Notes:
- `categories` name uniqueness is enforced at the DB level per department; the service maps `ER_DUP_ENTRY` to a friendly message (same pattern as LMS-SOP's categoryModel) and the soft-delete uniqueness caveat is handled by the service (re-creating a soft-deleted name reports a clear conflict).
- `lexora_book_categories` / `lexora_book_category_relations` are **left untouched** (content tagging for the Lexora admin UI). The new assignment tables are the access-control layer for digital books.

### 3.2 Altered tables (added to `migrateSchema()` in `config/db.js` — error-tolerant array already handles 1060/1061)

```sql
ALTER TABLE users ADD COLUMN school_id     INT NULL;
ALTER TABLE users ADD COLUMN department_id INT NULL;
ALTER TABLE users ADD INDEX idx_users_school (school_id);
ALTER TABLE users ADD INDEX idx_users_department (department_id);
ALTER TABLE users ADD CONSTRAINT fk_user_school     FOREIGN KEY (school_id)     REFERENCES schools(id)     ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
-- Student fields on users (the `students` table is retired; all student fields now live on users)
ALTER TABLE users ADD COLUMN student_course    VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN student_yr_level  VARCHAR(20)  NULL;
ALTER TABLE users ADD COLUMN student_email     VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN student_contact   VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN senior_high_school VARCHAR(255) NULL;   -- migrated from students (field fidelity)
ALTER TABLE users ADD COLUMN strand            VARCHAR(100) NULL;      -- migrated from students (field fidelity)
ALTER TABLE users ADD COLUMN school_address    VARCHAR(255) NULL;      -- migrated from students (field fidelity)
ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0;  -- set for default-credential students
ALTER TABLE users ADD UNIQUE KEY uk_users_student_id_number (student_id_number);
-- School scoping for the remaining features
ALTER TABLE courses ADD COLUMN school_id INT NULL;
ALTER TABLE courses ADD INDEX idx_courses_school (school_id);
ALTER TABLE courses ADD CONSTRAINT fk_course_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
ALTER TABLE tools ADD COLUMN school_id INT NULL;
ALTER TABLE tools ADD INDEX idx_tools_school (school_id);
ALTER TABLE tools ADD CONSTRAINT fk_tool_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
-- Faculty management scope (department_id bridge migrated from the text enum)
ALTER TABLE faculty ADD COLUMN school_id     INT NULL;
ALTER TABLE faculty ADD INDEX idx_faculty_school (school_id);
ALTER TABLE faculty ADD CONSTRAINT fk_faculty_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;
-- Trash scope snapshot (school of the user who deleted the record)
ALTER TABLE trash_log ADD COLUMN school_id INT NULL;
ALTER TABLE trash_log ADD INDEX idx_trash_school (school_id);
-- (audit_logs needs no new column — scope resolves through user_id → users.school_id)
-- Faculty compatibility bridge (nullable; old text column retained, zero behavior change)
ALTER TABLE faculty ADD COLUMN department_id INT NULL;
ALTER TABLE faculty ADD INDEX idx_faculty_department (department_id);
ALTER TABLE faculty ADD CONSTRAINT fk_faculty_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
```

`school_id = NULL` means: super_admin (all schools) or a legacy user not yet assigned. `department_id = NULL` for non-super_admin means "all departments within my school" (the granted school-wide case).

**The `attendance` table itself needs no new columns** — its scope is derived from the linked student **user**, so existing history is covered the moment a student user is assigned. `student_id_number` must be unique on `users` before the key is added (migration step 3 verifies no duplicates; multiple NULLs are allowed by MySQL, so non-student users are unaffected).

---

## 4. Access Control Model

### Role matrix

| Capability | super_admin | admin | librarian | staff | student |
|---|---|---|---|---|---|
| Create/edit/delete schools | ✅ (only role) | ❌ | ❌ | ❌ | ❌ |
| View schools | all | own school only | own school only | own school | own school |
| Manage departments / categories | all schools | **own school only** | ❌ (no UI) | ❌ | ❌ |
| Create/edit users | any role, any school | librarian/staff/student **in own school** | ❌ | ❌ | ❌ |
| Manage students | all (as `role='student'` users) | own school's student users | ❌ | ❌ | ❌ |
| Assign school to a user | ✅ (only role) | ❌ (fixed to own school) | ❌ | ❌ | ❌ |
| Manage books (assign to categories) | all | own school | own school | ❌ | ❌ |
| View/borrow physical books | all | own school scope | own school scope (school-wide unless dept-scoped) | own school scope | own school scope |
| Read digital books / flipbook / PDFs | all | own school scope | own school scope | own school scope | own school scope |
| View attendance records / stats / dashboard KPIs | all | own school scope | own school scope | own school scope | ❌ (no UI) |
| Kiosk check-in/out (tap) | all student users | own school's student users | own school's student users | own school's student users | ❌ |

### Book visibility predicate (the core rule — identical for physical and digital)

For an authenticated user `u` on any scoped book query:

```
Book is visible to u  IF
  u.role = super_admin                                  → ALL books
  u.school_id IS NULL (legacy, unassigned)              → ALL books (legacy fallback)
  otherwise:
    ( book has NO category assignments )                → visible  (legacy fallback; OR_STRICT mode flips this to hidden)
    OR ( assignment → category → department → school_id = u.school_id
         AND ( u.department_id IS NULL OR category.department_id = u.department_id ) )
```

- Cross-school access is **impossible** regardless of fallback mode: fallback only widens to "unassigned books", never to another school's assigned books.
- After migration completes, `ORG_STRICT_BOOKS=true` (settings/env) makes unassigned books invisible to scoped users, completing the lock-down.
- Row-level asserts use the same predicate (`assertBookAccessible(bookId)` / `assertLexoraBookAccessible(bookId)`) — used by detail, borrow, reader, pages, bookmarks, progress, and media endpoints.

### Student / attendance visibility predicate (applies to every attendance query, statistic, and dashboard KPI)

For an authenticated caller `u`, an attendance record for student user `st` is visible when:

```
u.role = super_admin                            → ALL records
u.school_id IS NULL (legacy, unassigned caller) → ALL records (legacy fallback)
otherwise:
  st.school_id IS NULL                          → visible  (student user not yet assigned — legacy fallback)
  OR ( st.school_id = u.school_id
       AND ( u.department_id IS NULL OR st.department_id = u.department_id ) )
```

- Implemented as a scope fragment on the users link: `LEFT JOIN users st ON st.student_id_number = a.student_id_number AND st.role = 'student'` + WHERE predicate, produced by `attendanceAccess.studentScopeSql(scope)`.
- **Kiosk check-in is the one fail-closed case:** a scoped operator may only tap student users whose `school_id` matches the operator's school (or is NULL-legacy); tapping a student assigned to another school returns 403 before any record is written or mutated.
- Existing attendance history needs **no migration** — scope resolves through the current `users` row, so assigning a student user to a school instantly scopes their entire past and future attendance consistently.

### Validation invariants (enforced in `organization.service.js` on **every** operation)

1. A department's `school_id` must reference an existing active school.
2. A category's `department_id` must reference a department **in the caller's authorized school**.
3. A user's `department_id` must belong to that user's `school_id`.
4. A book assignment's category must belong to the caller's authorized school (and, for dept-scoped callers, to an allowed department).
5. Admin callers can only read/mutate rows of their own school; attempts against other IDs fail with 403/404 — never leaked.

---

## 5. Backend Implementation Plan

### 5.1 New feature — `server/features/organization/`

| File | Responsibility |
|---|---|
| `organization.repository.js` | All SQL: school/department/category CRUD, assignment CRUD, hierarchy reads (`getHierarchy`), scope-SQL fragment builders, `listEntities` for pickers |
| `organization.service.js` | Business rules + invariants (section 4), school CRUD restricted to super_admin, department/category management scoped to caller's school, book assignment management, friendly `ER_DUP_ENTRY` mapping |
| `organization.controller.js` | Thin HTTP in/out; no SQL, no rules |
| `organization.routes.js` | `/api/organization/schools`, `/departments`, `/categories`, `/categories/:id/books`, `/books/:id/categories`, `/hierarchy`; each route guarded by `resolvePermissions` + `requirePermissionAction("manage_organization", …)`; school-write routes additionally guarded by a super_admin-only service check |
| `organization.validation.js` | Names/codes/description length + format rules (reuse `server/utils/validation.js` patterns) |
| `schoolScope.js` | `resolveSchoolScope` middleware: fresh DB read of caller's `role/school_id/department_id` → `req.schoolScope`; `isScoped(req)` helper |
| `bookAccess.service.js` | `physicalBookScopeSql(scope)` / `lexoraBookScopeSql(scope)` (WHERE fragments + params), `assertPhysicalBookAccessible`, `assertLexoraBookAccessible`, `setPhysicalBookCategories`, `setLexoraBookCategories` |
| `index.js` | Public API: `router`, `resolveSchoolScope`, `bookAccess`, scope validators |

Route table (sketch):

```
GET    /api/organization/hierarchy                     manage_organization:view
GET    /api/organization/schools                       manage_organization:view     (super_admin: all; others: own)
POST   /api/organization/schools                       super_admin only
PUT    /api/organization/schools/:id                   super_admin only
DELETE /api/organization/schools/:id                   super_admin only (blocked when departments/users exist)
GET    /api/organization/departments                   manage_organization:view     (school-scoped)
POST   /api/organization/departments                   manage_organization:create
PUT    /api/organization/departments/:id               manage_organization:edit
DELETE /api/organization/departments/:id               manage_organization:delete   (blocked when categories/users reference)
GET    /api/organization/categories                    manage_organization:view     (school-scoped, optional ?department_id)
POST   /api/organization/categories                    manage_organization:create
PUT    /api/organization/categories/:id                manage_organization:edit
DELETE /api/organization/categories/:id                manage_organization:delete   (soft delete)
GET    /api/organization/categories/:id/books          manage_organization:view
PUT    /api/organization/books/:bookId/categories      manage_organization:edit     (physical)
PUT    /api/organization/lexora-books/:bookId/categories  manage_organization:edit  (digital)
```

### 5.2 New permission (roles feature)

- `permissionCatalog.js`: add `manage_organization` (category `organization`, actions `view/create/edit/delete`) granted to `super_admin` + `admin` (NOT librarian/staff — they consume scope, they don't manage the org tree).
- `db.js` `seedPermissions`: new batch `v2_organization` inserts the permission row and the admin grant (batch-guarded, like `v1_roles`).
- Frontend `ENTITY`-style nav + Roles UI automatically pick it up from the catalog.

### 5.3 Users feature changes (`server/features/users/`)

- `users.repository.js`: add `school_id`, `department_id` to `SAFE_COLUMNS`; persist in `create()`; add `listUsers` school filter (`school_id = ?` for admin callers); `getStats` school-scoped for admins.
- `users.service.js`:
  - `createUser`: validate school exists/active (super_admin may set any; admin's payload school forced to their own); validate department belongs to school; require school for `admin` role (NULL allowed for other roles during migration with a warning surfaced to UI); reject assigning `admin`/`super_admin` roles for non-super_admin (existing `canManageTarget` retained).
  - `updateUser`: admin may only edit users whose `school_id` = own (403 otherwise); only super_admin may change `school_id`; department must belong to the user's school.
  - `changeUserRole`: unchanged rules + school check.
- `users.routes.js`: mount `resolveSchoolScope` after `requireAuth` so listing is scoped server-side.
- `authController.js`: include `school_id` + `department_id` in the login/me/profile-refresh payloads (display + client-side mirroring only; server re-resolves scope per request).

### 5.4 Books enforcement (physical)

- `models/Book.js`: `getAll`, `search`, `filter`, `getById` accept an optional `scope` argument and append the book-access WHERE fragment (`bookAccess.service.physicalBookScopeSql`); default behavior unchanged when no scope passed (public/internal callers unaffected).
- `routes/books.js` + `booksController.js`: mount `resolveSchoolScope`; pass `req.schoolScope` into the model calls on `GET /`, `GET /:id`, `GET /:id/copies`. `POST/PUT/DELETE` remain permission-guarded; for admins, `organization.service` validates that any category assignment on write belongs to their school (validated in the assignment endpoint, not the book form itself).
- `routes/transactions.js` / `transactionsController.js`: before `TransactionModel.create`, call `assertPhysicalBookAccessible(req, book_id)` → 403 when out of scope. Same filter applied to `TransactionModel.searchBooksForBorrow` (borrow picker) via scope param.
- `searchController.js` (authenticated `/api/search`): apply the same fragment to both book queries. **`/api/books/public-search` and the public Lexora routes remain public** (existing product behavior; anonymous users have no scope).

### 5.5 Books enforcement (digital)

- `routes/lexoraBooksRoutes.js`: mount `resolveSchoolScope` (below the public routes); `getLexoraBooks` and `GET /:id` pass scope to `LexoraBookModel.getAll/getById`; `/:id/reader`, `/:id/pages`, `/:id/bookmarks*`, `/:id/progress*` call `assertLexoraBookAccessible` **after** the existing public/manager/owner checks (defense in depth — the org check is additive).
- `middleware/lexoraMediaAccess.js`: after the existing isPublic/isManager/isOwner verification, call `assertLexoraBookAccessible(bookId, user)` (404 on failure, preserving the current "no existence leak" behavior); include the user's scope in the 10s access-cache key so a permission change takes effect within the TTL.
- `models/LexoraBook.js`: `getAll`/`getById` accept optional scope (same pattern as Book model). `getPublic` untouched.

### 5.6 Book-access service (shared)

```js
// server/features/organization/bookAccess.service.js  (sketch)
function physicalBookScopeSql(scope)   // WHERE fragment for `books b` (+ assignments join)
function lexoraBookScopeSql(scope)     // WHERE fragment for `lexora_books lb`
async function assertPhysicalBookAccessible(scope, bookId)     // 1 indexed query
async function assertLexoraBookAccessible(scope, bookId)       // 1 indexed query
function isScoped(scope)               // false for super_admin / legacy NULL users
```

SQL fragment (physical, alias `b`):

```sql
AND (
  NOT EXISTS (SELECT 1 FROM book_category_assignments a WHERE a.book_id = b.id)
  OR EXISTS (
    SELECT 1
    FROM book_category_assignments a
    JOIN categories c    ON c.id = a.category_id
    JOIN departments d   ON d.id = c.department_id
    WHERE a.book_id = b.id
      AND d.school_id = ?
      AND (? IS NULL OR c.department_id = ?)   -- school-wide vs department-scoped
  )
)
```

Params: `[schoolId, departmentId, departmentId]` — omitted entirely when `isScoped(scope)` is false.

---

### 5.6 Student records consolidation — students become `users` with `role='student'`

**Decision: the Students page stays** as the **only** student creation surface (roster, filters, bulk import), backed entirely by `users`. The Users page's Student Information section is **deleted** — the Users page manages staff/admin/librarian accounts exclusively. Student records are never duplicated.

**Removals (backend only):**
- `server/models/Student.js` — deleted (all consumers repointed to `users`).
- `server/routes/students.js` + `studentsController.js` — deleted; student CRUD is the `users` feature endpoints with `role='student'`.
- `students` table — retired after migration (kept read-only for one release as rollback, then dropped; see section 7).

**Rewiring (server):**
| File | Change |
|---|---|
| `models/Attendance.js` | All `FROM students` lookups → `FROM users WHERE student_id_number = ? AND role = 'student' AND is_active = 1`; joins → `users st ON st.student_id_number = a.student_id_number AND st.role = 'student'` |
| `models/RfidCard.js` | All 4 student lookups → `users` (role='student') |
| `models/Transaction.js` | `lookupStudent` (lines ~120, 130) → `users` (role='student') **+ school-scope filter** (see 5.9); `searchFaculty` intentionally unscoped; `borrower_type` semantics unchanged |
| `features/users/users.repository.js` | Persist `student_course`, `student_yr_level`, `student_email`, `student_contact`, `senior_high_school`, `strand`, `school_address`, `must_change_password` (add to SAFE_COLUMNS + create/update); validate unique `student_id_number` when role='student' |
| `features/users/users.service.js` | **Default credentials rule (server-side, single source of truth):** when `role='student'` and no password supplied → `username = password = student_id_number`, `must_change_password = 1`. Require `student_id_number` when role='student'; require school for `admin` (NULL tolerated for other roles during migration); admin can only manage own-school users |
| `features/users/users.routes.js` | **New bulk-import endpoint** `POST /api/users/bulk-import` (role='student' rows; validates unique student IDs, school assignment, duplicates-in-file) — the Excel/CSV parsing stays client-side (`studentExcel.js`), only the endpoint and validation are new |
| `controllers/authController.js` | Login response includes `must_change_password`; self-service password change (`PATCH /api/auth/profile`) clears the flag |

**Client rewiring:**
- `features/users/UserForm.jsx`: **delete the Student Information section**; the role selector for creation excludes `student` (staff/admin/librarian only). Student fields move to the Students page form. Remove the now-dead student validation in `features/users/validation/`.
- `features/students/api/studentsApi.js` — **rewritten as a thin wrapper** over `features/users`' public API (`import { fetchUsers, createUser, updateUser, bulkImportUsers } from "../../users"` via `features/users/index.js` — no deep imports), pinning `role: 'student'`. No password is sent from the client — the server applies the default-credential rule.
- `features/students/components/StudentFormModal.jsx` — fields: name → `full_name`, ID → `student_id_number`, course/yr-level/email/contact/senior-high/strand/address → the new user columns; **School selector** (super_admin: any school; admin: fixed to own school, disabled) + **dependent Department selector** (options from the selected school via the organization feature's public API). Posts via the students API wrapper with `role: 'student'`.
- `features/attendance`: `useStudentLookup` → student-users search via the students API wrapper; `RfidStudentSearch` → same.
- Student portal: no data-source change (already `usersApi`); verify course/yr-level render from the new columns once persisted; first login with default credentials prompts a password change (banner driven by `must_change_password`).

### 5.7 Attendance scoping

`models/Attendance.js` — every read/aggregate accepts an optional `scope` and applies the student-user predicate via `attendanceAccess.studentScopeSql(scope)`:

| Function | Change |
|---|---|
| `getAll`, `getActiveAttendance` | Repoint the existing `students` LEFT JOIN to `users` (role='student') + scope predicate |
| `getById`, `getByStudentId`, `delete` | Row-level scope check first (404/403 when out of scope) |
| `getTopStudents`, `getAllTopStudents`, `getProgramUsage`, `getVisitsOverTime`, `getPeakHours`, `getVisitsByDay`, `getSessionDistribution`, `getOtherInsights`, `getDashboardStats`, `getStats`, `getSchoolYears` | Repoint the `students` join + add the scope predicate inside the shared `buildAttendanceFilter` path (single funnel point) |
| `getLowUsageStudents`, `getAllLowUsageStudents` | These already query the all-students side — repoint to `users WHERE role='student'` + scope predicate |

`routes/attendance.js` + `attendanceController.js`: mount `resolveSchoolScope`; pass `req.schoolScope` to every model call (mechanical, one parameter).

**Kiosk check-in (`tap` / `checkIn` / `checkOut`):**
- `AttendanceModel.tap(studentIdNumber, scope)`: the student-user lookup adds `role = 'student' AND is_active = 1`; then the kiosk fail-closed rule (section 4) — reject with a clear error ("Student belongs to another school") before insert/update.
- Same for `checkIn`; `checkOut`/`getActiveAttendance` operate on records already validated at check-in but are additionally scope-checked for listing/management actions.
- `rfidController` (tap route) passes the operator's `req.schoolScope` through unchanged.

### 5.8 Main dashboard attendance KPIs (`services/analyticsService.js`)

The dashboard's attendance aggregation queries (visits by ISO week / by month) add the same users-link join + scope predicate, so the admin dashboard shows only the caller's school numbers. `analyticsController` passes the scope from the request.

### 5.9 Borrower access scoping (confirmed rule)

**Rule: a scoped operator (admin/librarian/staff) can find and borrow for a student patron only within their own school, but faculty patrons remain accessible from any school.**

| Patron type | Lookup / borrow | History access |
|---|---|---|
| Student (`users` role='student') | School-scoped: in-scope student found (e.g. Juan); out-of-school student not found (e.g. Maria) — no existence leak | Same scope filter on the borrower's loan history |
| Faculty (`faculty` table) | **Unscoped** — faculty may borrow at any school | Unscoped |

- `TransactionModel.lookupStudent(studentIdNumber, scope)`: lookup via `users` (role='student') + `attendanceAccess.studentScopeSql(scope)`; out-of-scope → "Student ID not found" (identical to unknown ID, so no existence leak).
- `TransactionModel.searchFaculty` — unchanged (no school filter).
- Borrower *history* queries (`getByBorrower`-style reads over `borrowed_books`): student borrower → filter via the borrower's user school; faculty → unfiltered.
- The **loans list** (`GET /api/transactions`, active/overdue views) is scoped through the borrowed book's scope (see 5.10) — an admin never sees another school's loans.
- `routes/transactions.js` mounts `resolveSchoolScope`; the controller passes the scope into lookup/history model calls.

### 5.10 Remaining feature scoping (loans, courses, tools, faculty, audit, trash, analytics)

All of these reuse `resolveSchoolScope` + a small predicate per surface. **Simple-table predicate** (courses, tools, faculty — rows carry their own `school_id`):

```
Visible to caller u  IF
  u.role = super_admin                 → all
  u.school_id IS NULL (legacy caller)  → all (legacy fallback)
  otherwise:  (row.school_id IS NULL)  → visible (legacy row fallback)
             OR (row.school_id = u.school_id AND (u.department_id IS NULL OR row.department_id IS NULL OR row.department_id = u.department_id))
```

- **Courses** (`routes/courses.js`, `courseController.js`, `models/Course.js`): list/detail/mutations scoped by `courses.school_id`. Enrollment endpoints (`course_enrollments`) scope through the enrolled course. A scoped user editing a legacy (`school_id IS NULL`) course **stamps their school on save** ("first touch assigns") — prevents dead content and drives migration without a lockout.
- **Tools** (`routes/tools.js`, `toolController.js`, `models/Tool.js`): same predicate; download-count increments are allowed only for in-scope tools.
- **Faculty — management vs. patron split** (`routes/students.js` faculty routes, `Student.js` faculty methods): the Faculty page CRUD is scoped by `faculty.school_id` (+ `department_id` where set); the **faculty borrower lookup stays unscoped** (5.9 patron rule). Same first-touch-assigns stamp for legacy faculty rows.
- **Loans list** (`models/Transaction.js` `getAll`/`getActiveBorrows`/`getOverdueBorrows`/`getStats`): scope through the borrowed book — the loan is visible when its book satisfies the physical-book visibility predicate (section 5.5). Legacy/unassigned books' loans remain visible (fallback).
- **Audit logs** (`models/AuditLog.js`, `routes/audit.js`): scope by the **acting user's** school — `LEFT JOIN users u ON u.user_id`-style predicate `u.school_id = caller OR u.school_id IS NULL` (system/NULL-user actions = legacy fallback). Super_admin sees everything. Immutability and the 1-year retention job unchanged.
- **Trash** (`models/Trash.js` `softDelete` + `routes/trash.js`): `softDelete(entityType, entityId, schoolId)` — the deleter's `school_id` is snapshotted onto `trash_log.school_id`; list/restore/permanent-delete are scoped by it (NULL = legacy fallback). The nightly purge job is unaffected (global sweep).
- **Analytics dashboards** (`services/analyticsService.js`, `features/analytics` hooks):
  - Main dashboard: book KPIs, most-borrowed, holdings breakdown, arrivals → book visibility predicate; fines/overdue charts → loan scope (via book); attendance chart → student-user scope (5.7). Nothing computed client-side beyond formatting.
  - Book dashboard: genre/status/collection/arrivals/low-stock/top-borrowed → book visibility predicate throughout.
  - Both keep their existing filter parameters; the scope is an additional server-side funnel, never a client filter.

---

## 6. Frontend Implementation Plan

### 6.1 New feature — `client/src/features/organization/`

```
features/organization/
├── index.js                      # public API (pages + hooks)
├── api/organizationApi.js        # fetchSchools/CRUD, departments, categories, assignments, hierarchy
├── hooks/useSchools.js           # list + CRUD (super_admin)
├── hooks/useDepartments.js       # school-scoped list + CRUD
├── hooks/useCategories.js        # department-scoped list + CRUD + book assignment
├── pages/SchoolsPage.jsx         # super_admin only (guard inside page → redirect if not)
├── pages/DepartmentsPage.jsx     # scoped to caller's school
├── pages/CategoriesPage.jsx      # scoped to caller's school/department filter + assigned-books panel
└── components/
    ├── SchoolFormModal.jsx / SchoolTable.jsx
    ├── DepartmentFormModal.jsx / DepartmentTable.jsx
    ├── CategoryFormModal.jsx / CategoryTable.jsx
    └── AssignedBooksPanel.jsx    # picker: books search → toggle category assignment
```

Pages compose hooks + components only (per project rules); each modal owns its state; all HTTP via the api module.

### 6.2 Navigation (`components/layout/navItems.js`)

Add an **ORGANIZATION** section (after CATALOG):

| Item | Route | Permission |
|---|---|---|
| Schools | `/dashboard/organization/schools` | `manage_organization` (+ page-level super_admin check) |
| Departments | `/dashboard/organization/departments` | `manage_organization` |
| Categories | `/dashboard/organization/categories` | `manage_organization` |

Routes added in `App.jsx` with `PermissionRoute`, mirroring existing patterns.

### 6.3 Users page (`features/users/`) — staff/admin/librarian accounts only

- `UserForm.jsx`: **Student Information section deleted**; creation role selector excludes `student` (staff/admin/librarian only — students are created on the Students page). Add **School selector** (super_admin: any active school; admin: fixed to own school, disabled) + **dependent Department selector** (options loaded from the selected school via `features/organization` public API through its `index.js` — no deep imports).
- `validation/` (users): remove the now-dead student-field rules.
- `useUsers.js`: no structural change — `addUser/editUser` already pass payloads through; include `school_id`/`department_id` from the form.
- `UserTable.jsx` / `UserCard.jsx`: display School + Department columns; badge "Unassigned" when NULL. Existing student users appear read-only behind an explicit "include students" toggle (super_admin).
- Backend scopes the list; the UI additionally hides edit affordances for out-of-school users (mirror-only).

### 6.4 Books pages (`features/books/`, `features/lexora-books/`)

- `BookForm.jsx` / `BookModal.jsx`: assignment controls — school (fixed by scope for admins), department select, category multi-select — posted to the organization API (`PUT /api/organization/books/:id/categories`). Hidden for users without `manage_organization`.
- `BookTable` / Lexora admin table: school / department / category badges.
- Books page receives the server-filtered list as-is (no client-side re-filtering as the source of truth).

### 6.5 Students page — the ONLY student creation surface (`features/students/`)

**The page, its filters, stats, table, and bulk-import wizard stay** — only the data layer changes:

- `StudentFormModal.jsx`: fields map to users columns (name → `full_name`, ID → `student_id_number`, course/yr-level/email/contact/senior-high/strand/address → new user columns). **School selector** (super_admin: any school; admin: fixed to own school, disabled) + **dependent Department selector** (options from the selected school via the organization feature's public API). Posts via the students API wrapper with `role: 'student'` — **no password sent; the server applies username = password = `student_id_number`** and sets `must_change_password`.
- `StudentsPage.jsx` / `StudentsTable.jsx` / `StudentsStatsCards.jsx`: render the server-filtered student-user list; School + Department badges; "Unassigned" badge when NULL. No client-side re-filtering as source of truth.
- `StudentImportModal.jsx` + `useStudentImport.js`: unchanged UX; import posts to the new `POST /api/users/bulk-import` (role='student'), which validates unique `student_id_number`, school, and department∈school; a per-row result report (imported / skipped / failed) is returned. Imported students get the same default credentials + `must_change_password`.
- `useStudents.js` / `useStudentFilters.js` / `useStudentImport.js`: unchanged — they call the rewritten api wrapper.
- **The Student Portal parts stay** (already users-based) and move to `client/src/features/portal/` (which already owns portal settings) — `StudentPortalPage`, portal hooks/components, `portalAnimations.css`. The `/dashboard/student` route + `StudentRoute` gate are unchanged. First login shows a password-change prompt driven by `must_change_password`; self-service change uses the existing profile flow.

### 6.6 Attendance pages (`features/attendance/`)

- **No list/stat UI changes** — all attendance endpoints return scoped data; charts, KPIs, tables render whatever the server returns.
- Kiosk (`KioskAttendancePage` / `useKioskAttendance`): tapping a student user assigned to another school surfaces the server's 403 message in the existing `TapResult` / not-found banner area (no local scope logic).
- Attendance dashboard: renders scoped KPIs automatically.
- RFID registration: student search now queries `users` (role='student'); inactive/unassigned badges shown for clarity.

### 6.7 Secondary features — no UI restructuring (server-filtered)

All of these pages already render exactly what the API returns, so scoping is a backend change; the UI only gains badges/selectors where noted:

- **Courses / Tools / Faculty pages**: server-filtered lists; School badge on rows; the create/edit forms gain a **School selector** (super_admin: any school; admin: fixed to own school) via `features/organization`' public API — no client-side filtering.
- **Loans list (BorrowedPage)**: server-filtered through book scope; no UI change.
- **Analytics dashboards (both)**: server-scoped KPIs/charts; no UI change.
- **Audit log / Trash**: server-filtered lists; no UI change.
- **Roles page (permissions UI)**: no code change needed — the new `manage_organization` permission flows from the catalog; it appears in the permission grid automatically after the seed batch runs.

---

## 7. Data Migration Plan

Ordered, reversible-where-possible steps. **The server may be deployed with migrations + backend enforcement ON while legacy rows stay unassigned (fail-open) — no user loses access during migration.**

1. **DDL first** — new tables + `users.school_id/department_id` + `faculty.department_id` via `config/db.js` boot (idempotent, already error-tolerant).
2. **Seed default school** (batch-guarded `v2_organization`): one `schools` row with `is_default = 1`, named from `DEFAULT_SCHOOL_NAME` env or `"Main Campus"` placeholder. Super_admin renames/reassigns later — **we do not guess.**
3. **Migrate faculty department values** — insert distinct `faculty.department` values (`CIT, CCJE, CEAS, CBE, HS`) as `departments` rows in the default school; backfill `faculty.department_id` by exact name match (report unmatched values; keep the old text column).
4. **Migrate `students` → `users` (role='student')** — script (section 7.1): 1:1 copy preserving `student_id_number`, `student_name` → `full_name`, all student fields → new user columns, `is_active` → `is_active`. **Default credentials: username = password = `student_id_number` + `must_change_password = 1`** (confirmed). Attendance history and `rfid_cards` map by `student_id_number` and need **no changes**. Skipped/colliding rows go to the report (never lost, never auto-merged — verify before merging).
5. **Assign existing users** — do **not** auto-assign. Existing users keep `school_id/department_id = NULL` (legacy, current behavior). Super_admin opens Users → "Unassigned" badges → assigns each user's school (and department where applicable). Existing seed users (`superadmin`, `admin`, `librarian`, `staff`, `student`) are the first assignment targets; student users are assigned from the same page (role filter = student).
6. **Legacy rows of the secondary tables** (`courses`, `tools`, `faculty`) keep `school_id = NULL` → legacy fallback (visible as today). They are assigned either by an admin editing them (first-touch-assigns stamp) or by a bulk-assign report in the UI. **No guessing** — nothing is auto-assigned.
7. **Assign existing books** — books start unassigned → legacy fallback keeps them visible. Admin (or super_admin) bulk-assigns books via the Categories page picker (with an "Unassigned books" filter + counts). Lexora books get assignments through the same picker (digital tab).
8. **Attendance** — **no backfill needed.** Once a student user is assigned (step 5), their entire attendance history and all future records scope automatically through the users link. Verify one known student's history flips from "visible to unscoped admin" to "school-scoped" as the correctness check.
9. **Verify before locking** — run the acceptance checklist (section 10); verify borrowing, lexora reading, bookmarks, progress, search, reports, attendance (records, kiosk, dashboard), courses/tools/faculty pages, audit log, trash, student portal, RFID registration all behave.
10. **Add constraints/indexes** — FKs and indexes ship with the DDL (empty new tables make this safe); after assignment cleanup, run a one-time integrity report query (orphan assignments, category/dept mismatches, users whose department belongs to another school, courses/tools/faculty with NULL school) and fix any leftovers.
11. **Retire the `students` table** — keep it read-only (renamed `students_retired`) for one release as rollback; drop in a follow-up once attendance/RFID/borrow flows are confirmed on `users`.
11. **Enable strict mode (optional, post-migration)** — set `ORG_STRICT_BOOKS=true` so unassigned books become invisible to scoped users; confirm with stakeholders first because it hides any still-unassigned books.

### 7.1 `students` → `users` migration script (run once, idempotent)

Bcrypt hashes cannot be produced in SQL, so this runs as a **Node script** (`server/migrations/migrate-students-to-users.js`, executed once via `node`) using `bcryptjs` — the same hashing the users repository uses.

**Per-row output (re-runnable; every source row is classified, never silently dropped):**
- `username = student_id_number`; `password = bcrypt.hash(student_id_number, 10)`; `role = 'student'`; `is_active` copied
- `full_name = COALESCE(display_name, student_name)`; `email = NULL` (login identity is the username); `student_email` → `student_email` column
- `student_id_number` / `student_course` / `student_yr_level` / `student_email` / `student_contact` / `senior_high_school` / `strand` / `school_address` ← copied 1:1
- `must_change_password = 1` (first login prompts a change)

**Never lose data — skip report.** Every row the script cannot import is written to `server/migrations/students-migration-report.json` (and printed to console) with its **original `student_id_number`, source values, and the reason**:
`duplicate-in-students` · `collision-with-existing-user` · `missing-student-id-number` · `username-collision` · `validation-error:<detail>`.
Re-running re-processes only still-missing rows (idempotent NOT EXISTS guard).

**Verify before merging.** On `collision-with-existing-user` the script **never merges automatically**. The report lists both records (source student row + colliding user row with `id`, `username`, role, existing school/student fields) for a super_admin decision. The documented manual merge procedure — executed only after verifying the person's identity (borrowing history, permissions, and personal information must not land on the wrong person):
1. Choose the surviving `users` row (normally the migrated student — it carries the full student record).
2. Free the student_id_number on the losing row first (`UPDATE users SET student_id_number = NULL WHERE id = <loser>`), then insert/move the surviving value.
3. Re-point user-keyed data of the loser to the survivor (`lexora_bookmarks`, `lexora_reading_progress` — `UPDATE ... SET user_id = <survivor> WHERE user_id = <loser>`).
4. `attendance` / `rfid_cards` / `borrowed_books` key on `student_id_number` (not user id) — they resolve to the survivor automatically once it owns the value.
5. Record the merge in the migration report and audit log.

- `attendance.student_id_number`, `rfid_cards.student_id_number`, and `borrowed_books.borrower_id_number` all resolve through the preserved `student_id_number` — **no data rewrite anywhere** for the normal (non-colliding) path.
- Counts are reported before and after: imported, skipped-by-reason, and remaining `students` rows.

---

## 8. Security Concerns

| Concern | Mitigation |
|---|---|
| **IDOR / ID tampering** (changing IDs in requests/payloads to reach another school's data) | Every mutating/read path re-validates ownership server-side: department∈school, category∈department, category∈caller's school, book∈caller's scope. Client-side hiding is never a control. |
| **Stale session bypass** (school changed mid-session) | `resolveSchoolScope` reads the user's row fresh per request on scoped routes; session carries school data for display only. |
| **Direct media access** (guessing `/uploads/lexora-books/...` PDF/image URLs) | `lexoraMediaAccess` applies the same org check after existing checks; scope included in the 10s cache key. Response stays 404 to avoid existence leaks. |
| **Borrowing a restricted book** | `assertPhysicalBookAccessible` runs inside the borrow flow before any stock mutation, and the borrow picker is scope-filtered. |
| **Kiosk cross-school check-in** | `tap`/`checkIn` verify the tapped student's school matches the operator's scope (fail-closed) before writing or mutating records; `getActiveAttendance` and record management are scoped too. |
| **Dashboard KPI leakage** | `analyticsService` attendance aggregation uses the same student-link predicate — an admin's dashboard never shows another school's counts. |
| **Privilege escalation via user creation** | Existing `canManageTarget` retained (admin cannot create admin/super_admin); only super_admin may set/change `school_id`; school is required for the `admin` role. |
| **Public surface** | Public landing search and public Lexora catalog remain open by product decision (anonymous users have no scope); documented, unchanged. |
| **New permission surface** | `manage_organization` granted only to super_admin + admin; school writes are additionally restricted to super_admin inside the service layer (not just the guard). |
| **Student-user impersonation/lookup confusion after consolidation** | Every repointed lookup filters `role = 'student' AND is_active = 1`; `student_id_number` becomes UNIQUE on `users` (guarded by pre-checks) so two people cannot share an attendance/RFID identity. |
| **Default credentials (username = password = student_id_number)** | Password is set and hashed **server-side only** (never accepted from the client for role='student' accounts); `must_change_password` forces a change on first login via the existing self-service profile flow; the flag clears on change. |

## 9. Performance Concerns

| Concern | Mitigation |
|---|---|
| Scope predicate cost on book lists | Predicate is a single `NOT EXISTS OR EXISTS` subquery; indexes on `book_category_assignments (book_id)`, `(category_id)`, `lexora_book_assignments (lexora_book_id)`, `(category_id)`, `categories (department_id)`, `departments (school_id)`; books list already capped at 1000 rows with pagination |
| Attendance/student-user scoping join | `users.student_id_number` gains a UNIQUE key and is the join key in attendance queries — the scope predicate adds one index-backed lookup per row set, no N+1; aggregate queries group on indexed columns |
| Extra query per request for scope | `resolveSchoolScope` = 1 indexed PK read, only on scoped routes; media middleware reuses its existing 10s per-(book,viewer) cache with scope folded into the key |
| N+1 on hierarchy page | Hierarchy built with batched queries (departments per school in one query, categories per department-ids in one query) — same pattern as LMS-SOP's `getHierarchy` |
| Validation overhead on writes | Single existence/ownership queries with indexes; no transactions needed for reads |

---

## 10. Testing & Acceptance Criteria

### Automated tests (follow existing `server/tests/*.test.js` patterns)

- Unit: scope-SQL builders for every surface (books / student users / attendance / loans / courses / tools / faculty / audit / trash — super_admin / legacy NULL / school-wide / dept-scoped / cross-school negative), category-in-department + department-in-school validators, kiosk fail-closed rule, `students`→`users` migration mapping.
- Integration: org CRUD permission guards (admin 403 on other school's rows), user (incl. role='student') creation with school/department validation, book list/detail scoping, lexora list/detail/reader/pages scoping, media access scoping, borrow flow scoping + borrower lookup via users, attendance list/stats scoping, kiosk tap of an out-of-school student user rejected, RFID registration search scoped to own school, loans list scoped through book scope, courses/tools/faculty CRUD scoped (incl. legacy fallback + first-touch stamp), audit-log scope by actor, trash scope snapshot, analytics dashboard KPIs scoped.

### Acceptance checklist (from the specification)

- [ ] **School isolation** — Admin A cannot list, view, edit, or delete School B's records across **all surfaces**: schools, departments, categories, users, students, attendance, books, lexora books, loans, courses, tools, faculty, audit logs, and trash.
- [ ] **User assignment** — Admin can create a user (including `role='student'`) only in their own school and one of its departments; department selector only offers the selected school's departments.
- [ ] **Department validation** — A department from another school cannot be assigned by changing a request ID (403/404, no leak).
- [ ] **Physical books** — Users cannot view or borrow restricted books outside their authorized scope (list, detail, borrow picker, borrow action).
- [ ] **Digital books** — Users cannot open restricted digital titles, flipbooks, PDFs, or protected files (detail, reader, pages, media URLs, bookmarks, progress).
- [ ] **Attendance scoping** — Admin A cannot list, view, or get statistics for School B's attendance records; a School A kiosk operator cannot check in a student user assigned to School B; dashboard KPIs reflect only the caller's school.
- [ ] **Students-as-users** — The Students page is the only student creation surface (form + bulk import) and creates `users` rows with `role='student'`; attendance check-in, kiosk, RFID registration, borrower lookup, and the student portal all operate on those rows; migrated students can log in with `student_id_number` as both username and password and are prompted to change it; the `students` table is gone; migrated students' history and RFID cards still resolve.
- [ ] **Direct API access** — Changing IDs or query parameters does not bypass school restrictions (every scoped endpoint re-validates).
- [ ] **Super admin** — Super admin can manage multiple schools and assign administrators to them.
- [ ] **Existing features** — Authentication, borrowing, search, reports, attendance (records, kiosk, dashboard), student portal, RFID registration, and digital-book functionality continue to work (regression pass + migration fallback).
- [ ] **Borrower records** — A School A operator finds the own-school student patron (Juan) but gets "not found" for a student patron of School B (Maria); faculty patrons are borrowable from any school; migrated students' borrow history resolves to the surviving account after any verified merge.

---

## 11. Task Checklist (by priority)

Phases are ordered High → Medium → Low. Each phase is deployable on its own; enforcement turns on with its phase, and the legacy fallback keeps existing data accessible throughout.

### HIGH — Security foundation, scope resolution, and identity consolidation
*Everything else depends on these. No UI is exposed before the backend here is verified.*

- [ ] **DB foundation** (`config/db.js`): 5 new tables (schools, departments, categories, book_category_assignments, lexora_book_assignments); `users` gains `school_id`, `department_id`, `student_course`, `student_yr_level`, `student_email`, `student_contact`, `senior_high_school`, `strand`, `school_address`, `must_change_password`; `faculty.department_id`; FKs + indexes in `migrateSchema()`
- [ ] **Permission**: `manage_organization` + admin grant (seed batch `v2_organization`); default school seed (`DEFAULT_SCHOOL_NAME`)
- [ ] **Organization feature backend**: `organization.repository.js`, `organization.service.js` (invariants, super_admin-only school writes), `organization.validation.js`, `organization.controller.js`, `organization.routes.js`, `index.js`; route registered in `server/index.js`
- [ ] **Scope resolution**: `schoolScope.js` (`resolveSchoolScope` — fresh DB read per request)
- [ ] **Access services**: `bookAccess.service.js` (physical + digital scope SQL, row asserts, assignment setters); `attendanceAccess.service.js` (student-user scope SQL, kiosk rule)
- [ ] **Students → users consolidation (server)**: users repo/service persist + validate student fields (unique `student_id_number` for role='student'); **default-credentials rule (server-side: username = password = student_id_number + must_change_password)**; new `POST /api/users/bulk-import` (role='student' rows + per-row result report); delete `models/Student.js`, `routes/students.js`, `studentsController.js`; rewire `Attendance.js`, `RfidCard.js`, `Transaction.js` student lookups to `users` (role='student')
- [ ] **Users scoping**: `users.service.js` own-school rules + super_admin-only school assignment + student-role payload validation; `users.routes.js` mounts `resolveSchoolScope`; `authController.js` includes school_id/department_id + must_change_password in login/me/profile payloads and clears the flag on password change
- [ ] **Attendance scope (server)**: `Attendance.js` all read/aggregates repointed to `users` + scope predicate (via `buildAttendanceFilter` funnel); `tap/checkIn/checkOut` kiosk fail-closed check; `attendanceController` + `routes/attendance.js` + `rfidController.js` pass scope
- [ ] **Dashboard KPIs**: `analyticsService.js` attendance aggregation + `analyticsController` scope

### MEDIUM — Enforcement surfaces (books, digital books, borrowing, search, loans)
*Runs after the HIGH foundation is deployed and verified.*

- [ ] **Physical books**: `models/Book.js` optional scope (getAll/search/filter/getById); `booksController` + `routes/books.js` pass scope
- [ ] **Borrow flow**: `assertPhysicalBookAccessible` before `TransactionModel.create`; scope-filtered borrow picker; **student borrower lookup/history school-scoped (Juan found, Maria blocked), faculty lookup unscoped** (5.9)
- [ ] **Loans list**: `Transaction.js` getAll/active/overdue/stats scoped through the borrowed book's scope (5.10)
- [ ] **Authenticated search**: `searchController.js` scope fragment
- [ ] **Digital books**: `models/LexoraBook.js` optional scope; `routes/lexoraBooksRoutes.js` scope on list/detail/reader/pages/bookmarks/progress
- [ ] **Media protection**: `middleware/lexoraMediaAccess.js` org check + scope in cache key

### MEDIUM — Secondary feature scoping (courses, tools, faculty, audit, trash, analytics)
*Same middleware, simple-table predicates; each is an independent slice.*

- [ ] **Courses**: `courses.school_id` + scope on list/detail/mutations; enrollments scoped through their course; first-touch-assigns stamp on legacy rows
- [ ] **Tools**: `tools.school_id` + scope on list/detail/mutations/downloads; first-touch-assigns stamp
- [ ] **Faculty (management)**: `faculty.school_id`/`department_id` + scoped Faculty page CRUD; borrower lookup stays unscoped; legacy faculty migrated from the department enum
- [ ] **Audit logs**: scope by acting user's school (NULL/system = legacy fallback); `models/AuditLog.js` + `routes/audit.js`
- [ ] **Trash**: `trash_log.school_id` snapshot in `TrashModel.softDelete`; scoped list/restore/permanent-delete; purge job unchanged
- [ ] **Analytics dashboards (both)**: book/loan/attendance-scope funnels in `analyticsService.js` — KPIs, most-borrowed, holdings, fines, overdue, arrivals, low stock, attendance chart

### MEDIUM — Frontend (organization feature + integration surfaces)
*Depends on the corresponding backend routes from HIGH/MEDIUM.*

- [ ] **`features/organization/`**: api/hooks/pages/components + `index.js` (Schools, Departments, Categories pages + assignment panel)
- [ ] **Nav + routes**: ORGANIZATION section in `navItems.js`; routes in `App.jsx` with `PermissionRoute`
- [ ] **Users page**: **remove the Student Information section + student role from creation**; school selector, dependent department selector for staff/admin/librarian, Unassigned badges, School/Department columns, existing students read-only behind an "include students" toggle
- [ ] **Books + Lexora admin**: assignment controls + badges
- [ ] **Attendance/RFID client rewiring**: `useStudentLookup`, `RfidStudentSearch` → student-users search; kiosk error surfacing (no scope logic client-side)
- [ ] **Students page = the student creation surface**: `studentsApi` becomes a thin `role='student'` wrapper over `features/users`' public API; `StudentFormModal` carries all student fields + school/department selectors and posts with `role='student'` (no password — server applies the default-credential rule); import wizard posts to `POST /api/users/bulk-import` with per-row results; move Student Portal to `features/portal/` (route/gate unchanged); first-login password-change prompt via `must_change_password`
- [ ] Verify Roles page shows `manage_organization` from the catalog

### LOW — Data migration, legacy retirement, and optional lock-down
*Manual, guided, and reversible until each verification passes.*

- [ ] Migrate faculty department values → departments rows; backfill `faculty.department_id` (report + keep old column)
- [ ] Run `students` → `users` migration script (7.1): classify every row, write the skip report (original ID + reason), add unique key, verify counts
- [ ] Resolve migration collisions via the documented verify-before-merge procedure (super_admin, after identity verification) — nothing auto-merged
- [ ] Assign existing users incl. student users (super_admin, via UI) — unassigned report
- [ ] Assign legacy `courses` / `tools` / `faculty` rows (first-touch-assigns via edit, or bulk-assign report) — unassigned report
- [ ] Assign existing books (pick + bulk-assign) — unassigned report
- [ ] Verify a known student user's attendance history + RFID mapping still resolve and scope correctly
- [ ] Integrity verification queries; resolve leftovers
- [ ] Retire `students` table (rename read-only for one release → drop in follow-up)
- [ ] Optional: enable `ORG_STRICT_BOOKS` after stakeholder sign-off

### LOW — Verification & regression (runs alongside each phase, completed at the end)
- [ ] Unit tests: scope-SQL builders (books / student users / attendance), validators, kiosk rule, migration mapping
- [ ] Integration tests: every scoped endpoint + cross-school negatives + direct-API tampering
- [ ] Full acceptance checklist (11 items, section 10)
- [ ] Regression pass: login, borrowing, loans list, search, reports, attendance (records, kiosk, dashboard), student portal, RFID, courses, tools, faculty, audit log, trash, lexora reader/bookmarks/progress

---

## 12. Out of Scope / Follow-ups

- **All listed features ARE scoped in this plan**: org tree, users/students, attendance (records/kiosk/dashboard), books (physical + digital + media), loans, courses, tools, faculty management, audit logs, trash, analytics dashboards, borrower lookup. **Not scoped this phase:** portal/site settings, WebSocket payload fan-out (the API stays the authority), and the faculty **patron** path in borrow flows (deliberate — see 5.9).
- **Nested departments** — flat only; add `parent_department_id` later if required.
- **Lexora content taxonomy** (`lexora_book_categories`) remains the Lexora admin tagging system; unification with org categories is a possible future cleanup, deliberately avoided now to prevent breaking the Lexora UI.
- **Existing per-entity permission overrides** (Roles page "Access Restrictions") remain as-is and compose with school scope (both must allow access); documented, not merged.
- **Public landing search / public Lexora catalog** — unchanged (no scope for anonymous users).

## 13. Risks & Rollback

| Risk | Mitigation |
|---|---|
| Migration locks users out | Fail-open legacy fallback (unassigned users/books keep current access); no auto-guessing; strict mode only after sign-off |
| `students`→`users` migration loses or mis-assigns records | Every row classified with a skip report (original ID + reason); collisions never auto-merged — documented verify-before-merge procedure with user-keyed re-pointing + audit entry; 1:1 copy preserving `student_id_number`; `students` table kept read-only for one release before drop |
| Regressions in borrowing/lexora reader/kiosk | Scope checks are additive after existing checks; repointed lookups verified against attendance history + RFID mappings before the Students page is cut over to the users API |
| FK violations on messy data | New tables are empty at creation; user/faculty columns start NULL; integrity report before strict mode |
| Rollback | DDL is additive (no drops); fallback flag `ORG_STRICT_BOOKS=false` restores legacy visibility; disabling `manage_organization` grants restores pre-feature UI access |
