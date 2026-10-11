# Flipbook: Copy Text & Screenshot — Architecture Review & Implementation Plan

**Feature:** `client/src/features/lexora-books/flipbook/`
**Status:** Review only — no code written yet.
**Backend / DB impact:** none.

---

## 1. What Exists Today (verified by reading the code)

| Fact | Evidence |
|---|---|
| Pages are rendered to `<canvas>` → JPEG blob URL → `<img>`. There is **no text layer**, so native text selection/copy cannot work as-is. | `utils/pdfRenderer.js` (`renderPdfPage`, `canvasToBlobUrl`), `FlipbookPageFlipMode.jsx` (FlipPage renders `<img>`), `FlipbookCSSMode.jsx` |
| The live pdf.js document is already reachable from the reader via `pdfDocRef`. | `FlipbookReader.jsx:44` (`useFlipbookEngine(... pdfDocRef)`), used for search + TOC |
| Text extraction already works — search calls `page.getTextContent()`. | `utils/pdfRenderer.js:182` (`searchPdf`) |
| Panels (Search / TOC / Thumbnails) follow one pattern: a boolean in engine state + mutually-exclusive toggle action + side-panel component. | `hooks/useFlipbookEngine.js` (`showSearch`, `toggleSearch`), `FlipbookSearch.jsx` |
| `.flipbook-root` sets `user-select: none` — selection is actively suppressed. | `styles/flipbook.css:14` |
| Image-source books: pages are cross-origin URLs resolved against the API origin; server CORS is `credentials: true, origin: CLIENT_ORIGIN` for **all** routes incl. `/uploads`. | `LexoraBookReader.jsx:110-116`, `resolveMediaUrl`, `server/index.js:92-96` |
| A shared `Toast` component exists but is **not** wired into the reader. | `client/src/components/Toast.jsx` |
| pdf.js is v4 (`pdfjs-dist@^4.4.168`) — `TextItem.hasEOL` is available for line reconstruction. | `client/package.json` |

**Conclusion:** both features are 100% client-side, zero-dependency additions. The only real design decision is *how* copy/screenshot are triggered and confirmed.

---

## 2. Approaches Considered

### 2A. Native selectable text (pdf.js TextLayer overlay) — REJECTED for now
Render transparent text divs over every page image so users select and `Ctrl+C` like a normal document.

- Pros: real selection UX, future-proof (highlight/notes).
- Cons: must be re-implemented twice (page-flip mode transforms each page inside `react-pageflip`; CSS mode has its own transforms), per-page layout sync with flip animations, ~significant new complexity. It is a rewrite of the page-rendering path, not an add-on.
- Verdict: good *future* phase, not the cheap win the user asked for.

### 2B. Extract → clipboard (pdf.js `getTextContent`) — RECOMMENDED for "Copy"
Reliable, accurate, no text layer needed, matches what search already proves.

### 2C. Canvas re-render → PNG download (pdf.js render at 2×) — RECOMMENDED for "Screenshot"
- PDF books: re-render page(s) fresh at higher scale → true source quality (no JPEG artifacts).
- Image books: load image with `crossOrigin="use-credentials"` → `drawImage` → PNG. Server CORS already permits this (see §1). If a deployment disables CORS on uploads, the panel shows a clear error instead of crashing (canvas-taint guard).

### 2D. DOM capture (html2canvas) — REJECTED
New ~150 KB dependency, breaks in WebGL mode (canvas textures) and during flip animations, tainting edge cases. 2C is strictly better here.

### 2E. Server-side text/screenshot endpoints — REJECTED
Frontend already has pdf.js. A new endpoint duplicates access control and adds attack surface for zero benefit.

### 2F. Trigger UX: side panel (recommended) vs direct toolbar buttons
**Recommended: one side panel** (`FlipbookCapturePanel`), opened from a new toolbar button, mirroring `FlipbookSearch` exactly:
1. Consistent with the 3 existing panels users already know.
2. Gives a *fallback path* when `navigator.clipboard.writeText` is unavailable (insecure context): the text is shown in a selectable readonly textarea — user can select + `Ctrl+C` manually.
3. Keeps `LexoraBookReader.jsx` untouched (self-contained in `FlipbookReader`).
4. Extensible later (copy whole chapter / screenshot range) without another toolbar change.
Direct one-click buttons (copy → toast, camera → PNG) are the cheaper alternative but give no fallback and no feedback space; noted as a fallback design if a panel feels heavy.

