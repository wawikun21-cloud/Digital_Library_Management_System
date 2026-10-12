/**
 * Validation for detected TOC entries. PURE.
 *
 * The detector's output is a proposal; this module is the last gate before
 * anything reaches the database or the UI. It clamps titles and page
 * numbers, drops duplicates and out-of-order noise, and reports what it
 * dropped so the caller can warn the librarian instead of silently
 * "fixing" their data.
 */

const MAX_TITLE_LENGTH = 120;
// Must match toc.detect's ceiling: a safety net, not a coverage limit, so
// 1k–2k page books keep entries for their final pages.
const MAX_ENTRIES = 3000;
const MIN_TITLE_LENGTH = 2;

function sanitizeTitle(raw) {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * @param {Array} raw             candidate entries [{ title, page_number }]
 * @param {Object} options
 * @param {number} options.totalPages  pages in the document (0/unknown → no clamp)
 * @param {number} options.maxEntries
 * @returns {{ entries: Array, warnings: string[], dropped: number }}
 */
function sanitizeTocEntries(raw, { totalPages = 0, maxEntries = MAX_ENTRIES } = {}) {
  const entries = [];
  const warnings = [];
  const seen = new Set();
  let dropped = 0;
  let lastPage = 0;

  for (const item of Array.isArray(raw) ? raw : []) {
    const title = sanitizeTitle(item?.title);
    const page = Number(item?.page_number);

    if (title.length < MIN_TITLE_LENGTH) { dropped += 1; continue; }
    if (!Number.isSafeInteger(page) || page < 1) { dropped += 1; continue; }
    if (Number.isSafeInteger(totalPages) && totalPages > 0 && page > totalPages) { dropped += 1; continue; }

    // Entries must read forward through the book; a page that jumps
    // backwards is mid-page decoration the detector mistook for a heading.
    if (page < lastPage) { dropped += 1; continue; }

    const key = `${title.toLowerCase()}|${page}`;
    if (seen.has(key)) { dropped += 1; continue; }
    seen.add(key);

    entries.push({ title: title.slice(0, MAX_TITLE_LENGTH), page_number: page });
    lastPage = page;

    if (entries.length >= maxEntries) {
      const remaining = raw.length - entries.length;
      if (remaining > 0) warnings.push(`Kept the first ${maxEntries} headings and ignored ${remaining} more.`);
      break;
    }
  }

  return { entries, warnings, dropped };
}

module.exports = { sanitizeTocEntries, MAX_TITLE_LENGTH, MAX_ENTRIES };
