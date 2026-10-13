# Plan: Per-Book Reader Copy/Screenshot Settings (Lexora Flipbook)

## Goal

Let the creator of a Lexora book control whether **students can copy page text** and **save screenshots** from the flipbook reader. Setting is stored per book, defaults to *allowed* (current behavior), and is enforced in the reader UI.

## Current Architecture (verified)

| Layer | File | Notes |
|---|---|---|
| Storage | `server/config/db.js` `initDatabase()` + `migrateSchema()` | `lexora_books` is created minimal; **all flipbook columns arrive via idempotent `ALTER TABLE` entries in `migrateSchema()`** (duplicate-column errors 1060 tolerated by the loop). `server/migrations/add_lexora_flipbook_schema.sql` mirrors the same DDL for deploy-only-migration installs. |
| Model | `server/models/LexoraBook.js` | `_sanitizeBookData()` is an **explicit allowlist** — destructured fields only, `...rest` is dropped. `create()` builds an explicit INSERT; `update()` merges `existing.data + body` then builds a dynamic SET clause, so any sanitized field persists automatically. |
| API | `server/routes/lexoraBooksRoutes.js` | `GET /:id/reader` returns an **explicit field list** ("reader must never receive internal columns"). Create/update pass `...req.body` straight to the model. |
| Media access | `server/middleware/lexoraMediaAccess.js` | PDF/page images are already session-gated (public/manager/owner) with a 10s decision cache. This feature must not weaken that. |
| Reader UI | `client/src/features/lexora-books/pages/LexoraBookReader.jsx` → `flipbook/FlipbookReader.jsx` | Reader payload → props. **`FlipbookReader` has exactly one consumer**, so new props default to current behavior. |
| Copy/capture | `flipbook/FlipbookCapturePanel.jsx`, `hooks/usePageText.js`, `hooks/usePageScreenshot.js`, `utils/clipboardUtils.js`, `utils/pageCapture.js` | Fully built already; toolbar "Camera" button (`FlipbookToolbar.jsx`) is **always visible** today. Panel visibility via `hooks/useFlipbookPanels.js`. |
| Creator UI | `components/LexoraBookFormModal.jsx` (**812 lines — already over the 400-line review trigger**) | Tabbed `SECTIONS`, one flat `form` object submitted as-is. New UI must go in its own component file, not grow this file. |

## Design Decisions

1. **Two boolean columns, not a JSON blob.** Matches the table's existing flat-column style (`visibility`, `status`, `is_deleted`). No JSON parsing at every read site, no new indexes, no filters on these columns.
2. **Default `1` (allowed).** Preserves existing behavior for every current book; creators opt out per book. Migration is therefore non-breaking and needs no data backfill.
3. **Server is the single source of truth for the stored value.** The reader endpoint returns the flags; the client never invents a default that contradicts them.
4. **Enforcement is UI-level deterrent, not DRM.** See Security — in-browser copy/screenshot blocking cannot be made reliable. The setting removes the app's own affordances and communicates the restriction.
5. **Managers bypass the restriction.** Users with `manage_lexora_books:edit` (admin/librarian/super_admin) keep full copy/capture so they can inspect and manage their books. Bypass decision lives in one pure helper.
6. **`FlipbookReader` stays generic.** Gating arrives via props (`allowTextCopy`, `allowScreenshot`, both default `true`), so the component keeps zero knowledge of Lexora books.

## Database Changes

`server/config/db.js` → `migrateSchema()` (append near the other `lexora_books` ALTERs):

```sql
ALTER TABLE lexora_books ADD COLUMN allow_text_copy TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE lexora_books ADD COLUMN allow_screenshot  TINYINT(1) NOT NULL DEFAULT 1;
```

Mirror the same two statements in `server/migrations/add_lexora_flipbook_schema.sql` (its header requires keeping it in sync with db.js).

No new tables, no indexes, no backfill. For Hostinger phpMyAdmin-only deploys, the two statements above can be pasted directly — but a normal server boot applies them itself (idempotent).

## Files Affected

### Backend (4)

| File | Change |
|---|---|
| `server/config/db.js` | Two idempotent `ALTER TABLE lexora_books ADD COLUMN …` entries in `migrateSchema()`. |
| `server/migrations/add_lexora_flipbook_schema.sql` | Mirror the two ALTERs. |
| `server/models/LexoraBook.js` | `_sanitizeBookData()`: destructure `allow_text_copy`, `allow_screenshot` and normalize to `1`/`0` (only explicit `false`/`0`/`"false"`/`"0"` disable; missing ⇒ default `1`). Add both to the `create()` INSERT column list + params. `update()` needs no change (dynamic SET from sanitized merged data). |
| `server/routes/lexoraBooksRoutes.js` | `GET /:id/reader`: add `allow_text_copy: book.allow_text_copy === 1` (same for screenshot) to the explicit payload — convert to booleans once at the boundary so the client does no casting. |