**Panel content**
- **Text section** (PDF books only): text of the currently visible spread (joined, page-separated), readonly selectable textarea, `Copy text` button with inline success/error status.
- **Screenshot section** (both source types): `Save spread` (double view) / `Save page` (single view) → PNG at 2×, capped at 3000 px longest side.
- Image-source books: text section shows "Text copy is available for PDF books only." (mirrors how Search is gated by `hasPdf`).

---

## 3. Architecture Impact

- **No new state machine.** One new panel flag `showCapture` follows the existing mutual-exclusion pattern (`toggleCapture` closes the other panels).
- **Layer flow preserved:** Panel (UI) → hooks (state) → utils (pure logic / canvas / clipboard) → pdf.js. No HTTP in the feature; pages come from the already-authenticated PDF/image the user has open.
- **Two review-trigger pre-cleanups** (required by the project's anti-spaghetti rules, see §6 Phase 0):
  1. `useFlipbookEngine.js` is **427 lines** (over the 400 "refactor before adding" line) → extract panel visibility (`showThumbnails/TOC/Search/Capture` + toggles + Escape-close) into `hooks/useFlipbookPanels.js`; engine keeps its public API identical (`{ state, actions, effectiveViewMode, pdfDocRef }`).
  2. `FlipbookToolbar.jsx` is **223 lines** (component review trigger ~250) → extract the page-jump input (own state: `showJumpInput`, `jumpValue`) into `FlipbookPageJump.jsx`, then add the capture button. Net result stays under the trigger.
- `FlipbookReader.jsx` (199) stays composition-only: it computes the visible page list and renders the panel — well under the page trigger.
- **Files affected** (all inside the existing feature; nothing in `components/ui` or global folders):

New:
```
client/src/features/lexora-books/flipbook/
├── FlipbookCapturePanel.jsx        // panel UI (text + screenshot)
├── FlipbookPageJump.jsx            // extracted from toolbar
├── hooks/useFlipbookPanels.js      // extracted from engine
├── hooks/usePageText.js            // text extraction state + per-page cache
├── hooks/usePageScreenshot.js      // capture state → PNG download
└── utils/
    ├── pdfText.js                  // pdfItemsToText() pure formatter (hasEOL-aware)
    ├── pageCapture.js              // canvas composite → PNG blob → download
    └── clipboardUtils.js           // writeText + execCommand fallback
```
Modified:
```
├── utils/pdfRenderer.js            // + getPageText(doc, pageNum) (~15 lines)
├── hooks/useFlipbookEngine.js      // delegate panel state to useFlipbookPanels
├── FlipbookToolbar.jsx             // use FlipbookPageJump + capture button
├── FlipbookReader.jsx              // render FlipbookCapturePanel, compute visible pages
├── index.js                        // export FlipbookCapturePanel
```

### 4. Security
- Nothing leaves the browser: extraction and capture run on content the user is already authorized to load (server-side access control on the PDF route is unchanged and still the gatekeeper).
- **Canvas tainting:** PDF path renders from the same-origin blob pipeline (never tainted). Image path loads with `crossOrigin="use-credentials"` and resolves through `resolveMediaUrl`; server CORS already returns `Access-Control-Allow-Origin: <client origin>` + credentials. If a deployment misconfigures CORS, we detect the failure and surface an error — no `SecurityError` crash, no silent wrong output.
- Clipboard: `navigator.clipboard.writeText` first, `execCommand` fallback, then the manual-select textarea as the last resort. No `innerHTML`, no new deps.
- Download filename is generated (`page-<n>.png` / `spread-<a>-<b>.png`), no user-controlled path.
- No change to auth, sessions, CSRF, or any server file. If the product later wants to *forbid* copying of certain books, the right hook is a server-provided policy flag on the reader payload consumed by `LexoraBookReader` — explicitly out of scope here.

### 5. Performance
- Both actions are **on-demand only** (panel open → click). Zero background cost when unused.
- Text extraction: ~10–50 ms/page; cached in a bounded `Map` (max ~20 pages, FIFO) inside `usePageText`.
- Screenshot: one page render at scale ≈2 (canvas ≤ 3000 px longest side cap) + async `toBlob` ≈ 100–300 ms. Worst-case memory bounded by the cap; the cache is not touched (fresh render, cached JPEG untouched).
- Engine refactor must keep identity stability: merge core + panel state via `useMemo` so unchanged slices don't re-render pages/toolbar (behavior-preserving, same object shape as today).
- Bundle: +0 dependencies; ~6 KB of feature code. `lucide-react` icons already available (`Copy`, `Camera`, `Check`, `AlertCircle`).

### 6. Database changes
**None.** No migrations, no schema, no new endpoints, no server changes of any kind.

---

## 7. Implementation Phases (each independently verifiable)

### Phase 0 — pre-refactors (behavior-preserving, run app after each)
1. `hooks/useFlipbookPanels.js`: owns `showThumbnails/showTOC/showSearch/showCapture` + toggle actions (mutual exclusion) + Escape-to-close. Engine imports it and merges `visibility`/`actions` into its existing `state`/`actions` objects (public API unchanged → reader and panels need no edits).
2. `FlipbookPageJump.jsx`: move the jump-to-page form + `handleJump` + display-page math out of the toolbar (props: `displayPage`, `totalDisplayPages`, `hasCover`, `viewMode`, `onNavigate`).
3. Verify: search/TOC/thumbnails open/close, jump, arrows, Escape — all as before.

### Phase 1 — utils (pure, unit-testable)
4. `utils/pdfText.js` → `pdfItemsToText(items)`: join `item.str`, newline on `hasEOL`, collapse trailing spaces, trim.
5. `utils/pdfRenderer.js` → `getPageText(pdfDoc, pageNum1Based)`: `getTextContent()` + formatter, `page.cleanup()` in `finally`.
6. `utils/clipboardUtils.js` → `copyTextToClipboard(text)`: `writeText` → `execCommand` fallback → boolean.
7. `utils/pageCapture.js`:
   - `capturePdfPages(pdfDoc, pageNumbers, maxDim=3000)` → composite side-by-side at 2× (or fit-to-max) → PNG blob;
   - `captureImagePages(urls, maxDim)` → credentialed `Image` loads → composite → PNG blob;
   - `downloadBlob(blob, filename)` → anchor click + `revokeObjectURL`.

### Phase 2 — hooks
8. `hooks/usePageText.js` — `{ text, loading, error }`, extracts for the given 1-based page list, bounded cache, cancels on change.
9. `hooks/usePageScreenshot.js` — `{ capture(pdfDoc, pages, kind), status, error }`, status `idle|working|done|error`, calls `pageCapture` + `downloadBlob`.

### Phase 3 — UI
10. `FlipbookCapturePanel.jsx` (mirrors `FlipbookSearch` layout: absolute right panel, z-40, theme CSS vars): text textarea + Copy button; screenshot button(s); inline status; notice for image-source books; loading spinner while extracting.
11. `FlipbookToolbar.jsx`: add capture toggle button (visible when book has any pages), title "Copy text & screenshot".
12. `FlipbookReader.jsx`: compute `capturePages` (visible spread: double → `[currentPage, currentPage+1]`, single → `[currentPage]`, clamped/valid only) and render `<FlipbookCapturePanel open={state.showCapture} pdfDocRef={pdfDocRef} imagePages={pages} pageNumbers={capturePages} viewMode={effectiveViewMode} onClose={actions.toggleCapture} />`.
13. `index.js`: export `FlipbookCapturePanel`.

### Phase 4 — verification
14. PDF book: open panel → text matches page; copy → paste elsewhere works; manual-select fallback works; screenshot spread/page downloads correct PNG.
15. Image book: text section shows the notice; screenshot downloads; simulate missing CORS → error shown, no crash.
16. Regression: 3D/CSS modes, single/double, search/TOC/thumbnails still open/close exclusively; Escape; zoom; jump; toolbar idle-hide.
17. Line-count gate: no page >150 extra justification, no file >400, no helpers inside panel file boundaries beyond its own sub-parts.
18. `npm run build` (client) + optional vitest for `pdfItemsToText`.

---

## 8. Recommendation Summary

- Implement **2B + 2C + 2F-panel**: one panel, two capabilities, zero dependencies, zero backend change.
- Defer 2A (TextLayer) to a later epic if real select/highlight UX is ever required.
- Do Phase 0 refactor first: it is required by the repo's own review triggers (engine 427 lines, toolbar 223 lines) and keeps every touched file inside the thresholds after the feature lands.
