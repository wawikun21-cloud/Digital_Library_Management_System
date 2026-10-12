const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const express = require("express");
const test = require("node:test");

const { detectTocEntries } = require("../features/book-intelligence/toc.detect");
const { sanitizeTocEntries } = require("../features/book-intelligence/toc.validation");
const { toLines, extractPdfLines } = require("../features/book-intelligence/toc.extract");
const repo = require("../features/book-intelligence/toc.repository");
const { resolvePdfPath } = repo;
const service = require("../features/book-intelligence/toc.service");

/** Builds the extractor's page shape from plain [text, size] line pairs. */
function pagesFrom(linesByPage) {
  return Object.entries(linesByPage).map(([pageNumber, lines]) => ({
    pageNumber: Number(pageNumber),
    lines: lines.map(([text, size]) => ({ text, size, bold: false, y: 0 })),
  }));
}

const CHAPTER_BOOK = pagesFrom({
  1: [["", 14]],
  2: [["The Ultimate Guide to Digital Marketing", 15], ["The perfect resource", 14]],
  3: [["The Ultimate Guide to Digital Marketing", 15], ["Content matters", 14]],
  4: [["The Ultimate Guide to Digital Marketing", 15], ["Chapter 2: Developing a Content Marketing Strategy", 15], ["Done right, content wins", 14]],
  5: [["The Ultimate Guide to Digital Marketing", 15], ["Chapter 8: Leveraging Conversion Rate Optimization", 15], ["Growth", 15], ["CRO may sound hard", 14]],
  6: [["The Ultimate Guide to Digital Marketing", 15], ["Chapter 9: Measuring What Matters", 15], ["Metrics guide decisions", 14]],
});

test("detects numbered chapter headings and their pages", () => {
  const { entries } = detectTocEntries({ pages: CHAPTER_BOOK });
  assert.deepEqual(
    entries.map((e) => [e.title, e.page_number]),
    [
      ["Chapter 2: Developing a Content Marketing Strategy", 4],
      ["Chapter 8: Leveraging Conversion Rate Optimization Growth", 5],
      ["Chapter 9: Measuring What Matters", 6],
    ]
  );
});

test("ignores the running header that repeats on nearly every page", () => {
  const { entries } = detectTocEntries({ pages: CHAPTER_BOOK });
  assert.ok(
    entries.every((e) => !e.title.includes("Ultimate Guide")),
    "the repeated book title must not become a TOC entry"
  );
});

test("merges a wrapped heading but keeps two short headings separate", () => {
  const pages = pagesFrom({
    1: [
      ["Chapter 8: Leveraging Conversion Rate Optimization", 15], ["Growth", 15],
      ["Body text follows", 14], ["More body", 14], ["Even more body", 14],
    ],
    2: [
      ["Introduction", 15], ["Overview", 15],
      ["Body text here", 14], ["More body", 14], ["Even more body", 14],
    ],
  });
  const { entries } = detectTocEntries({ pages });
  assert.deepEqual(entries.map((e) => e.title), [
    "Chapter 8: Leveraging Conversion Rate Optimization Growth",
    "Introduction",
    "Overview",
  ]);
});

test("ignores a bare part keyword used as a display word", () => {
  const pages = pagesFrom({
    1: [["CHAPTER", 16], ["Chapter 4: The Real One", 15], ["Body", 14], ["Body", 14]],
    2: [["SECTION", 16], ["Body", 14], ["Body", 14]],
  });
  const { entries } = detectTocEntries({ pages });
  assert.deepEqual(entries.map((e) => e.title), ["Chapter 4: The Real One"]);
});

