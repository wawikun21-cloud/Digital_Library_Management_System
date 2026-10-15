# Scope & Access-Control Model — LMS-SOP vs DLMMS Comparison Review

**Purpose:** Examine `LMS-SOP` (a separate, Hostinger-deployable monolithic LMS on the Desktop) and compare
its access-control / school-scope model to the current **DLMMS** (`Digital_Library_Management_System`, the
working directory). Determine whether DLMMS should adopt any LMS-SOP patterns.

**Outcome:** Analysis only. No code changes. See §8 Recommendations for decisions.

> Scope model = the thing that decides, for any request, "what can this caller see / touch."
> DLMMS calls it `schoolScope`; LMS-SOP uses `business_id` + `department_id` (+ grants) + a separate
> "reservist hierarchy." They are compared below by the same dimensions.

---

## 1. Reference locations examined

### LMS-SOP (the reference)
| Artifact | Path |
|---|---|
| Scope engine | `server/middleware/rbac.js` (design note 1-24; `getUserScopeFilter` 140-165; `enforceScope` 176-207; `resolveEntityScope`/`userCanManageScope` 213-310) |
| Auth + identity | `server/middleware/auth.js` (`authenticateToken`, `resolveScope` 184-213; `req.user` carries `business_id`, `department_id`, `role`) |
| Route-scoped perms | `server/middleware/scope.js` (`requirePermission`, `requirePermissionAction`, `requireBusinessScope`, `requireEntityTypeAccess`) |
| Courses enforcement | `server/controllers/coursesController.js` (`enforceCourseScope` 27-69; list/get/create/update/delete 71-263) |
| Courses routes | `server/routes/courses.js` (40-59 protected via `authenticateToken, resolveScope`) |
| Schema | `server/config/database.js` (ALTER migrations: `departments.business_id` 507, `users.business_id`/`department_id` 509-510, `courses.business_id` 816-818) + `sql/schema.sql` (`users`, `departments`, `department_members`, `department_scope_grants` 760, `businesses` 487) |
| Courses table | `courses.business_id INT NULL` + `courses.department_id INT NULL` (FK departments) |

### DLMMS (current)
| Artifact | Path (DLMMS) |
|---|---|
| Scope engine | `server/features/organization/schoolScope.js` (`resolveSchoolScope` 25-71; `req.schoolScope` shape 35-66; `isScoped`) |
| Scope public API | `server/features/organization/index.js` (exports `bookAccess`, `resolveSchoolScope`, `isScoped`) |
| Book/course access rules | `server/features/organization/bookAccess.service.js` (`physicalBookScopeSql`/`lexoraBookScopeSql`; `isPhysicalBookAccessible`/`isLexoraBookAccessible` 140-171) |
| Courses controller | `server/features/courses/courses.controller.js` |
| Courses builder controller | `server/features/courses/builder.controller.js` |
| Courses service | `server/features/courses/courses.service.js` |
| Courses repository | `server/features/courses/courses.repository.js` (`scopeSql` 6-10) |
| Courses routes | `server/features/courses/courses.routes.js` (+ `builder.routes.js`) |
| Routes mounting | `server/index.js` (185-186) |
| Permission catalog | `server/features/roles/permissionCatalog.js` (`manage_courses`, `view_course_library`, entity-types 205) |

---

## 2. Architecture impact

### 2.1 Tenant / scope model

| Dimension | DLMMS (current) | LMS-SOP |
|---|---|---|
| Root tenant unit | **School** (`schools.id`, `schools.feature_set` ∈ {both,library,lexora}) | **Business** (`businesses`) |
| User affiliation | `users.school_id` + `users.department_id` | `users.business_id` + `users.department_id` |
| Department belongs to | `departments.school_id` (FK → schools) | `departments.business_id` + `parent_department_id` (self-ref hierarchy) |
| Delegated/dept scope | **None** — a user with `department_id` set sees everything in their `school_id` (courses have no dept filter) | `department_scope_grants(user_id, department_id)` → `req.user.scoped_department_ids` for `department_head` (auth.js:196-206) |
| Course row stores | `courses.school_id` only — **no `department_id`** (db.js:1001; repository create/update never reference a dept column) | `courses.business_id` + `courses.department_id` |
| Scope resolution | Per-request, DB-read from `users`+`schools` (schoolScope.js:45-66) — "fresh each request" | Per-request in `resolveScope` (auth.js:184), pulls permissions + entity overrides + dept grants from DB |

