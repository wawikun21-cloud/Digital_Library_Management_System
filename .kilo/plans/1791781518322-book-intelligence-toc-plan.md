# Book Intelligence — Automated Page Detection + AI TOC Generation (Architecture Review)

**Scope:** `client/src/features/lexora-books/` + `server/`
**Status:** Review only — no code written.
**Question answered:** *Is it possible to integrate AI to auto-detect pages and create a TOC?* — **Yes.** Below is the verified current state, the options with trade-offs, and a recommended phased architecture.

---

## 1. Verified current state (read-only investigation)

### How the TOC works today
| Layer | Mechanism | File |
|---|---|---|
| DB | `lexora_books.table_of_contents` JSON `[{title, page_number}]` | `server/config/db.js:582`, `server/models/LexoraBook.js:89` |
| Admin input | manual entry list, client + server validation | `LexoraBookFormModal.jsx:278-294`, `LexoraBook.js:_validateTableOfContents` |
| Reader | DB value → else PDF outline (`pdfDoc.getOutline()`) → else `Page 1…N` | `LexoraBookReader.jsx:120-131`, `FlipbookReader.jsx:57-76`, `utils/pdfRenderer.js:getPdfTableOfContents` |

**The real gap:** PDFs with no embedded outline (extremely common for exports/scans) degrade to a useless "Page 1, Page 2…" list, and image-source books never get a real TOC. That is the problem worth solving — not "AI for its own sake".

### Page detection today
- Reader learns `totalPages` client-side from pdf.js at runtime (`FlipbookReader` init).
- Server sets `total_pages` **only for image books** (`lexoraController.js:440,721`) and clears it when a PDF is removed (`:570`). **`uploadBookPdf` (`:518-559`) never sets `total_pages`** — so for PDF books the column is whatever an admin typed, or NULL. A server-side PDF pass fixes this as a by-product.

### Infrastructure facts that constrain the design
- `@google-cloud/vision@^4.3.2` is in `server/package.json` but **used nowhere** (available OCR path for scanned books, currently unconfigured).
- **No job queue / cron usage** (only a WebSocket ping interval). Routes are synchronous Express.
- Newer server modules follow `server/features/<name>/<x>.{routes,controller,service,repository}.js` (courses, users, portal, tools, roles). Legacy lexora lives in `server/models` + `server/routes` + `server/controllers`.
- Migrations folder exists: `server/migrations/`.
- Rate limiting middleware already exists (`express-rate-limit` in deps).

---

## 2. Options considered

| # | Approach | Cost | Latency/book | Accuracy | Data egress | Verdict |
|---|---|---|---|---|---|---|
| A | **Font-metric heuristics** (pdf.js text items carry font size/weight; outliers are headings) | $0 | 1–5 s | Good on text PDFs, poor on scans | none | **Phase 1 — recommended first** |
| B | **LLM refinement** (condensed page starts → provider → strict JSON `[{title, page_number}]`) | ~$0.001–0.02 | 5–30 s | Best — understands semantics, fixes numbering, handles front-matter offset | **book text leaves the server** | Phase 2 — opt-in per book |
| C | **Cloud OCR** (`@google-cloud/vision`, already a dep) then A or B | ~$1.50/1k pages | slow (per page) | Only path for scanned/image books | images leave the server | Phase 3 — only if real scanned books exist |
| D | Client-side AI in the browser (keys in frontend) | — | blocks reader UI | — | keys leak | **Rejected** — security + UX |
| E | Local model in Node (`transformers.js`) | infra | minutes on CPU | — | none | **Rejected** — oversized for this system |

**A is not "AI" but is the correct first step:** it is what real TOC extractors do, needs no accounts, no keys, no egress, and answers 80% of cases. B is the semantic upgrade for messy books, gated behind an explicit disclosure so the institution decides whether book content may go to a provider (supporting a self-hosted/local endpoint keeps everything in-house).

---

## 3. Architecture impact

