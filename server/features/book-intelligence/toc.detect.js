/**
 * Heading detection from extracted PDF text lines. PURE — no I/O, no pdfjs.
 *
 * Input is the shape toc.extract produces:
 *   { pageCount, pages: [{ pageNumber, lines: [{ text, size, bold }] }] }
 *
 * Signals, strongest first:
 *   1. Numbered part patterns — "Chapter 3: …", "Unit 2 …", "Lesson 1 …"
 *   2. A font size meaningfully above the document's body median
 *   3. Short all-caps title lines at body size or above
 *
 * Two filters keep the output honest:
 *   • Cross-page repetition — a line appearing on most pages is a running
 *     header/footer (book titles!), not a heading.
 *   • Dense heading pages — a page with many big-font lines is the book's
 *     own table of contents or an index, whose "pages" are printed numbers,
 *     not PDF page numbers. Skipped so its lines never become entries.
 *
 * The result is a proposal for a librarian to review, never a final TOC.
 */

// "Chapter 3: Title" / "Unit 2 – Title" / "Lesson iv) Title".
// The number runs to four digits: a long compiled volume can legitimately
// reach "Chapter 1000", and a shorter class fails the word boundary.
const PART_PATTERN = /^(chapter|part|section|unit|lesson|module)\s+(\d{1,4}|[ivxlcdm]{1,7})\b\s*[:.\-–—)]?\s*(.{3,})$/i;
// "3. Introduction" or "3.2 Handling input" (numbered section, not a decimal)
const NUMBERED_PATTERN = /^\d{1,4}(\.\d{1,4})?[.)]?\s+\S.{2,}$/;
// The book's own contents marker is a page heading, never a TOC entry.
const CONTENTS_MARKERS = new Set(["contents", "table of contents", "table of contents page", "index"]);
// A part keyword with no title after it ("CHAPTER", "SECTION 2").
const BARE_PART_KEYWORD = /^(chapter|part|section|unit|lesson|module)\s*\d{0,4}$/;

const MIN_TEXT_LENGTH = 3;
const MAX_TITLE_LENGTH = 110;
const SIZE_MARGIN = 0.5;          // "meaningfully bigger" than the body median
const MERGE_SIZE_TOLERANCE = 1.5; // wrapped heading fragments share a size
const MAX_FRAGMENTS = 2;
const MAX_MERGE_LENGTH = 90;
const FURNITURE_PAGE_SHARE = 0.3; // on >30% of pages → running header/footer
const MIN_FURNITURE_PAGES = 3;
// A non-chapter line repeated on this many pages is a running head, even
// when the book is too short for the percentage rule to fire.
const REPEATED_RUNNING_HEAD_PAGES = 4;
// A page with several chapter-pattern lines is the book's own table of
// contents (chapters start one per page in real books), never entries.
const CHAPTERS_PER_LIST_PAGE = 3;
// …and a page with this many heading-like lines of any kind is an index or
// a "what you'll learn" summary, whose page numbers are printed numbers.
const DENSE_HEADING_PAGE = 8;
// Safety ceiling only — never a coverage limit. Generous enough that a
// 1k–2k page book keeps entries for its final pages; anything beyond it is
// reported as truncated rather than silently dropped.
const DEFAULT_MAX_ENTRIES = 3000;

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Normalized text of lines that repeat across page after page. */
function findRunningFurniture(pages) {
  const pageCount = pages.length;
  const threshold = Math.max(MIN_FURNITURE_PAGES, Math.ceil(pageCount * FURNITURE_PAGE_SHARE));
  const pagesContaining = new Map();

  for (const page of pages) {
    const seenOnPage = new Set();
    for (const line of page.lines) {
      const key = normalize(line.text);
      if (!key || key.length < 3 || line.text.length > 80) continue;
      if (seenOnPage.has(key)) continue; // count a line once per page
      seenOnPage.add(key);
      pagesContaining.set(key, (pagesContaining.get(key) || 0) + 1);
    }
  }

  const furniture = new Set();
  for (const [key, count] of pagesContaining) {
    // "Chapter 3: …" repeating across its own pages is a chapter running
    // head, kept in play and de-duplicated later by title (its first
    // appearance is the chapter's start page). Anything else repeated this
    // often is page furniture: book titles, deck sub-heads, headers.
    if (count < MIN_FURNITURE_PAGES || headingPatternOf(key)) continue;
    if (count >= threshold || count >= REPEATED_RUNNING_HEAD_PAGES) furniture.add(key);
  }
  return furniture;
}

