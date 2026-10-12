/**
 * Orchestration for automatic TOC detection.
 *
 * Read-only by design: it PROPOSES entries and returns them with the
 * detected page count. Persisting stays with the existing book form, which
 * runs the same validation a human edit does. That removes the whole class
 * of "detection overwrote my hand-written TOC" bugs and needs no schema
 * changes or provenance columns.
 */

const repo = require("./toc.repository");
const extract = require("./toc.extract");
const detect = require("./toc.detect");
const validation = require("./toc.validation");

class TocError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** pdf.js throws its own error types; map them to one clear message. */
function mapExtractionError(error) {
  const message = String(error?.message || "");
  if (/InvalidPDF|password|No password|encrypted/i.test(message)) {
    return new TocError(400, "This PDF is invalid or password-protected and could not be read.");
  }
  return new TocError(400, `Could not read this PDF: ${message || "unknown error"}`);
}

/**
 * @param {Object} input
 * @param {number} input.bookId
 * @returns {Promise<{entries: Array, total_pages: number, method: string, warnings: string[], stats: Object}>}
 */
async function generateToc({ bookId }) {
  const book = await repo.getBook(bookId);
  if (!book.success) throw new TocError(404, book.error || "Book not found");

  const record = book.data;
  if (record.source_type !== "pdf" || !record.pdf_url) {
    throw new TocError(400, "Automatic detection needs a PDF source. Add a PDF to this book first.");
  }

  const filePath = repo.resolvePdfPath(record.pdf_url, record.id);
  if (!filePath) {
    throw new TocError(404, "The PDF file is missing from the uploads folder.");
  }

  let extracted;
  try {
    extracted = await extract.extractPdfLines(filePath);
  } catch (error) {
    throw mapExtractionError(error);
  }

  const detected = detect.detectTocEntries(extracted);
  const { entries, warnings, dropped } = validation.sanitizeTocEntries(detected.entries, {
    totalPages: extracted.pageCount,
  });

  // Explain an empty result instead of returning a bare [].
  if (entries.length === 0) {
    if (detected.emptyReason === "no-text") {
      warnings.push(
        "No selectable text was found in the scanned pages — this looks like a scanned or image-only PDF, which needs OCR (not yet enabled)."
      );
    } else {
      warnings.push(
        "No chapter headings were recognised. The PDF may use flat formatting, or its headings may be images."
      );
    }
  }

  // Never hide partial coverage: a large or slow book that hit the scan
  // ceiling or time budget must say so.
  if (extracted.truncated) {
    warnings.push(
      `Only the first ${extracted.pagesScanned} of ${extracted.pageCount} pages were scanned; later pages were not indexed.`
    );
  }

  return {
    entries,
    total_pages: extracted.pageCount,
    method: "heuristic",
    warnings,
    stats: {
      ...detected.stats,
      pagesScanned: extracted.pages.length,
      truncated: extracted.truncated,
      droppedByValidation: dropped,
    },  };
}

module.exports = { generateToc, TocError };