- New server feature module `server/features/book-intelligence/` (routes/controller/service/repository + two pure modules), following the established newer pattern. Legacy lexora modules untouched.
- New endpoints (all permission-gated `manage_lexora_books`):
  - `POST /api/lexora-books/:id/toc/generate` → `{ entries, method: "heuristic" | "ai", warnings }`
  - `POST /api/lexora-books/:id/toc/regenerate` (optional Phase 2, `{ mode: "ai" }`)
- Client: one API function + a **"Detect TOC" button in the existing admin form** that fills the *existing editable TOC list* for review — humans stay in the loop. **Zero changes to the reader UI path** (it already prefers the DB value).
- No auto-trigger on upload in Phase 1 (no queue exists); the admin action is the trigger. Background/auto generation is a later phase once a job runner exists.
- PDF parsing needs a server-side library (`pdf-parse` or `pdfjs-dist` legacy build) — the only new dependency in Phase 1.

---

## 4. Database changes

- **Core feature: none.** `table_of_contents JSON` already stores exactly `[{title, page_number}]` and is already validated.
- **Recommended additive** (one migration in `server/migrations/`):
  - `toc_source ENUM('manual','detected','ai') NOT NULL DEFAULT 'manual'`
  - `toc_detected_at DATETIME NULL`
  - Purpose: provenance — regeneration must never silently clobber a human-curated TOC, and the admin can see how an entry was produced.
- `total_pages` for PDF books gets backfilled by the same generation pass (`doc.numPages`), which also unblocks the existing TOC page-range validation.

---

## 5. Files affected (if approved)

**Server — new (`server/features/book-intelligence/`)**
```
toc.routes.js          // POST /:id/toc/generate + rate limit + permission
toc.controller.js      // parse request, call service, respond
toc.service.js         // orchestrate: extract → detect → (AI) → validate → persist
toc.repository.js      // read PDF from disk, persist via LexoraBookModel.update
toc.extract.js         // per-page text + font metrics (new PDF dependency)
toc.detect.js          // pure heading detector (font-size outliers, "Chapter N", numbered patterns)
toc.ai.js              // provider-agnostic LLM client, env-configured, fail-open (Phase 2)
toc.validation.js      // clamp/limit/sanitize model output before it reaches the DB
toc.test.js            // node --test, server/tests/ convention
```
**Server — modified:** `server/index.js` (mount routes), `server/migrations/<n>_toc_provenance.sql` (Phase 1 optional columns).

**Client**
```
features/lexora-books/api/lexoraBooksApi.js     // + generateBookToc(bookId, { mode })
features/lexora-books/components/LexoraBookFormModal.jsx  // "Detect TOC" button + generating state
```

---

## 6. Security concerns