function headingPatternOf(text) {
  if (PART_PATTERN.test(text)) return "part";
  if (NUMBERED_PATTERN.test(text) && text.length <= 70) return "numbered";
  return null;
}

function isHeadingLike(line, medianSize, furniture) {
  if (line.text.length < MIN_TEXT_LENGTH || line.size <= 0) return null;
  const key = normalize(line.text);
  if (furniture.has(key) || CONTENTS_MARKERS.has(key)) return null;
  if (BARE_PART_KEYWORD.test(key)) return null; // "CHAPTER" alone carries no title

  const pattern = headingPatternOf(line.text);
  if (pattern) return { reason: pattern };

  const isShort = line.text.length <= MAX_TITLE_LENGTH;
  const isCapsTitle = /^[A-Z0-9][A-Z0-9\s:'’,&.\-]{5,70}$/.test(line.text) && /[A-Z]{2,}/.test(line.text);
  if (isShort && (line.size >= medianSize + SIZE_MARGIN || (isCapsTitle && line.size >= medianSize))) {
    return { reason: line.size >= medianSize + SIZE_MARGIN ? "size" : "caps" };
  }
  return null;
}

/** Joins wrapped headings ("Chapter 8: Conversion Rate Opti" + "Growth"). */
function canMerge(previousParts, previousSize, candidate) {
  if (previousParts.length >= MAX_FRAGMENTS) return false;
  if (headingPatternOf(candidate.text)) return false;      // a new chapter, not a continuation
  if (candidate.text.length > 40) return false;
  if (Math.abs(previousSize - candidate.size) > MERGE_SIZE_TOLERANCE) return false;

  const joined = previousParts.join(" ");
  if (joined.length < 25) return false;                    // a complete short heading stays alone
  return joined.length + 1 + candidate.text.length <= MAX_TITLE_LENGTH;
}

function detectTocEntries({ pages, maxEntries = DEFAULT_MAX_ENTRIES }) {
  const usablePages = Array.isArray(pages) ? pages : [];
  const allLines = usablePages.flatMap((page) => page.lines || []);
  if (allLines.length === 0) {
    return { entries: [], stats: { textLines: 0, candidates: 0 }, emptyReason: "no-text" };
  }

  const furniture = findRunningFurniture(usablePages);
  const bodyLines = allLines.filter((line) => line.size > 0 && !furniture.has(normalize(line.text)));
  const medianSize = median(bodyLines.map((line) => line.size));

  const entries = [];
  const seen = new Set();
  let candidates = 0;

  const pushEntry = (group) => {
    const title = group.parts.join(" ").replace(/\s+/g, " ").trim();
    if (!title) return;
    // Keyed on the title alone: a chapter heading repeated as a running
    // head on later pages of its chapter is not a new entry — its first
    // appearance is the chapter's start page.
    const key = normalize(title);
    if (seen.has(key)) return;
    seen.add(key);
    candidates += 1;
    entries.push({ title: title.slice(0, MAX_TITLE_LENGTH), page_number: group.pageNumber });
  };

  for (const page of usablePages) {
    let pageHeadings = 0;
    let pageChapters = 0;
    const pageGroups = [];
    let group = null;

    for (const line of page.lines) {
      const heading = isHeadingLike(line, medianSize, furniture);

      if (!heading) {
        // A non-heading line closes the current group — flush it, don't drop it.
        if (group) pageGroups.push(group);
        group = null;
        continue;
      }
      pageHeadings += 1;
      if (headingPatternOf(line.text)) pageChapters += 1;

      if (group && canMerge(group.parts, group.size, line)) {
        group.parts.push(line.text);
        continue;
      }
      if (group) pageGroups.push(group);
      group = { pageNumber: page.pageNumber, size: line.size, parts: [line.text] };
    }
    if (group) pageGroups.push(group);

    // The book's own TOC / an index lists printed page numbers, not PDF
    // pages — its lines must never become entries, so skip dense pages.
    const isListPage = pageChapters >= CHAPTERS_PER_LIST_PAGE || pageHeadings > DENSE_HEADING_PAGE;
    if (!isListPage) pageGroups.forEach(pushEntry);

    if (entries.length >= maxEntries) break;
  }

  return {
    entries: entries.slice(0, maxEntries),
    stats: {
      textLines: allLines.length,
      candidates,
      medianFontSize: Math.round(medianSize * 100) / 100,
      runningHeadersFiltered: furniture.size,
    },
    emptyReason: entries.length ? null : "no-headings",
  };
}

module.exports = { detectTocEntries, normalize };