**Impact:** DLMMS scope is strictly **school-level** for courses. LMS-SOP scope is **business + optional department** for courses. The two models are not 1:1 interchangeable (school ≃ business; DLMMS has no dept-scoping on courses at all).

### 2.2 Enforcement placement & style

DLMMS embeds scope **in SQL** (single predicate in the repository — `bookAccess`/`courses.repository scopeSql`), so list/detail/update/delete are filtered in one place. Out-of-scope → predicate removes the row → **404 "not found"** (no existence leak; matches the lexora plan's §1.16 contract).

LMS-SOP uses a **read-then-check helper** `enforceCourseScope(course, user)` (coursesController.js:27-69): `findById` first, then authorize. Out-of-scope → **403 "This course belongs to a different business."** That is an **existence leak** by design (absent=404, present-but-other-org=403). Different philosophy; not a bug in LMS-SOP, but a deliberate divergence from DLMMS's "no leak" stance.

LMS-SOP's `rbac.js` also documents a **visible-but-read-only** model (rbac.js:6-24, 210-): out-of-scope rows are returned with a `can_manage` flag; only mutations are hard-blocked via `authorizeManageEntity()`. DLMMS hides out-of-scope rows entirely (predicate returns none). LMS-SOP's model is better for UX but requires the frontend to honor read-only flags.

### 2.3 Coverage

DLMMS coverage is **partial and structurally incomplete** (see §6). LMS-SOP coverage, as far as the courses controller is concerned, is **consistent**: `enforceCourseScope` is applied on `getCourse`, `updateCourse`, `deleteCourse`, `listModules`, `createModule` (coursesController.js:109, 218, 253, 274, 291).

### 2.4 Permissions / roles

DLMMS: action-based **permission catalog** — `manage_courses:create|view|edit|delete|archive|publish`,
`view_course_library:view|enroll|complete`; gate per route with `requirePermissionAction`. Supports
**per-entity overrides** (`permissionCatalog.js:205`: users/books/lexora_books/courses/tools).

LMS-SOP: role-name gating (`authorize('admin','super_admin',...)`) layered with `requirePermission`,
`requirePermissionAction` (string-keyed, no per-entity override table visible in schema), `requireBusinessScope`,
`requireEntityTypeAccess('course')`. Roles: `super_admin, admin, department_head, employee, reservist` (auth.js:6).

### 2.5 Structure

- DLMMS: **feature-based** (`server/features/<name>/`; client `features/<name>/`) per the anti-spaghetti rules.
- LMS-SOP: **classic type-based** (`controllers/`,`models/`,`routes/`,`services/`) — flat. Note `LMS-SOP\server` actually nests a `server/server/` app root and `server/controllers/*Controller.js` files, some very large (e.g. `sopController.js` ~45 KB, `coursesController.js` 32 KB).

### 2.6 Frontend

- DLMMS `courses/pages` are small-ish but architecturally uneven (see §5). Pages hold **no** scope
  authority (correct — all enforcement is backend).
- LMS-SOP pages are oversized: `course_management\pages\CourseBuilderPage.jsx` is **~54 KB / 54k chars**;
  `UsersPanel.jsx` 66 KB; `pages\Reservists.jsx` ~25 KB; `TaskListRow.jsx` 84 KB. These violate the
  same size/review principles enshrined in DLMMS's `ANTI_SPAGHETTI_RULES.md`.

---

## 3. Database changes (relative statement)

No migrations are required to *perform this comparison*. If DLMMS later adopts department-level course scoping, the schema delta would be:

- `ALTER TABLE courses ADD COLUMN department_id INT NULL` + index + `FK(department).departments(school_id)` — **only if departments are scoped per school** (DLMMS `departments.school_id` exists; LMS-SOP departments hang off `business_id`).
- Optionally `CREATE TABLE course_category_assignments` (mirroring `book_category_assignments`) if the project wants category→department indirection instead of a direct column.

The direct-column approach (DLMMS's existing `courses.school_id` style) is simpler and consistent with what's already there; the assignment-table approach (LMS-SOP's category indirection) is only worth it if multi-category per course is a real need.

---

## 4. Files affected (for any adoption decision)

If DLMMS adopts LMS-SOP-style department scoping for courses:

- **Backend:** `server/features/courses/courses.repository.js` (`scopeSql` + `create`/`update` allow-list + new column), `courses.service.js` (department validation analogous to school pinning at repo:124-130), `courses.controller.js` / `builder.controller.js` / `builder.routes.js` (mount `resolveSchoolScope` + thread scope — this is the actual fix for GAP 1 below).
- **Backend (optionally):** `server/features/organization/bookAccess.service.js` does not cover courses; a `courseAccess` helper would centralize the rule (the lexora plan already establishes this "single source of truth" pattern §10).
- **Frontend:** `client/src/features/courses/api/coursesApi.js` already sends no scope (correct — server enforces); forms would add a department picker using the existing `useDepartments` / organization API.
- **Docs:** this very document.

---

## 5. Security concerns

The single biggest finding: **DLMMS's courses feature has the exact gap class the lexora plan (§1) exists to close, but wider.** For courses:

- **GAP 1 (critical) — the Course Builder is entirely unscoped.** `builder.routes.js:10` mounts only
  `requireAuth, resolvePermissions` — **no `resolveSchoolScope`** — and both routers mount at
  `/api/courses` (`server/index.js:185-186`), builder first. `builder.controller.js` /
  `builder.service.js` never reference `req.schoolScope` at all
  (`builder.service.js:4,21,115,120,125`). Consequence: a School A `manage_courses` caller can
  open, rewrite every module/lesson, publish, submit-for-review, and approve a **School B** course
  by id. (`CourseBuilderPage.jsx` renders exactly this surface — `:58`, `:81`, `:234`, `:252`, `:253`.)
- **GAP 2 — module/content/enrollment handlers are unscoped.** `courses.controller.js` calls
  `coursesService.listCourseModules/createModule/updateModule/deleteModule/listModuleContent/
  createContent/updateContent/deleteContent` (:225-339) with **no scope**, and
  `modules.repository.js` / `content.repository.js` / `enrollments.repository.js` have no scope
  support at all.
- **GAP 3 — progress endpoints unscoped.** `getCourseProgress` calls `getCourse(courseId)` **without**
  scope (`:395`) — leaking the full lesson list + `url` fields — and `markLessonComplete` uses
  `progressRepo.findLesson(courseId, lessonId)` (`:456`) with no scope, so a scoped caller can mark
  lessons complete on another school's course.
- **GAP 4 — contract bug in the scoped paths.** `courses.service.js:updateCourse` returns
  `{ affectedRows: 0, scopeError }` (truthy) on out-of-scope; `courses.controller.js:132-135` test
  `if (!affected)` → **false**, so an out-of-scope `PUT /:id` returns **200 "Course updated successfully"**
  (and logs a bogus audit row) instead of 404. `createCourse` similarly ignores `scopeError`
  (`courses.controller.js:106-114`) → returns **201 `{"id":null}`** when a scoped caller pins another
  school. LMS-SOP's `enforceCourseScope` throws explicitly and would not have this bug.
- **GAP 5 — 403 existence leak.** `getCourse` / `getCourseProgress` in DLMMS currently 404 on
  absent; once GAP 1's middleware is added they must stay 404 (no `enforceCourseScope`-style 403) to
  preserve the lexora plan's §1.16 contract. DLMMS's predicate-in-SQL approach naturally yields 404, so
  the fix fits — but LMS-SOP's 403 style must **not** be copied into DLMMS.

DLMMS also lacks `departments.head_user_id` / `department_scope_grants`; for courses that means a
department-scoped user does not exist concept (courses are school-granular only), so there is nothing
to leak there yet.

---

## 6. Performance concerns

- DLMMS predicate (`c.school_id IS NULL OR c.school_id = ?`) is one extra indexed `WHERE` clause per
  read — `idx_courses_school` exists. Negligible for admin mutations.
- Adding `department_id` scope adds one more indexed predicate; LMS-SOP carries the same shape
  (`idx_departments_business`, `idx_courses_business`) with no reported issue.
- The dominant cost is not scope, it is coverage: GAP 1 means the builder does **N+1 writes per
  save** (`builder.service.js:39-111`) with **no** pre-check — acceptable, but it should be gated
  before the first write, not relied on to fail mid-flight.
- LMS-SOP's `enforceCourseScope` does an extra `SELECT ... FROM departments` per mutate when
  resolving a course's business from its `department_id` (coursesController.js:46-56). DLMMS avoids
  that by pinning `school_id` directly on the course row. Keep that design.

---

## 7. What LMS-SOP got right that DLMMS lacks

1. **A single, callable scope helper applied on every course handler.** `enforceCourseScope(course, user)`
   is reused (not re-derived) across get/update/delete/modules. DLMMS spreads the check: course-level
   reads embed it in SQL; the builder omits it entirely. Centralising a `courseInScope(req, courseId)`
   (the lexora plan's §4D shape) is the cleaner fix.
2. **Department delegation via grants.** `department_scope_grants` lets a department-head manage
   cross-department scope without being a tenant admin. DLMMS `resolveSchoolScope` resolves
   `departmentId` (schoolScope.js:60-66) but no feature consumes it for courses.
3. **Consistent application across sub-resources.** LMS-SOP calls `enforceCourseScope` before
   module/content fetches in the same controller. DLMMS has two parallel course controllers, one
   scoped, one (the builder) not — the inconsistency is structural.
4. **Visible-but-read-only containment** (rbac.js `userCanManageScope` / `authorizeManageEntity`)
   is a richer model than DLMMS's hide-or-allow. Adopting it is optional; the immediate win is just
   consistency.

## 8. Recommendations (decisions, not commands)

- **Adopt LMS-SOP pattern 1 (centralised helper) and pattern 3 (consistent sub-resource coverage)
  — but NOT pattern 4's 403 style.** Close GAPs 1–3 by threading `req.schoolScope` through the
  builder router/controller/service and into modules/content/enrollments/progress, using a single
  `loadScopedCourse(req, courseId)` helper and preserving DLMMS's 404-not-403 contract.
- **Fix GAP 4** regardless: make out-of-scope `updateCourse`/`createCourse` return 404/4xx, not
  200/201.
- **Department-level course scoping:** only adopt if wanted. It needs a `courses.department_id` column
  + a `useDepartments`-backed picker, auto-pinning the caller's own department (never trusting client
  input) and validating department∈school on write. Do **not** copy the `business_id` abstraction —
  DLMMS is school-based; map business→school, department→department.
- **Do NOT port LMS-SOP's type-based structure or its >400 KB monolithic files** into DLMMS — the
  existing `features/<name>/` layout and the `ANTI_SPAGHETTI_RULES.md` thresholds are superior.

### Decision needed
Confirm which scope of change is in-scope for the current effort:
(A) close the course scope gaps (GAPs 1-4) only — school-level, matching the lexora plan; or
(B) A, plus add real department-level assignment on courses (new column + UI + scoped predicate).
(C) nothing beyond this review.
