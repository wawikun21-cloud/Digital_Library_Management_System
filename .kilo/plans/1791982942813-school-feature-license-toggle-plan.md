# Proposal — Per-School Feature License Toggle (Lexora vs. Library)

> **Status: IMPLEMENTATION-READY.** All five decisions below are confirmed by the user (library-only → lexora hidden/blocked; lexora-only → physical hidden/blocked; both default; super_admin + anonymous exempt; set-point in Organization/Schools, read-only in Roles). This document is the locked design.

## Context

> *"If the Client School Purchase of the Features of the Library, only the library they can manage; if they only want a feature of the Lexora they can access lexora; if they want both, super-admin toggles. This setting is placed in Organization > School."*

This is a **per-school module license** with three mutually-exclusive options — `library`, `lexora`, or `both` — set by a **super-admin radio toggle** in the Organization > School page, and the setting must also be **reflected in the Roles page**.

The user suggested *"what if we apply that in RolesPage.jsx ... and wire it in Organization"*. This proposal explains why the **source of truth belongs on the `schools` row (set from Organization)**, why the Roles page should **reflect it read-only**, and where enforcement must live to avoid the "see-but-can't-open" anti-pattern already proven with the department-scope fix.

## What already exists (build on, don't re-invent)

| Concern | Location | Reused? |
|---|---|---|
| `schools` table | `server/config/db.js:895-914` — `id, code, name, description, status, is_default, created_by, created_at, updated_at` | yes — the natural home for a license column |
| Per-request scope resolver | `server/features/organization/schoolScope.js` — shape `{ role, schoolId, departmentId, scoped }`; `super_admin` → `{ scoped:false }` | yes — extend the scope object to carry the license |
| Scope SQL fragments | `features/organization/bookAccess.service.js` (physical + lexora) — already used by the just-fixed catalog | yes — the lexora read fragment is the enforcement point |
| Nav visibility model | `client/src/components/layout/navItems.js` — `isItemVisibleForUser` keyed on `permission`/`roles`; `Sidebar.jsx` consumes `buildVisibleItems(NAV_ITEMS, user)` | yes — lexora nav items gated here |
| Existing entity-restriction system | `features/roles/…` (`ENTITY_TYPE_CONFIG`, `ResourceRestrictionPanel`, `role_entity_permissions` / `entity_permission_overrides` tables) | **NO** — that is per-record role/user restriction, a different concept. Do not overload it with a school license. |
| Schools CRUD + UI | `client features/organization/` — `SchoolFormModal`, `SchoolTable`, `SchoolsPage`, `useSchools`, `organizationApi.js` | yes — the toggle's set-point |
| Role editor (read display) | `features/roles/pages/RolesPage.jsx` + `PermissionsDrawer` | yes — reflect license read-only |

## Architecture

```
schools.feature_set ENUM('library'|'lexora'|'both')  DEFAULT 'both'   ← single source of truth (per school; changing A never affects B)
        │
        ├─ Organization > Schools (SchoolFormModal radio)  → WRITE  (set-point; super_admin only)
        ├─ server resolveSchoolScope (fresh read per request) → READ  scope.featureSet
        ├─ bookAccess.lexoraBookScopeSql / physicalBookScopeSql → ENFORCE (the disabled type yields AND FALSE)
        ├─ navItems.js (sidebar)                                 → UI HIDE (disabled feature's nav items)
        └─ Roles page (PermissionsDrawer)                       → REFLECT (read-only badge)
```

**Enforcement is symmetric and server-first.** Mirrors the department-scope fix:

| School license | Physical-library reads | Lexora reads | super_admin | anonymous |
|---|---|---|---|---|
| `library` | allowed | **blocked** (`AND FALSE`) | full | full |
| `lexora` | **blocked** (`AND FALSE`) | allowed | full | full |
| `both` | allowed | allowed | full | full |

`super_admin` and anonymous callers are exempt (`scope` null / `scoped:false` → empty SQL fragment, no behavior change). The lexora read path already supports scope (`getById(id, {publishedOnly, scope})` and `/api/lexora-books/public` mount `resolveSchoolScope` from the department-scope fix); the physical read path already supports scope (`booksController` threads `req.schoolScope`, `public-search` + `/:id/copies/public` mount `resolveSchoolScope`). The license is enforced by extending each existing scope fragment so the *disabled* type yields `AND FALSE` per scoped school.

Two protections, as the user specified:
- **Frontend** — sidebar nav items for a disabled feature are hidden (UI hint).
- **Backend** — out-of-license routes return 404 for the school's scoped users, even if the URL is entered manually. Hiding the menu alone is never the only control.

**Decisions (all confirmed):** 1) add `schools.feature_set ENUM('library','lexora','both') DEFAULT 'both'`; 2) set-point in Organization > Schools; 3) Roles is reflect-only (read-only badge; no cross-feature write); 4) new/legacy schools default `'both` (safe rollout); 5) sidebar hide + server 404, symmetric across both types.