### Frontend (7)

| File | Change |
|---|---|
| `flipbook/FlipbookReader.jsx` | New props `allowTextCopy = true`, `allowScreenshot = true`. Pass both to `FlipbookCapturePanel`; pass derived `canCapture = allowTextCopy \|\| allowScreenshot` to the toolbar. |
| `flipbook/FlipbookToolbar.jsx` | New prop `canCapture = true`; hide the Camera button when false. |
| `flipbook/FlipbookCapturePanel.jsx` | Accept both flags. Per-section: if text copy is off, show a short "disabled by the book's creator" note instead of the text section; if screenshot is off, same for the screenshot section. Do not call `usePageText`/`usePageScreenshot` for a disabled action. |
| `features/lexora-books/utils/readerPermissions.js` (**new**, pure) | `resolveReaderPermissions({ allowTextCopy, allowScreenshot, canManage })` → effective flags. Manager bypass lives here and nowhere else. Unit-testable. |
| `features/lexora-books/pages/LexoraBookReader.jsx` | Read the two flags from the reader payload; call the helper with `canManage = hasPermissionAction("manage_lexora_books", "edit")`; pass results to `FlipbookReader`. |
| `features/lexora-books/components/LexoraBookReaderSettings.jsx` (**new**) | Creator-facing UI: two toggle rows with one-line explanations. Presentation only — `value`/`onChange` via props. Keeps `LexoraBookFormModal.jsx` from growing. |
| `components/LexoraBookFormModal.jsx` | `SECTIONS` += `{ id: "reader", label: "Reader settings" }`; `EMPTY_FORM` += the two flags `true`; map from `book` in the init effect (default `true` when null); render the new component inside the existing local `<Section id="reader" …>`; add `reader: true` to the `done` map. ≈15 lines. |

No client API-layer change: `fetchLexoraBookReader()` already returns the whole payload; normalization happens once in the route.

## Security Concerns

- **This is a deterrent, not DRM — state this plainly to stakeholders.** The PDF is already in browser memory once rendered (pdf.js); the panel toggle only removes the app's own copy/screenshot affordances. Browser devtools, the network tab, and OS capture (PrtScn / Snipping Tool / phone camera) are outside a web page's control.
- **No access-control impact.** The flags never touch `status`/`visibility`, never gate the media middleware, and are not consulted by any auth path. `lexoraMediaAccess` + the reader route keep gating file delivery unchanged.
- **Manager bypass is UI-side only.** A student editing client state could re-enable their own panel — same trust class as every other client-side gate in the app (menus, buttons). The stored flags remain the book's truth for everyone else; a server-side "prevent text extraction" is not achievable once the file is delivered.
- **Recommended follow-ups (explicitly out of scope):** (a) render a per-reader watermark (user id) onto pages — the only meaningful screenshot deterrent in a browser; (b) short-lived signed media URLs. Neither is required for this feature to ship.

## Performance Concerns

- Two `TINYINT(1)` columns, zero new indexes, zero new queries (flags ride along on the row already fetched for the reader payload).
- Payload grows by two booleans.
- When a setting disables an action, the corresponding extraction/capture work (pdf text extraction, canvas compositing) never runs — a small saving.

## Implementation Phases

1. **Backend storage + payload** — db.js ALTERs, migration mirror, model sanitize/INSERT, reader payload flags. Verify: `node --check` on changed files; unit test for normalization.
2. **Reader gating** — `readerPermissions.js` helper, `FlipbookReader`/`FlipbookToolbar`/`FlipbookCapturePanel` props, wire in `LexoraBookReader.jsx`. Verify: `npm run build --prefix client`.
3. **Creator UI** — new settings component + form wiring. Verify: client build again.
4. **Tests + regression** — add `server/tests/lexoraReaderSettings.test.js` covering `_sanitizeBookData` normalization (booleans, `"false"`, missing ⇒ default allowed) and the `resolveReaderPermissions` matrix; run `node --test "tests/*.test.js"` (currently 70/70 green) and the client build.

## Acceptance Criteria

- Creator sees a "Reader settings" section with two toggles; saving persists them for the book.
- Student opening a book with text copy off: no "Page text" section (explanatory note), Camera button hidden when both are off.
- Managers (admin/librarian/super_admin) keep both actions regardless of the flags.
- Existing books are unchanged (flags default to allowed) — no behavior change until a creator opts out.
- Reader payload includes the flags as booleans; no internal columns leak.

## Rollout

- Normal deploy: server boot applies the two ALTERs idempotently; `npm run build` for the client; `pm2 restart lexora-server`. No manual SQL required.
- phpMyAdmin-only path: paste the two `ALTER TABLE` statements, then deploy code.