test("keeps only the first occurrence of a repeated chapter running head", () => {
  const pages = pagesFrom({
    7: [["Chapter 3: Launching", 15], ["Body", 14], ["Body", 14], ["Body", 14]],
    8: [["Chapter 3: Launching", 15], ["Body", 14], ["Body", 14], ["Body", 14]],
    9: [["Chapter 3: Launching", 15], ["Body", 14], ["Body", 14], ["Body", 14]],
    10: [["Chapter 3: Launching", 15], ["Body", 14], ["Body", 14], ["Body", 14]],
    11: [["Chapter 3: Launching", 15], ["Body", 14], ["Body", 14], ["Body", 14]],
  });
  const { entries } = detectTocEntries({ pages });
  assert.deepEqual(entries, [{ title: "Chapter 3: Launching", page_number: 7 }]);
});

test("treats a non-chapter line repeated across many pages as a running head", () => {
  const pages = pagesFrom({
    1: [["Deck Subtitle", 15], ["Body", 14], ["Body", 14]],
    2: [["Deck Subtitle", 15], ["Body", 14], ["Body", 14]],
    3: [["Deck Subtitle", 15], ["Body", 14], ["Body", 14]],
    4: [["Deck Subtitle", 15], ["Body", 14], ["Body", 14]],
    5: [["Deck Subtitle", 15], ["Body", 14], ["Body", 14]],
  });
  const { entries } = detectTocEntries({ pages });
  assert.deepEqual(entries, []);
});

test("skips the book's own table-of-contents page (printed page numbers)", () => {
  const tocPage = Array.from({ length: 12 }, (_, i) => [`Chapter ${i + 1}: Title ${i + 1}`, 15]);
  const pages = pagesFrom({
    1: [["Contents", 16]],
    2: tocPage,
    3: [["Chapter 1: Starting Out", 15], ["Body text", 14]],
  });
  const { entries } = detectTocEntries({ pages });
  assert.deepEqual(
    entries.map((e) => [e.title, e.page_number]),
    [["Chapter 1: Starting Out", 3]]
  );
});

test("keeps entries for every page, not just the first 120", () => {
  // Regression: an arbitrary entry cap used to stop detection mid-book,
  // leaving the final third of pages without any entries.
  const pages = Array.from({ length: 150 }, (_, i) => ({
    pageNumber: i + 1,
    lines: [
      { text: `Chapter ${i + 1}: Title ${i + 1}`, size: 15, bold: false, y: 0 },
      { text: "Body text", size: 14, bold: false, y: 0 },
      { text: "More body text", size: 14, bold: false, y: 0 },
    ],
  }));
  const { entries } = detectTocEntries({ pages });
  assert.equal(entries.length, 150);
  assert.equal(entries[149].page_number, 150);
});

test("recognises four-digit chapter and section numbers", () => {
  // Regression: the number classes capped at 2–3 digits, so a volume
  // reaching "Chapter 1000" lost every heading from that page on.
  const pages = pagesFrom({
    999: [["Chapter 999: Title", 15], ["Body", 14], ["Body", 14]],
    1000: [["Chapter 1000: Title", 15], ["Body", 14], ["Body", 14]],
    1001: [["1001. Numbered Section", 15], ["Body", 14], ["Body", 14]],
    1002: [["CHAPTER", 16], ["Chapter 1002: Last", 15], ["Body", 14], ["Body", 14]],
  });
  const { entries } = detectTocEntries({ pages });
  assert.deepEqual(entries.map((e) => [e.title, e.page_number]), [
    ["Chapter 999: Title", 999],
    ["Chapter 1000: Title", 1000],
    ["1001. Numbered Section", 1001],
    ["Chapter 1002: Last", 1002],
  ]);
});

test("indexes a 2,000-page book end to end", () => {
  const pages = Array.from({ length: 2000 }, (_, i) => ({
    pageNumber: i + 1,
    lines: [
      { text: `Chapter ${i + 1}: Title ${i + 1}`, size: 15, bold: false, y: 0 },
      { text: "Body text", size: 14, bold: false, y: 0 },
      { text: "More body text", size: 14, bold: false, y: 0 },
    ],
  }));
  const { entries } = detectTocEntries({ pages });
  assert.equal(entries.length, 2000);
  assert.equal(entries[1999].page_number, 2000);

  const validated = sanitizeTocEntries(entries, { totalPages: 2000 });
  assert.equal(validated.entries.length, 2000);
  assert.deepEqual(validated.entries[1999], { title: "Chapter 2000: Title 2000", page_number: 2000 });
});

