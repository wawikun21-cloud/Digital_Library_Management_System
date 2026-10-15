# Lexora Book Mutation Scope Guards — Implementation Plan

**Feature:** Close the cross-school mutation gap in the digital-book (Lexora) admin surface
**Date:** 2026-10-14
**Context:** Addendum to the School Organization & Access Control plan. Verification of `features/books` + `features/lexora-books` found the read path fully scope-enforced, but **every Lexora mutation handler except `delete`** operates without a school-scope check. This plan applies the recommended fix.

---

## 1. Goal

Every Lexora digital-book mutation must verify that the target book belongs to the caller's school **before** any change, matching the enforcement already present on: the read path (list/detail/reader/pages/bookmarks/progress/media middleware), `deleteLexoraBook`, and the **physical** book controller (`booksController.updateBook` re-reads with `req.schoolScope` → 404).

**Behavior contract (unchanged patterns):**
- Super admin → no scope applied (all books).
- Unassigned school (`school_id NULL`) caller → no scope applied (legacy fallback).
- Out-of-school book → **404 "Book not found"** (never 403 — no existence leak, identical to every other scoped surface).

## 2. Architecture Impact

- **No new feature, no new module.** The fix is entirely inside `server/controllers/lexoraController.js` plus one tiny model helper.
- **Pattern reuse, zero new mechanisms.** Two guards already exist in this controller — `resolveAccessibleBook(req)` (`:113`) and `isBookAccessible(req)` (`:152`) — built on `bookAccess.isLexoraBookAccessible(scope, bookId)`, and `LexoraBookModel.getById(id, { scope })` already applies the predicate and 404s. The mutation handlers simply never called either.
- **Controller-level gate, consistent with physical books.** `Book.js` mutations are gated in the controller (`getById(id, scope)` first), not in the model's `update`; Lexora gets the same shape. (Model-level threading of scope through `LexoraBookModel.update` is optional hardening — listed as non-goal §8.)
- **Read path, public routes, and `lexoraMediaAccess` are untouched** — they verified green.
- **Layer flow preserved:** controller parses → model executes → no new SQL in the controller (the only new SQL is one indexed `SELECT` in the model helper).

## 3. Database Changes

**None.** No new tables, columns, keys, or migrations. `book_category_assignments` / `lexora_book_assignments` and the `org_*` summary columns already exist.

## 4. Files Affected

### 4.1 `server/models/LexoraBook.js` — one new helper (exported)

Page routes `PUT /pages/:pageId` and `DELETE /pages/:pageId` carry no book id, so the parent must be resolved for the scope check. Add next to the other page methods (~after `deleteBookPage`, `:889`):

```js
/**
 * Resolves a page's parent book id — used by page-edit routes that
 * receive only a pageId, so the handler can run the school-scope
 * check against the parent book before mutating anything.
 */
async getPageBookId(pageId) {
  const [rows] = await pool.query(
    "SELECT book_id FROM lexora_book_pages WHERE id = ? LIMIT 1",
    [pageId]
  );
  return { success: true, data: rows[0]?.book_id ?? null };
}
```

Export it in `module.exports` (add `getPageBookId,` — the export list is at `:1083-1124`).

### 4.2 `server/controllers/lexoraController.js` — the fix

**A. Pass scope into the 9 existing unscoped reads** (mechanical — `getById` already supports it):

| Handler | Current (line) | Change to |
|---|---|---|
| `updateLexoraBook` | `getById(req.params.id)` (252) | `getById(req.params.id, { scope: req.schoolScope })` |
| `publishLexoraBook` | `getById(req.params.id)` (301) | same |
| `replaceBookPageImage` | `getById(bookId)` (607) | `getById(bookId, { scope: req.schoolScope })` |
| `uploadBookPdf` | `getById(bookId)` (674) | same |
| `removeBookPdf` | `getById(bookId)` (712) | same |
| `uploadBookCover` | `getById(bookId)` (741) | same |
| `removeBookCover` | `getById(bookId)` (775) | same |
| `uploadBookThumbnail` | `getById(bookId)` (796) | same |
| `uploadBookPages` | `getById(bookId)` (835) | same |

