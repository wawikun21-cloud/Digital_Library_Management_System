# Book Intelligence — Automatic TOC Detection

Automatic **table-of-contents detection** for Lexora e-books. The server analyses a book's PDF, proposes chapter headings with their page numbers, and a librarian reviews and saves them through the existing book form.

- **Cost to run: $0** — everything happens on your own server. No API keys, no third-party services, no database migration.
- **Replaces:** the "Page 1, Page 2, …" placeholder readers used to get from PDFs without embedded bookmarks.
- **Safety model:** detection is a *proposal*. It never overwrites a hand-written TOC — a librarian confirms, reviews the entries, and saves with the normal form submit.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [How Detection Works](#3-how-detection-works)
4. [API Reference](#4-api-reference)
5. [Permissions & Security](#5-permissions--security)
6. [Frontend](#6-frontend)
7. [Using It (Admin Flow)](#7-using-it-admin-flow)
8. [Testing](#8-testing)
9. [Known Limitations](#9-known-limitations)
10. [Future Phases](#10-future-phases)

---

## 1. Overview

### The problem

The flipbook reader builds its table of contents from three sources, in order:

| Priority | Source | Result for a typical exported PDF |
|---|---|---|
| 1 | `lexora_books.table_of_contents` (manual) | Correct, but someone has to type it |
| 2 | The PDF's embedded outline (`getOutline()`) | **Missing** in most exported/scanned PDFs |
| 3 | Synthetic page list | Useless "Page 1, Page 2, …" navigation |

Books arriving without an embedded bookmark outline fell straight to option 3, and image-source books never had a real TOC at all.

### The fix

A server-side pass that reads the PDF's **text layer with font metrics** and derives headings from typography and naming patterns — the same technique dedicated TOC extractors use. It runs on demand from the admin book form and proposes entries for review.

**Measured on the reference book (262 pages, exported marketing guide):** 261 entries detected in ~4–7 s, with the book's own contents page, running headers, and repeated chapter running-heads all filtered out. Entries run from the first to the **last** page — no coverage cap.

---

## 2. Architecture

New server feature module plus a small client addition; no changes to the reader path.

```
server/features/book-intelligence/
├── toc.extract.js       pdf.js → per-page text lines with font metrics
├── toc.detect.js        pure heading detector
├── toc.validation.js    pure output gate
├── toc.service.js       orchestration + error mapping
├── toc.repository.js    traversal-safe PDF path resolution
├── toc.controller.js    thin request/response mapping
└── toc.routes.js        POST /:id/toc/generate

client/src/features/lexora-books/
├── components/
│   ├── BookTocEditor.jsx        TOC list + "Detect headings from PDF" button
│   └── FormControls.jsx         Field / IconBtn / inputCls (extracted primitives)
├── hooks/
│   └── useBookTocDetection.js   detection state + API call
└── (components/LexoraBookFormModal.jsx — renders BookTocEditor)

client/src/services/api/lexoraBooksApi.js   + generateBookToc(id)
server/tests/bookIntelligenceToc.test.js    20 hermetic tests
```

**Layer flow** (per `ANTI_SPAGHETTI_RULES.md`):

```
BookTocEditor → useBookTocDetection → generateBookToc → HTTP
Route → Controller → Service → { Extract, Detect, Validate } → Repository → (pdf.js, LexoraBookModel)
```

- **Controller** — parses the request, calls the service, maps errors to status codes. Nothing else.
- **Service** — orchestration and error mapping only; the algorithm lives in pure modules.
- **Extract / Detect / Validate** — pure or near-pure modules with no HTTP and no React; each is independently testable.
- **Repository** — owns filesystem access and delegates persistence to the existing `LexoraBookModel`. No raw SQL.

**Dependency:** `pdfjs-dist` (already a client dependency; added to the server for the legacy Node build). Loaded via a cached dynamic `import()` because the server is CommonJS and the library ships as ESM.

---

## 3. How Detection Works

### Step 1 — Extract (`toc.extract.js`)

Loads the PDF with `pdfjs-dist/legacy/build/pdf.mjs` (`isEvalSupported: false`, `useSystemFonts: false`) and flattens each page's text items into lines carrying metrics:

```js
{ pageNumber: 7, lines: [{ text: "Chapter 3: Launching", size: 15, bold: false, y: 412 }] }
```

- Lines are split on pdf.js `hasEOL` markers, with a y-gap fallback (> 2 pt) for producers that omit them.
- `size` is the horizontal transform scale (font size in pt); `bold` is detected from the font name.
- Scans up to the **first 3,000 pages** (measured ≈ 8 ms/page, so a 2,000-page book takes ~16 s). A 60-second wall-clock budget (`TOC_SCAN_BUDGET_MS` to override) stops slow or pathological files early, and `truncated` always reports exactly what was scanned.
- The document is destroyed in a `finally` block, so one large book cannot leak memory across requests.
- PDF uploads are separately capped at **50 MB** (`lexoraUpload.js`), which bounds memory regardless of page count.

### Step 2 — Detect (`toc.detect.js`, pure)

A line becomes a **heading candidate** when any of these hold:

| Signal | Rule |
|---|---|
| Numbered part | `Chapter 3: …`, `Unit 2 …`, `Lesson iv …` — part keyword + number + title |
| Numbered section | `3. Introduction` / `3.2 Handling input`, capped at 70 chars |
| Font size | At least **0.5 pt above the document's median** body size, ≤ 110 chars |
| All-caps title | `INTRODUCTION`-style lines at body size or above |

Four filters keep the output honest:

1. **Running-header furniture** — a line appearing on **≥ 30 % of pages** (or on **≥ 4 pages** when it is not a chapter pattern) is a header/footer, not a heading. Caught on the reference book: the book title repeated on 4 of 262 pages.
2. **Chapter-pattern exemption** — `Chapter 3: …` repeated across its own chapter is a *running head*, not furniture; it is kept and de-duplicated to its **first** appearance (the true chapter start).
3. **The book's own contents page** — a page with **≥ 3 chapter-pattern lines** (or > 8 heading-like lines) is the printed TOC or an index, whose page numbers are printed, not PDF, numbers. Its lines never become entries.
4. **Contents markers and bare keywords** — `Contents`, `Table of Contents`, `Index`, and bare `CHAPTER` / `SECTION 2` lines (no title) are rejected.

**Wrapped headings** (a title that breaks across two lines) are merged when the continuation is short, the same size, not itself a chapter pattern, and the first line is long enough to be a wrap rather than a complete heading.

**Deduplication** is by title: the first occurrence wins, so a chapter repeated as a running head yields exactly one entry at its real start page.

### Step 3 — Validate (`toc.validation.js`, pure)

The last gate before anything reaches the UI or the database:

- Titles trimmed, whitespace-collapsed, capped at 120 chars, minimum 2.
- Page numbers must be safe integers within `[1, total_pages]`; anything beyond the document length is dropped.
- Entries must **read forward** — a page that jumps backwards is dropped as decoration.
- Exact duplicates dropped; output is bounded by a **3,000-entry safety ceiling** that reports how many more it ignored, rather than silently stopping part-way through the book.
- Everything dropped is counted and reported (`droppedByValidation`) — nothing is silently discarded.

### Result quality on the reference book

```
261 entries · 262 pages · median body font 14 pt · 23 running headers filtered
last entry on page 262 (the book's final page)
p2   What is Digital Marketing?
p3   What You'll Learn
p3   Chapter 1: Your Digital Marketing Strategy Template
p7   Chapter 01: Your Digital Marketing Strategy
p9   Step 1: Awareness
…
```

---

## 4. API Reference

### `POST /api/lexora-books/:id/toc/generate`

Proposes a table of contents for a saved book's PDF. **Read-only** — nothing is persisted; the response fills the admin form.

**Headers:** session cookie + `X-CSRF-Token` (as with every other mutating endpoint).

**Success — `200`**

```json
{
  "success": true,
  "data": {
    "entries": [
      { "title": "Chapter 2: Developing a Content Marketing Strategy", "page_number": 4 }
    ],
    "total_pages": 262,
    "method": "heuristic",
    "warnings": [],
    "stats": {
      "textLines": 4574,
      "candidates": 261,
      "medianFontSize": 14,
      "runningHeadersFiltered": 23,
      "pagesScanned": 262,
      "truncated": false,
      "droppedByValidation": 0
    }
  }
}
```

**Errors**

| Status | Cause | Message |
|---|---|---|
| `400` | Book has no PDF source | `Automatic detection needs a PDF source. Add a PDF to this book first.` |
| `400` | PDF invalid or password-protected | `This PDF is invalid or password-protected and could not be read.` |
| `400` | Any other parse failure | `Could not read this PDF: …` |
| `401` | Not signed in | session middleware |
| `403` | Missing `manage_lexora_books` | permission middleware |
| `404` | Book does not exist | `Book not found` |
| `404` | File missing from disk | `The PDF file is missing from the uploads folder.` |

An **empty result is not an error**: the endpoint returns `200` with `entries: []` and an explanatory warning (scanned/image-only PDF, or no recognisable headings) so the UI can say something useful.

**Performance:** one PDF in memory per request, measured at ~8 ms/page (a 2,000-page book ≈ 16 s), with a 60 s scan budget that degrades to a reported `truncated` result rather than a hung request. Safe to retry — the endpoint is idempotent.

---

## 5. Permissions & Security

- **AuthN/Z:** `requireAuth` → `resolvePermissions` → `requirePermissionAction("manage_lexora_books", "edit")` — the same gate as editing a book, because the output feeds the book form. Readers never need a new permission.
- **No secrets, no egress.** The analyzer runs entirely in-process; no provider keys exist and no book content leaves the server. (This is the property that makes Phase 1 free — see §10.)
- **Path safety** (`toc.repository.js`): the stored `pdf_url` must start with `/uploads/lexora-books/`, is reduced to its `basename` (killing `../` traversal), and the resolved path is verified to stay inside the book's own folder before it is opened.
- **Untrusted input:** pdf.js parses with `isEvalSupported: false`; the document is destroyed in `finally`.
- **No destructive writes.** The endpoint cannot modify the book, so there is no clobbering, race, or provenance surface. Applying the proposal is an ordinary validated form submit.
- **Rate/cost abuse** is bounded by the permission gate (admin-only) and the idempotent, read-only design.

---

## 6. Frontend

### `BookTocEditor.jsx`
The table-of-contents section of the book form: the editable entry rows, validation errors, the **Detect headings from PDF** button, and the result note.

- The detect button appears only for an **already-saved book with a PDF** (`canDetect`) — a brand-new book uploads its PDF on first save, so there is nothing to analyse yet.
- Replacing existing entries asks for confirmation first and names the count: *"Replace the current 12 table of contents entries with the detected ones?"*.
- Detection state and messaging live in the hook; the component only renders.

### `useBookTocDetection.js`
Owns `detecting`/`note` state and the API call. Applying a proposal is delegated to `onApply(entries, totalPages)` so the **form stays the single owner of its data** — the detected entries land in `form.table_of_contents`, and the detected page count is written into the form's `total_pages` field (which also arms the existing per-entry page-range validation).

### `FormControls.jsx`
`Field`, `IconBtn` and `inputCls` — form primitives used by both the modal and the new editor. They were extracted out of `LexoraBookFormModal.jsx` (which had grown past the project's 400-line review trigger) so the modal **shrank from 915 to 812 lines while gaining this feature**.

---

## 7. Using It (Admin Flow)

1. Go to **Manage E-Books** and edit a book that has a PDF.
2. Open the **Table of contents** section.
3. Click **Detect headings from PDF** and wait (typically a few seconds).
4. Review the proposed entries — fix a title, remove a false positive, adjust a page number.
5. **Save** the book. The entries persist to `lexora_books.table_of_contents` through the normal validated update, and the reader picks them up immediately.

Books with an embedded PDF outline, and image-source books, keep their existing behaviour — detection only ever fills the editable list.

---

## 8. Testing

```bash
cd server
node --test tests/bookIntelligenceToc.test.js
# or as part of the suite:
node --test
```

**26 tests, hermetic (no database required):**

| Area | Coverage |
|---|---|
| Detector | chapter patterns, four-digit chapter/section numbers, wrapped-heading merge, short headings kept separate, running-header filter, chapter running-head dedupe, contents-page skip, bare keywords, **full-book coverage (no entry-cap truncation)**, **2,000-page books end to end**, scanned vs flat-text empty results |
| Validation | page-range clamping, out-of-order drops, duplicates, entry cap + warning |
| Extractor | line flattening on `hasEOL` boundaries with metrics, **scan budget truncation**, **scan ceiling past the old 300-page limit** |
| Repository | path traversal refusal (`../`, foreign prefixes, missing files) |
| Service | non-PDF rejection, missing file → 404 |
| HTTP routes | `200` with real entries on the sample PDF, `400` non-PDF, `404` unknown book, `404` missing file — via the real router with auth stubbed |
| Integration | the real 262-page sample PDF end-to-end (asserts the reference output, including that entries reach the final pages) |

The repository is stubbed (not a database) for the service and route tests, so they run anywhere, including CI.

---

## 9. Known Limitations

- **Scanned / image-only PDFs** have no text layer — detection returns an explanatory warning instead of entries. OCR is the Phase 3 answer, not a heuristic fix.
- **Formatting-dependent.** Well-structured exports detect reliably; unusual typography (everything one size, headings as images) yields fewer or no candidates. The proposal is always reviewed by a human, and nothing is auto-saved.
- **English part keywords** (`chapter`, `section`, `unit`, …). Numbered patterns are language-neutral; adding other languages means extending `PART_PATTERN`/`BARE_PART_KEYWORD`.
- **First 3,000 pages or 60 seconds, whichever comes first.** Either limit is reported honestly (`truncated: true` plus a warning naming the pages scanned) instead of silently returning partial coverage. In practice the 50 MB upload cap binds first.
- **Page numbers are PDF pages**, not printed page numbers. Front-matter offsets are not inferred.

---

## 10. Future Phases

The seams below are deliberate; none of them require rework of Phase 1.

| Phase | What | Trigger to build it |
|---|---|---|
| **2 — AI refinement (opt-in)** | An LLM reconciles proposals for awkward formatting, normalises heading text, and infers front-matter offsets. Provider-agnostic client in `toc.service.js`, env-configured, **fail-open to heuristics** on any failure. | Phase 1 accuracy proves insufficient on your collection. Costs cents per book and **sends book text to a provider** — an institutional policy decision. A self-hosted endpoint avoids egress. |
| **3 — OCR** | Per-page OCR via the already-installed `@google-cloud/vision` (currently unused) for scanned/image-only books, then reuse Phase 1 detection. | The collection actually contains scanned books. ~$1.50 per 1,000 pages. |
| **Provenance** | `toc_source ENUM('manual','detected','ai')` + `toc_detected_at` columns. | Only needed once something auto-persists a TOC. Phase 1 never writes, so the columns are deliberately absent. |
| **Background generation** | Queue + cron to detect on upload instead of on demand. | A job runner exists (none today). |

---

## Appendix — File Map

| File | Responsibility |
|---|---|
| `server/features/book-intelligence/toc.extract.js` | pdf.js loading, page scan, line + font-metric flattening |
| `server/features/book-intelligence/toc.detect.js` | Heading heuristics, furniture filters, merging, dedupe (pure) |
| `server/features/book-intelligence/toc.validation.js` | Output gate: clamp, order, dedupe, cap (pure) |
| `server/features/book-intelligence/toc.service.js` | Orchestration, error mapping, warnings |
| `server/features/book-intelligence/toc.repository.js` | Safe PDF path resolution; persistence via `LexoraBookModel` |
| `server/features/book-intelligence/toc.controller.js` | Request/response mapping |
| `server/features/book-intelligence/toc.routes.js` | Route + auth middleware chain |
| `client/src/features/lexora-books/components/BookTocEditor.jsx` | TOC section UI + detect action |
| `client/src/features/lexora-books/hooks/useBookTocDetection.js` | Detection state and API call |
| `client/src/features/lexora-books/components/FormControls.jsx` | Shared form primitives |
| `server/tests/bookIntelligenceToc.test.js` | 20 hermetic tests |