test("stops at the wall-clock budget and reports the pages it scanned", async (t) => {
  if (!fs.existsSync(SAMPLE_PDF)) {
    t.skip("sample PDF not present in this checkout");
    return;
  }

  const result = await extractPdfLines(SAMPLE_PDF, { budgetMs: 0 });
  assert.equal(result.pageCount, 262);
  assert.equal(result.truncated, true);
  assert.equal(result.pagesScanned, 1, "a zero budget still scans one page");
});

test("scans past the old 300-page ceiling when the budget allows", async (t) => {
  if (!fs.existsSync(SAMPLE_PDF)) {
    t.skip("sample PDF not present in this checkout");
    return;
  }

  const result = await extractPdfLines(SAMPLE_PDF, { maxPages: 3000, budgetMs: 60000 });
  assert.equal(result.truncated, false);
  assert.equal(result.pagesScanned, 262);
});

test("validation warns instead of hiding entries beyond its ceiling", () => {
  const raw = Array.from({ length: 12 }, (_, i) => ({
    title: `Chapter ${i + 1}`,
    page_number: i + 1,
  }));
  const { entries, warnings } = sanitizeTocEntries(raw, { totalPages: 50, maxEntries: 5 });
  assert.equal(entries.length, 5);
  assert.ok(warnings.some((w) => w.includes("7 more")), "the ignored count must be reported");
});

test("reports no-text for image-only (scanned) documents", () => {
  // A scanned PDF yields pages with no text lines at all.
  const pages = [
    { pageNumber: 1, lines: [] },
    { pageNumber: 2, lines: [] },
  ];
  const { entries, emptyReason } = detectTocEntries({ pages });
  assert.deepEqual(entries, []);
  assert.equal(emptyReason, "no-text");
});

test("reports no-headings for flat text documents", () => {
  const pages = pagesFrom({
    1: [["Just body text at one size", 11], ["More body text", 11]],
    2: [["Still body text", 11]],
  });
  const { entries, emptyReason } = detectTocEntries({ pages });
  assert.deepEqual(entries, []);
  assert.equal(emptyReason, "no-headings");
});

test("validation clamps out-of-range, out-of-order and duplicate entries", () => {
  const { entries, dropped } = sanitizeTocEntries(
    [
      { title: " Chapter One ", page_number: 3 },
      { title: "Chapter One", page_number: 3 },      // exact duplicate
      { title: "Chapter One", page_number: 4 },      // same title, different page
      { title: "Backwards", page_number: 1 },        // out of order
      { title: "Beyond the end", page_number: 999 }, // past totalPages
      { title: "  ", page_number: 5 },               // empty title
      { title: "Half a page", page_number: 2.5 },    // not an integer
    ],
    { totalPages: 20 }
  );
  assert.deepEqual(entries, [
    { title: "Chapter One", page_number: 3 },
    { title: "Chapter One", page_number: 4 },
  ]);
  assert.equal(dropped, 5);
});

test("validation keeps at most maxEntries and warns about the rest", () => {
  const raw = Array.from({ length: 10 }, (_, i) => ({ title: `Ch ${i + 1}`, page_number: i + 1 }));
  const { entries, warnings } = sanitizeTocEntries(raw, { totalPages: 50, maxEntries: 4 });
  assert.equal(entries.length, 4);
  assert.ok(warnings.some((w) => w.includes("6 more")));
});

test("toLines flattens pdf.js items on hasEOL boundaries with metrics", () => {
  const lines = toLines([
    { str: "Chapter 1: Intro", transform: [16, 0, 0, 16, 0, 700], fontName: "ABCDEF+Bold", hasEOL: true },
    { str: "body", transform: [12, 0, 0, 12, 0, 680], fontName: "ABCDEF+Regular", hasEOL: false },
    { str: " text", transform: [12, 0, 0, 12, 0, 680], fontName: "ABCDEF+Regular", hasEOL: true },
  ]);
  assert.deepEqual(lines, [
    { text: "Chapter 1: Intro", size: 16, bold: true, y: 700 },
    { text: "body text", size: 12, bold: false, y: 680 },
  ]);
});

