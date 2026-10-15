# Department-Scoped Student Catalog — Fix Plan

**Feature:** Close the department-level visibility leak on the digital-book (Lexora) browse surface
**Date:** 2026-10-14
**Context:** Addendum to the School Organization & Access Control plan. Reported: a student in School A / Department 1 can still see Lexora books that are not assigned to their department.

---

## 1. Problem & Root Cause

**Symptom:** A logged-in student (School A, Department 1) sees Lexora books in the catalog and book-details pages even though those books are not assigned to Department 1 — either because they are assigned to Department 2, or because they have no org assignment at all.

**Root cause is on the read surface, not the data layer. Verified:**

1. **The student-facing catalog and details pages call PUBLIC endpoints.** `LexoraBooksCatalog.jsx` → `fetchPublicLexoraBooks` → `GET /api/lexora-books/public`, and `LexoraBookDetails.jsx` → `fetchLexoraBookPublic` → `GET /api/lexora-books/public/:id`. These routes are registered **before** the auth/scope middleware (`lexoraBooksRoutes.js:45-111`) and the model path is `getPublic()` → `getAll({ … })` with **no scope** (`LexoraBook.js:428-434`). Every logged-in user therefore receives unscoped browse results and full book metadata.
2. **Scope IS enforced one step later.** `GET /:id/reader` asserts `isLexoraBookAccessible(req.schoolScope, id)` and 404s out-of-scope books (`lexoraBooksRoutes.js:120-139`). So the student sees a book in the catalog/details and then gets "not found" when opening it — the exact reported behavior.
3. **Not a data bug.** `department_id` persists for students (`users.repository.js` SAFE_COLUMNS + INSERT include it), `resolveSchoolScope` reads `school_id`/`department_id` fresh from the DB per request (`schoolScope.js:41-57`), and the scope predicate itself contains the department condition (`bookAccess.service.js:60`). When a scope is applied, department isolation works — the catalog/details simply never apply it.
4. **Secondary gap — unassigned books.** The visibility predicate treats a book with **no** category assignments as visible to every scoped user (`NOT EXISTS (…)` fallback clause, `bookAccess.service.js:50-54`). The approved plan's `ORG_STRICT_BOOKS` lock-down switch was **never implemented** — zero references in the server. Until it exists, a book assigned to no department is visible school-wide.
5. **Same class on the physical side.** `GET /api/books/public-search` runs raw SQL with no scope over both `books` and `lexora_books` (`books.js:40-126`), and `GET /api/books/:id/copies/public` returns copies of any book without a scope check (`books.js:129-154`). Lower impact (students have no physical browse page; the route exists for the anonymous landing search), but a logged-in scoped user can hit them directly.

## 2. Fix Design

**Fix A — session-aware public routes (primary).** The public book routes resolve scope from the session when one exists and apply it; anonymous visitors keep exactly today's behavior (no session → `req.schoolScope = null` → unscoped). This is the same session-optional pattern the reader route already uses (`lexoraBooksRoutes.js:120`). After this, every surface a student can reach — catalog, details, reader, bookmarks, progress — applies one identical predicate.

**Fix B — strict lock-down switch (post-migration).** Implement the plan's `ORG_STRICT_BOOKS` flag in the shared predicate: when enabled, the `NOT EXISTS (…)` legacy-fallback clause is dropped, so unassigned books become invisible to scoped callers. **Default OFF** (fail-open) so nothing changes on deploy; enable after existing books are bulk-assigned. Caveat documented in the code: strict applies to **all** scoped callers including admins — so enable it only once assignment is complete, otherwise legacy books also disappear from the admin lists used to assign them.

**No frontend changes.** The catalog/details render whatever the server returns; after Fix A a logged-in student receives only in-scope books and the 404-on-open inconsistency disappears.

## 3. Files Affected (exact changes)

### 3.1 `server/routes/lexoraBooksRoutes.js` — session-aware scope on the two public book routes

- `router.get("/public", …)` (`:45`): add `resolveSchoolScope` as route middleware (session-optional — no `requireAuth`; anonymous requests set `req.schoolScope = null` exactly like the reader route), and pass `scope: req.schoolScope` in the `getPublic({ … })` options object (`:49-56`).
- `router.get("/public/:id", …)` (`:87`): same middleware; change the model call to `getById(req.params.id, { publishedOnly: true, scope: req.schoolScope })` (`:89`). An out-of-scope book returns the model's own `Book not found` 404 — identical shape to an unknown id, so no existence leak.
- `/public/categories` and `/public/tags` (`:65`, `:76`) are **deliberately unchanged** — they return the Lexora content taxonomy, not books.

### 3.2 `server/models/LexoraBook.js` — thread the scope through `getPublic`

`getPublic(filters = {})` (`:428-434`): add `scope: filters.scope` to the `getAll({ … })` call. `getAll` already applies `lexoraBookScopeSql(options.scope)` (`:204-214`) — no other model change.

### 3.3 `server/routes/books.js` — same treatment for the physical public routes