## Implementation

### Backend
- **`server/migrations/NNNN-NN-NN-add-schools-feature-set.sql`** — `ALTER TABLE schools ADD COLUMN feature_set ENUM('library','lexora','both') NOT NULL DEFAULT 'both'` (follows the `.sql` naming of `add_portal_hero_slides.sql` etc.).
- **`server/features/organization/schoolScope.js`** — add `feature_set` to the existing `SELECT role, school_id, department_id FROM users` resolution (a single extra join on `schools` by `school_id`, or a second column read from the users→schools link). Scope object gains `featureSet: 'library'|'lexora'|'both'` (unset/legacy → `'both'`). `super_admin` keeps `{ scoped:false }`, so the license never applies to them.
- **`server/features/organization/bookAccess.service.js`** — extend the two existing fragments so the *disabled* type yields `AND FALSE` for a scoped school:
  - `lexoraBookScopeSql(scope)`: when `scope.scoped && scope.featureSet === 'library'` → `AND FALSE` (lexora reads vanish). Otherwise the existing category-assignment predicate.
  - `physicalBookScopeSql(scope)`: when `scope.scoped && scope.featureSet === 'lexora'` → `AND FALSE` (physical reads vanish). Otherwise existing predicate.
  Anonymous (`!isScoped`) paths are unchanged — public surface preserved.
- **Enforcement touchpoints (single enforcement point = the scope fragment):**
  - Lexora: `/api/lexora-books/public`, `/public/:id`, `/public/tags`, `/:id/reader`, `/:id/bookmarks`, `/:id/progress` (reader route already mounts session-optional `resolveSchoolScope`), and media middleware `lexoraMediaAccess.js` (already reads fresh scope) — covered by `lexoraBookScopeSql` returning `AND FALSE`. The admin manage list (`/api/lexora-books` with `manage_lexora_books`) must also apply the fragment so a librarian in a library-only school can't manage via direct nav.
  - Physical: `/api/books` list, `/api/books/public-search`, `/:id/copies/public`, the borrow book-picker, and any other `booksController` read — covered by `physicalBookScopeSql` returning `AND FALSE`.
- **`server/routes/lexoraBooksRoutes.js` + `server/routes/books.js`** — no new route mounts; enforcement is in the shared fragment. (The department-scope fix already added `resolveSchoolScope` to the public routes; reuse it.)

### Frontend
- **`client/src/features/organization/components/SchoolFormModal.jsx`** — add a `feature_set` radio group (Library | Lexora | Both); new school defaults to `both`; edit pre-seeds the current value; only super_admin reaches the form (the page already gates this).
- **`client/src/features/organization/api/organizationApi.js`** — no change; `feature_set` flows through the existing `createSchool`/`updateSchool` PUT/POST bodies.
- **`client/src/components/layout/navItems.js`** — the lexora nav items (Catalog → "Lexora E-Books", "Manage Lexora Books") and the physical "Books" item are additionally hidden when the school's resolved license excludes them. Courses, attendance, transactions, etc. are unaffected — only the Books/Lexora pair is license-bound. The license is read from the cached scope/user object the Sidebar already receives (`buildVisibleItems(NAV_ITEMS, user)`); `navItems` is a global layout module (not a feature), so reading the shared scope is allowed.
- **`client/src/features/roles/components/PermissionsDrawer.jsx`** (read-only reflect) — show the school's `feature_set` badge and, for the disabled type, disable/dim the corresponding entity-restriction panel with a tooltip ("disabled because this school's license does not include Lexora/Library").

### Anti-spaghetti compliance
- The license lives on `schools` and is read through the existing scope resolver — **no feature imports another feature**.
- `organization/index.js` already exports the school CRUD surface; the toggle reuses it.
- `navItems.js` / `Sidebar.jsx` are global layout components (not features), permitted to read the scope.
- Roles only *reads* the license via the shared scope object — **no `roles → organization` write dependency**.

## Acceptance (mirrors the user's behavior matrix)

| Scenario | Physical reads | Lexora reads | Sidebar: Books | Sidebar: Lexora |
|---|---|---|---|---|
| School A = library | ✅ allowed | ❌ 404/empty | visible | **hidden** |
| School B = lexora | ❌ 404/empty | ✅ allowed | **hidden** | visible |
| School C = both | ✅ allowed | ✅ allowed | visible | visible |
| super_admin (any school) | ✅ full | ✅ full | visible | visible |
| anonymous (logged-out) | ✅ public | ✅ public | n/a (public) | n/a (public) |

Cross-checks:
- Changing School A's license does **not** change School B (per-school column; scope is resolved per-request from the user's `school_id` → `school.feature_set`).
- Direct URL to a blocked feature returns 404 for the scoped school's user (backend enforcement, not just nav hide).
- New school → `feature_set = 'both'` (legacy behavior preserved).