// ── Integration: the real sample book, when present ──────────────
// The repository is stubbed so these run without MySQL; the real PDF on
// disk is still read, extracted and detected end to end.
const SAMPLE_PDF = path.join(
  __dirname, "..", "uploads", "lexora-books", "49", "f78511e6-a980-4287-af09-5fd319bb3aea.pdf"
);
const SAMPLE_PDF_URL = "/uploads/lexora-books/49/f78511e6-a980-4287-af09-5fd319bb3aea.pdf";

function withStubbedBook(bookId, pdfUrl, run) {
  const original = repo.getBook;
  repo.getBook = async () => ({ success: true, data: { id: bookId, source_type: "pdf", pdf_url: pdfUrl } });
  return Promise.resolve()
    .then(run)
    .finally(() => { repo.getBook = original; });
}

test("resolvePdfPath refuses to leave the book's own folder", () => {
  assert.equal(resolvePdfPath("/uploads/lexora-books/49/missing.pdf", 49), null);
  assert.equal(resolvePdfPath("/etc/passwd", 49), null);
  assert.equal(resolvePdfPath("/uploads/lexora-books/49/../../../package.json", 49), null);
});

test("generateToc rejects books without a PDF source", async () => {
  const original = repo.getBook;
  repo.getBook = async () => ({ success: true, data: { id: 7, source_type: "images", pdf_url: null } });
  try {
    await assert.rejects(
      () => service.generateToc({ bookId: 7 }),
      (error) => error instanceof service.TocError && error.status === 400
    );
  } finally {
    repo.getBook = original;
  }
});

test.describe("real sample PDF", () => {
  test("generateToc proposes chapters from the uploaded book", async (t) => {
    if (!fs.existsSync(SAMPLE_PDF)) {
      t.skip("sample PDF not present in this checkout");
      return;
    }

    const result = await withStubbedBook(49, SAMPLE_PDF_URL, () =>
      service.generateToc({ bookId: 49 })
    );

    assert.equal(result.total_pages, 262);
    assert.ok(result.entries.length > 0, "expected chapter headings from a text-based PDF");
    assert.ok(result.warnings.length === 0, `unexpected warnings: ${result.warnings.join("; ")}`);

    const pages = result.entries.map((e) => e.page_number);
    assert.deepEqual(pages, [...pages].sort((a, b) => a - b), "entries must read forward");

    // Regression: detection used to stop at 120 entries around page 119 of
    // this 262-page book, leaving the back half of it unindexed.
    const lastPage = pages[pages.length - 1];
    assert.ok(lastPage >= 250, `entries must reach the final pages (last was ${lastPage})`);

    const titles = result.entries.map((e) => e.title);
    assert.ok(
      titles.every((title) => !title.includes("Ultimate Guide")),
      "the running book title must be filtered out"
    );
    assert.equal(
      new Set(titles.map((t) => t.toLowerCase())).size,
      titles.length,
      "no title may appear twice"
    );
    assert.ok(
      titles.every((title) => !/^(chapter|section|part|unit)\s*[0-9ivxlcdm]*$/i.test(title)),
      "bare part keywords are not entries"
    );
    console.log(
      `[book-intelligence] ${result.entries.length} entries from 262 pages; first: ` +
        titles.slice(0, 3).map((x) => `"${x}"`).join(", ")
    );
  });

test("generateToc reports a missing PDF file as 404", async () => {
  const original = repo.resolvePdfPath;
  repo.resolvePdfPath = () => null;
  try {
    await assert.rejects(
      () => withStubbedBook(49, SAMPLE_PDF_URL, () => service.generateToc({ bookId: 49 })),
      (error) => error instanceof service.TocError && error.status === 404
    );
  } finally {
    repo.resolvePdfPath = original;
  }
});

// ── HTTP layer: the real router with auth swapped for a pass-through ──
// Exercises route registration, the permission middleware chain, the
// controller's status mapping and response shape without a database.

function stubModule(request, exports) {
  const resolved = require.resolve(request);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    children: [],
    paths: [],
    exports,
  };
}

function withRouter(run) {
  const originalAuth = require.cache[require.resolve("../middleware/authMiddleware")];
  const originalRoles = require.cache[require.resolve("../features/roles")];

  stubModule("../middleware/authMiddleware", { requireAuth: (_req, _res, next) => next() });
  stubModule("../features/roles", {
    resolvePermissions: (_req, _res, next) => next(),
    requirePermissionAction: () => (_req, _res, next) => next(),
  });

  const tocRoutes = require("../features/book-intelligence/toc.routes");
  const app = express();
  app.use(express.json());
  app.use("/api/lexora-books", tocRoutes);
  const server = http.createServer(app);

  return (async () => {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      return await run(`http://127.0.0.1:${server.address().port}/api/lexora-books`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      delete require.cache[require.resolve("../features/book-intelligence/toc.routes")];
      if (originalAuth) require.cache[require.resolve("../middleware/authMiddleware")] = originalAuth;
      else delete require.cache[require.resolve("../middleware/authMiddleware")];
      if (originalRoles) require.cache[require.resolve("../features/roles")] = originalRoles;
      else delete require.cache[require.resolve("../features/roles")];
    }
  })();
}

function post(url) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method: "POST" }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body: body ? JSON.parse(body) : {} }));
    });
    request.on("error", reject);
    request.end();
  });
}