- `/public-search` (`:40`): add `resolveSchoolScope`; when `req.schoolScope` is present append the shared fragments — `physicalBookScopeSql(scope)` to the `FROM books b` query (fragment already targets alias `b`), and `lexoraBookScopeSql(scope)` to the lexora query after aliasing the table `FROM lexora_books lb` (the fragment targets alias `lb`). Both fragments start with `AND (…`, and both WHERE clauses are guaranteed non-empty (the route 400s unless title or author is given) — append directly after the existing `whereClause` / `lexWhere`.
- `/:id/copies/public` (`:129`): add `resolveSchoolScope`; after the existing book-existence read, call `bookAccess.isPhysicalBookAccessible(req.schoolScope, bookId)` (import from `../features/organization`) and return the same 404 "Book not found" when not accessible.

### 3.4 `server/features/organization/bookAccess.service.js` — strict lock-down flag

At module scope: `const STRICT_BOOKS = process.env.ORG_STRICT_BOOKS === "true";` (default false).

In **both** `physicalBookScopeSql` and `lexoraBookScopeSql` (`:24-65`): when `STRICT_BOOKS` is true and the caller is scoped, emit the fragment **without** the `NOT EXISTS (SELECT 1 … WHERE a.book_id = b.id)` / `… a.lexora_book_id = lb.id` fallback branch — keeping only the `EXISTS (assignment → category → department → school AND dept match)` branch. Params unchanged (`[schoolId, departmentId, departmentId]`). Add a comment stating the lock-down rule: enable only after all books are assigned (bulk assignment by filter exists for exactly this), because strict also hides unassigned books from admins.

### 3.5 Frontend — no changes

`LexoraBooksCatalog.jsx` / `LexoraBookDetails.jsx` render server results as-is. The landing-page anonymous flow is unchanged.

## 4. Security Concerns

- **Closes the browse/metadata leak:** a logged-in student can no longer enumerate or view out-of-department books on either book type — catalog, details, public-search, copies.
- **No existence leak:** every rejection reuses the model's existing 404 "Book not found" shape, indistinguishable from an unknown id — consistent with the reader/bookmarks/progress/media surfaces.
- **Anonymous surface preserved:** visitors without a session keep the current public catalog/search product behavior (approved decision); only authenticated scoped callers are filtered.
- **Residual, documented:** with `ORG_STRICT_BOOKS` off (default), books with **no** assignment remain visible school-wide until assigned — the plan's transitional fallback. The switch completes the lock-down.
- **Not in this plan (tracked separately):** `bulkLexoraImport` ISBN-match updates across schools (previous follow-up item).

## 5. Performance Concerns

- The catalog/detail queries gain the same `EXISTS` subqueries the reader already runs — indexed lookups on the small assignment tables; the list query already LEFT JOINs the assignment summary, so no new per-row cost.
- `resolveSchoolScope` on public routes costs **zero** DB queries for anonymous callers (early return when no session user, `schoolScope.js:25-29`) and one indexed `users` lookup for logged-in callers — the same cost the reader route already pays.
- `public-search` remains `LIMIT 50` per source; two extra subqueries over ≤50 rows.

## 6. Task Checklist (High → Medium → Low)

### HIGH — close the reported leak
- [ ] `lexoraBooksRoutes.js`: `resolveSchoolScope` + `scope` on `/public` and `/public/:id`
- [ ] `LexoraBook.js`: `getPublic` threads `filters.scope` into `getAll`
- [ ] `books.js`: scope `/public-search` (both queries, alias `lexora_books lb`) and `/:id/copies/public` (`isPhysicalBookAccessible` → 404)

### MEDIUM — lock-down switch + verification
- [ ] `bookAccess.service.js`: `ORG_STRICT_BOOKS` flag drops the `NOT EXISTS` fallback in both fragments
- [ ] Student (School A / Dept 1) catalog: only Dept-1-assigned books listed; a Dept-2 book is absent from search results too
- [ ] Student direct API: `GET /lexora-books/public?search=<Dept-2 title>` does not return it; `/public/:id`, `/:id/reader`, bookmarks, progress all 404 for it
- [ ] Anonymous: catalog + public-search unchanged (all public books)
- [ ] Regression: super_admin and legacy unassigned callers unchanged on every surface; admin lists unchanged; existing unit tests green

### LOW — operations
- [ ] After bulk-assigning existing books, set `ORG_STRICT_BOOKS=true` and restart to complete the lock-down
- [ ] `bulkLexoraImport` cross-school ISBN-match remains open as its own item

## 7. Acceptance

Given a student user in School A / Department 1 and a book whose only assignment is a category in School A / Department 2:

1. The student's catalog (`GET /api/lexora-books/public`, including via search) does not list it.
2. The student's details page (`GET /api/lexora-books/public/:id`) returns 404.
3. The reader, bookmarks, and progress endpoints return 404 (already enforced — regression check).
4. `GET /api/books/public-search` and `/api/books/:id/copies/public` do not expose it to the student.
5. An anonymous visitor's catalog/search is byte-identical to today.
6. A super_admin and a School A / Dept 1 admin see the book exactly as today.
7. With `ORG_STRICT_BOOKS=true` (after migration), unassigned books also disappear for scoped callers; with it off, current fallback behavior is preserved.