Each of these already returns 404 when the read fails — an out-of-scope book now returns 404 before any file is renamed, stored, or updated.

**B. Add a scoped existence read to the 9 handlers that currently read nothing** — first statement in the `try`, returning 404 "Book not found" when absent/out-of-scope:

| Handler | Line | Insert |
|---|---|---|
| `unpublishLexoraBook` | 344 | scoped read before `update` |
| `archiveLexoraBook` | 358 | scoped read before `update` |
| `restoreLexoraBook` | 369 | scoped read before `update` |
| `setBookCategories` | 518 | scoped read (content-taxonomy write on another school's book must 404) |
| `setBookTags` | 529 | scoped read |
| `getBookPages` | 544 | scoped read (page list leaks media URLs of another school's book) |
| `addBookPage` | 555 | scoped read |
| `reorderBookPages` | 648 | scoped read |
| `getBookStats` | 1025 | scoped read |

**C. Page handlers keyed by `pageId`** — resolve parent, then check, **before** the mutation:

- `updateBookPage` (566): `getPageBookId(req.params.pageId)` → null = 404; then scope check → 404; then update.
- `deleteBookPage` (577): same resolution + scope check **before** `deleteBookPage` — today it deletes first and only then reads `result.data.book_id` (`:581`), i.e. the row would already be gone when a check would run.

**D. Two small shared helpers (DRY — the pattern already exists twice in this file).** Refactor `isBookAccessible(req)` (`:152`) to delegate:

```js
/** True when the book is inside the caller's school scope (or no scope applies). */
async function bookInScope(req, bookId) {
  const { bookAccess } = require("../features/organization");
  const access = await bookAccess.isLexoraBookAccessible(req.schoolScope, bookId);
  return !access.success ? true : access.accessible;
}

/** Loads a book within the caller's school scope. Returns { book } or null
 *  (absent, or another school's — indistinguishable, by design). */
async function loadScopedBook(req, bookId) {
  const result = await LexoraBookModel.getById(bookId, { scope: req.schoolScope });
  return result.success ? result.data : null;
}
```

`isBookAccessible(req)` then becomes `return bookInScope(req, parseBookId(req.params.id))`. The 9 reads in (A) use `loadScopedBook` where a variable name cleanly replaces the old call, or keep the inline `{ scope }` form — implementer's choice, behavior identical.

**E. Nothing else changes:** route guards, permission catalog, response shapes, audit logging, and the media middleware stay as they are.

### 4.3 Frontend (optional, 1 file) — per-book digital assignment UX

`client/src/features/lexora-books/components/LexoraBookFormModal.jsx` — mount the shared control in the existing **Organization** section (`SECTIONS` already defines it, `:37-45`):

```jsx
import { BookCategoryAssignment } from "../../organization";
// inside the organize section, edit mode only (component self-persists):
<BookCategoryAssignment bookId={existingBook?.id ?? null} type="lexora" />
```

The component already handles the `manage_organization` permission gate, the immediate-persist edit mode, and the create-mode pending selection. Digital assignment also remains available from the organization Categories page (`AssignedBooksPanel` / `BulkAssignPanel`) — this adds parity with the physical `BookForm`, it is not a security control.

## 5. Security Concerns

- **Closes the last cross-school write path in the books domain:** a School A admin/librarian (`manage_lexora_books` grants) currently can update, publish, archive/restore, replace taxonomy, and replace PDF/cover/pages/page-images of School B books by ID. After the fix every one of those 404s.
- **No existence leak:** out-of-scope reads return the model's own "Book not found", identical to a nonexistent id — consistent with reader/pages/bookmarks/progress/media behavior.
- **Check-before-side-effect ordering:** file uploads move/rename temp files only after the scoped read succeeds, so a rejected request cannot leave orphaned files (upload handlers already clean up temp files on the 404 paths).
- **`deleteBookPage` ordering flip:** scope check precedes the delete, so a rejected request cannot destroy another school's page row before the check would have run.
- **Defense in depth preserved:** the controller gate mirrors `booksController`; the media middleware independently refuses files, and reader/bookmark/progress endpoints independently assert — a future refactor of one layer cannot silently reopen the hole.

## 6. Performance Concerns

- **Negligible cost:** one extra indexed `getById` (PK + scope subquery on indexed `lexora_book_assignments.category_id`) per mutation request; mutations are rare admin actions. Upload handlers already performed the same unscoped read — the cost is identical, only the WHERE changes.
- `getPageBookId` is a PK lookup on `lexora_book_pages.id`.
- No query-plan changes, no new N+1 patterns, no changes to list/pagination queries.

## 7. Task Checklist (High → Medium → Low)

### HIGH — backend enforcement (one file + one helper)
- [ ] `LexoraBook.js`: add + export `getPageBookId`
- [ ] `lexoraController.js` (A): scope the 9 existing `getById` reads
- [ ] `lexoraController.js` (B): add scoped existence reads to the 9 no-read handlers
- [ ] `lexoraController.js` (C): scope-check `updateBookPage` / `deleteBookPage` via parent resolution (check before delete)
- [ ] `lexoraController.js` (D): add `bookInScope` / `loadScopedBook` helpers; refactor `isBookAccessible` to delegate
- [ ] Verify with the cross-school sweep: School A admin gets 404 on every mutating endpoint below against a School B book (list in §9)

### MEDIUM — verification
- [ ] Syntax check the two modified files
- [ ] Regression: super_admin and unscoped (legacy) callers behave exactly as before on all endpoints (200/expected codes)
- [ ] In-school mutations still succeed for admin/librarian (update, publish, archive, pdf/cover/pages upload, page edit, categories/tags, stats, pages)
- [ ] Existing server unit test suite green

### LOW — optional UX
- [ ] Mount `BookCategoryAssignment type="lexora"` in `LexoraBookFormModal` organize section (edit mode)
- [ ] Manual pass: assign/unassign a digital book from the lexora form; confirm badge updates in `LexoraBookAdminTable`

## 8. Out of Scope (deliberate)

- **`bulkLexoraImport` ISBN-match updates.** A School A admin importing a row whose ISBN matches a School B book would update that book. Identical pre-existing behavior exists in the physical `Book.js` `importWithCopies`; scoping import matching is a behavior change for both book types and deserves its own pass (decide: per-row error vs. create-new). Tracked as a follow-up, not folded into this fix.
- **Threading scope through `LexoraBookModel.update` itself** (the model re-reads unscoped at `:226`). The controller gate is the enforcement point, matching the physical-book pattern; model-level threading is optional hardening.
- **Public catalog browse visibility** (`GET /lexora-books/public` shows public titles to logged-in scoped users; opening any of them is 404'd) — plan-approved "public routes stay public" decision, unchanged.
- Frontend badge rendering, `org_*` summary columns, media middleware, reader path — verified green, untouched.

## 9. Acceptance

Given a School A admin (or librarian) session and a School B book id, **all** of the following must be 404:

`PUT /api/lexora-books/:id` · `POST /:id/publish` · `POST /:id/unpublish` · `POST /:id/archive` · `POST /:id/restore` · `DELETE /:id/pdf` · `DELETE /:id/cover` · `POST /:id/pdf` · `POST /:id/cover` · `POST /:id/thumbnail` · `POST /:id/pages` · `POST /:id/pages/:pageId/image` · `PUT /:id/pages/reorder` · `PUT /pages/:pageId` · `DELETE /pages/:pageId` · `PUT /:id/categories` · `PUT /:id/tags` · `GET /:id/pages` · `GET /:id/stats`

And with a School A book (or super_admin / unscoped caller), all of the above behave exactly as today. `DELETE /api/lexora-books/:id` already enforces scope (model `delete(id, scope)`) — regression-check only.