1. **API keys never reach the browser.** All provider calls are server-originated, outbound-only, from env config. No client endpoint, no proxying of text to the client before the call.
2. **Book text is untrusted input to an LLM** → prompt-injection surface (a crafted PDF can try to steer output). Mitigations: strict JSON-schema validation, page numbers clamped to `[1, total_pages]`, titles sanitized + length-capped (reuse the model's existing `sanitize()`), de-duplication, and — critically — **the output may only ever be written to `table_of_contents`**, never interpreted or executed. A failed/invalid AI response falls back to heuristic entries; it never half-writes.
3. **Third-party content egress is a policy decision, not just an engineering one.** Book text (potentially copyrighted textbooks) would leave the institution. Requirements: opt-in per book, an explicit UI disclosure of the destination provider, and support for a self-hosted/local LLM endpoint so deployments can keep data in-house. If the school cannot accept egress, Phase 1 alone fully satisfies the feature.
4. **Abuse/cost controls:** permission gate `manage_lexora_books`, per-user rate limit, only when `source_type = 'pdf'` and the file exists on disk, and an idempotency guard (no concurrent generation for the same book — in-process mutex).
5. **Resource caps:** reuse the existing multer size limits; cap pages scanned and text bytes sent to the model; never log book content or API keys.
6. OCR (Phase 3) would additionally need `GOOGLE_APPLICATION_CREDENTIALS` handling — currently unconfigured, so nothing ships by accident.

## 7. Performance concerns

- **Extraction cost:** parsing + per-page `getTextContent` on a 500-page PDF ≈ 1–5 s CPU in Node. Acceptable for an admin-triggered action; cap the scan window (TOC candidates usually live in the first ~150 pages) and serialize per book.
- **LLM latency:** 5–30 s → the admin button needs an explicit "Generating…" state with a generous timeout; never run this on the reader path.
- **Prompt size:** send condensed candidates (page-opening lines + font-size outliers, tens of KB), not raw full text, to keep latency/cost flat regardless of book length.
- **Reader path unaffected:** the flipbook already reads the stored TOC; generation happens once, in the admin flow, and is cached in the DB. No extra work per reader.
- **Memory:** one PDF in memory at a time per generation request; the in-process mutex prevents concurrent parse spikes.

---

## 8. Recommended phasing

| Phase | Contents | Effort | Cost/egress |
|---|---|---|---|
| **1 — Detect (no AI)** | server extraction + font-metric heuristics + `total_pages` backfill + "Detect TOC" admin button feeding the existing editable list | ~1–2 days | $0, no egress, no keys |
| **2 — AI refinement (opt-in)** | provider-agnostic LLM client, `toc_source='ai'`, per-book opt-in + disclosure, fail-open to heuristic | ~1 day + provider setup | pennies/book, **egress** |
| **3 — Scanned books (only if needed)** | OCR via the already-installed `@google-cloud/vision` for image-source books, then reuse Phase 1/2 | ~2–3 days | ~$1.50/1k pages, egress |

**Recommendation:** build Phase 1 now and evaluate accuracy on the real book collection before spending a cent on Phase 2. This is also the honest answer to "can we integrate AI": yes — but the highest-ROI version of this feature is a deterministic extraction pass with AI as an opt-in enhancement, not an AI-only pipeline.

---

## 9. Implementation status — Phase 1 SHIPPED

**Decision change from the review (improvement):** the endpoint is **read-only** — it proposes entries and the detected page count; the librarian reviews them in the existing book form and saves through the existing validated update path. This removes the clobber risk entirely, so **no provenance migration and no DB change were needed** (`toc_source`/`toc_detected_at` are deferred until something auto-persists).

### Delivered
```
server/features/book-intelligence/
├── toc.extract.js      pdfjs (legacy Node build) → per-page text lines with font metrics
├── toc.detect.js       pure heading detector: patterns + font-size outliers + running-head
│                       furniture filter + dense "book's own TOC page" skip + wrapped-heading merge
├── toc.validation.js   pure output gate: clamp, drop out-of-order/duplicates, cap, warn
├── toc.service.js      orchestration + error mapping (read-only proposal)
├── toc.repository.js   traversal-safe PDF path resolution; persistence stays in LexoraBookModel
├── toc.controller.js   thin
└── toc.routes.js       POST /api/lexora-books/:id/toc/generate (requireAuth + manage_lexora_books)
server/tests/bookIntelligenceToc.test.js      20 tests, hermetic (no DB)
client/src/features/lexora-books/
├── components/BookTocEditor.jsx       TOC section + "Detect headings from PDF" button
├── components/FormControls.jsx        Field/IconBtn/inputCls (extracted from the modal)
├── hooks/useBookTocDetection.js       detection state + API call
└── components/LexoraBookFormModal.jsx 915 → 812 lines (feature added, file shrank)
client/src/services/api/lexoraBooksApi.js     + generateBookToc(id)
server/package.json                            + pdfjs-dist@^4.10.38
```

### Measured on the real sample book (262 pages)
120 entries detected in ~4–7 s; running book title, duplicate chapter running-heads and bare "CHAPTER" lines all filtered; the book's own contents page skipped; `total_pages` backfilled via the response.

### Verification
- Server: 20/20 new tests pass (incl. HTTP-level route tests with stubbed auth). Full server suite 49/51 — the 2 failures are pre-existing DB-dependent course tests.
- Client: build ✓, 111/111 tests ✓.
- Zero recurring cost, zero external calls, no DB migration, one dependency added.

### Deferred (unchanged from the review)
Phase 2 (LLM refinement, opt-in) and Phase 3 (OCR via the already-installed `@google-cloud/vision`) plus the provenance columns for when something auto-persists.
