/**
 * PDF → text lines with font metrics. The only module that touches pdfjs.
 *
 * Reads the PDF from disk, walks its pages once and flattens each page into
 * lines carrying the font size and weight the detector needs. Rendering is
 * never involved — this is text-layer extraction only.
 *
 * pdfjs-dist ships as ESM; the server is CommonJS, so the legacy Node build
 * is loaded through a cached dynamic import. `isEvalSupported: false` keeps
 * untrusted PDFs from executing anything while parsing.
 */

const fs = require("fs").promises;
const path = require("path");

// Scan ceiling for very large documents. PDF uploads are separately capped
// at 50 MB (lexoraUpload.js), so memory is bounded regardless: at ~8 ms and
// ~95 KB per page, 3,000 pages is ~24 s of CPU and fits inside the budget
// below; anything larger is reported as truncated instead of hanging.
const MAX_SCAN_PAGES = 3000;
// Wall-clock ceiling for the scan. A slow or pathological PDF stops early
// and is reported (truncated) rather than blocking the request until the
// proxy times out. Override with TOC_SCAN_BUDGET_MS.
const SCAN_BUDGET_MS = Number(process.env.TOC_SCAN_BUDGET_MS) || 60000;

let pdfjsPromise = null;

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsPromise;
}

/** Flattens pdf.js text items into visual lines with per-line metrics. */
function toLines(items) {
  const lines = [];
  let current = null;

  const flush = () => {
    if (current && current.text.trim()) {
      current.text = current.text.replace(/\s+/g, " ").trim();
      if (current.text) lines.push(current);
    }
    current = null;
  };

  for (const item of items) {
    if (!item || typeof item.str !== "string") continue;

    const y = item.transform?.[5] ?? null;
    if (current && y !== null && Math.abs(y - current.y) > 2) flush();

    if (!current) {
      current = { text: "", size: 0, bold: false, y: y ?? 0 };
    }
    current.text += item.str;
    current.size = Math.max(current.size, Math.abs(item.transform?.[0] ?? 0));
    current.bold = current.bold || /bold|black|semibold|heavy/i.test(item.fontName || "");

    if (item.hasEOL) flush();
  }
  flush();

  return lines;
}

/**
 * @param {string} filePath absolute path to a PDF on disk
 * @param {Object} [options]
 * @param {number} [options.maxPages]      page ceiling (default MAX_SCAN_PAGES)
 * @param {number} [options.budgetMs]      wall-clock ceiling (default SCAN_BUDGET_MS)
 * @returns {Promise<{pageCount: number, pages: Array, truncated: boolean, pagesScanned: number}>}
 */
async function extractPdfLines(filePath, { maxPages = MAX_SCAN_PAGES, budgetMs = SCAN_BUDGET_MS } = {}) {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await fs.readFile(filePath));

  const doc = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: false,
  }).promise;

  try {
    const pageCount = doc.numPages;
    const scanCount = Math.min(pageCount, Math.max(1, maxPages));
    const startedAt = Date.now();
    const pages = [];

    for (let pageNumber = 1; pageNumber <= scanCount; pageNumber += 1) {
      // Checked before each page so a budget of 0 still yields one page.
      if (pages.length > 0 && Date.now() - startedAt >= budgetMs) break;

      const page = await doc.getPage(pageNumber);
      try {
        const textContent = await page.getTextContent();
        pages.push({ pageNumber, lines: toLines(textContent.items || []) });
      } finally {
        page.cleanup();
      }
    }

    return {
      pageCount,
      pages,
      truncated: pages.length < pageCount,
      pagesScanned: pages.length,
    };
  } finally {
    await doc.destroy().catch(() => {});
  }
}

module.exports = { extractPdfLines, toLines, MAX_SCAN_PAGES, SCAN_BUDGET_MS };