test.describe("toc routes over HTTP", () => {
  test("POST /:id/toc/generate returns proposed entries", async (t) => {
    if (!fs.existsSync(SAMPLE_PDF)) {
      t.skip("sample PDF not present in this checkout");
      return;
    }

    const original = repo.getBook;
    repo.getBook = async () => ({ success: true, data: { id: 49, source_type: "pdf", pdf_url: SAMPLE_PDF_URL } });
    try {
      const { status, body } = await withRouter((base) =>
        post(`${base}/49/toc/generate`)
      );
      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.total_pages, 262);
      assert.ok(body.data.entries.length > 0);
      assert.equal(body.data.method, "heuristic");
      assert.equal(body.data.entries[0].title, "What is Digital Marketing?");
      assert.equal(body.data.entries[0].page_number, 2);
    } finally {
      repo.getBook = original;
    }
  });

  test("rejects a book without a PDF with 400", async () => {
    const original = repo.getBook;
    repo.getBook = async () => ({ success: true, data: { id: 7, source_type: "images", pdf_url: null } });
    try {
      const { status, body } = await withRouter((base) => post(`${base}/7/toc/generate`));
      assert.equal(status, 400);
      assert.equal(body.success, false);
      assert.match(body.error, /needs a PDF source/i);
    } finally {
      repo.getBook = original;
    }
  });

  test("returns 404 when the book does not exist", async () => {
    const original = repo.getBook;
    repo.getBook = async () => ({ success: false, error: "Book not found" });
    try {
      const { status, body } = await withRouter((base) => post(`${base}/999999/toc/generate`));
      assert.equal(status, 404);
      assert.equal(body.success, false);
    } finally {
      repo.getBook = original;
    }
  });

  test("returns 404 when the stored PDF is missing from disk", async () => {
    const originalPath = repo.resolvePdfPath;
    const originalBook = repo.getBook;
    repo.getBook = async () => ({ success: true, data: { id: 49, source_type: "pdf", pdf_url: SAMPLE_PDF_URL } });
    repo.resolvePdfPath = () => null;
    try {
      const { status, body } = await withRouter((base) => post(`${base}/49/toc/generate`));
      assert.equal(status, 404);
      assert.match(body.error, /missing from the uploads/i);
    } finally {
      repo.resolvePdfPath = originalPath;
      repo.getBook = originalBook;
    }
  });
});
});
