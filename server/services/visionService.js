// ─────────────────────────────────────────────────────────
//  services/visionService.js
//
//  Pipeline:
//    1. POST image → OCR.space API  →  raw text + word blocks
//    2. Parse title + author from text
//    3. Search Open Library first, Google Books as fallback
//    4. Return structured metadata JSON
// ─────────────────────────────────────────────────────────
const axios    = require("axios");
const FormData = require("form-data");

const OCR_API_URL = "https://api.ocr.space/parse/image";
const OCR_API_KEY = process.env.OCR_SPACE_API_KEY || "K85292237988957";

// ── Step 1: OCR via OCR.space ─────────────────────────────

/**
 * Run full-text detection on an image buffer via OCR.space API.
 * @param {Buffer} imageBuffer — raw image bytes
 * @param {string} mimeType    — e.g. "image/jpeg"
 * @returns {{ fullText: string, blocks: Array }}
 */
async function detectText(imageBuffer, mimeType = "image/jpeg") {
  const form = new FormData();
  form.append("file", imageBuffer, {
    filename:    "cover.jpg",
    contentType: mimeType,
  });
  form.append("apikey",            OCR_API_KEY);
  form.append("language",          "eng");
  form.append("isOverlayRequired", "true");
  form.append("detectOrientation", "true");
  form.append("scale",             "true");
  form.append("OCREngine",         "2");

  let response;
  try {
    response = await axios.post(OCR_API_URL, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });
  } catch (err) {
    throw new Error("OCR.space API request failed: " + err.message);
  }

  const data = response.data;

  if (data.IsErroredOnProcessing) {
    const msg = data.ErrorMessage?.[0] || "Unknown OCR.space error";
    throw new Error("OCR.space error: " + msg);
  }

  const pages = data.ParsedResults;
  if (!pages || pages.length === 0) return { fullText: "", blocks: [] };

  const fullText = pages.map((p) => p.ParsedText || "").join("\n").trim();

  const blocks = [];
  for (const page of pages) {
    for (const line of page.TextOverlay?.Lines || []) {
      for (const word of line.Words || []) {
        blocks.push({
          text:   word.WordText,
          width:  word.Width,
          height: word.Height,
          boundingBox: [
            { x: word.Left,              y: word.Top               },
            { x: word.Left + word.Width, y: word.Top               },
            { x: word.Left + word.Width, y: word.Top + word.Height },
            { x: word.Left,              y: word.Top + word.Height },
          ],
        });
      }
    }
  }

  console.log(`✅ OCR.space: detected ${blocks.length} words`);
  return { fullText, blocks };
}

// ── Step 2: Parse title / author ─────────────────────────

/**
 * Heuristically pull title and author from OCR text.
 */
function parseTitleAndAuthor(ocrText) {
  const lines = ocrText
    .split("\n")
    .map((l) => l.replace(/[#*_`~]/g, "").trim())
    .filter(Boolean);

  if (lines.length === 0) return { title: "", author: "" };

  const title  = lines.find((l) => l.length > 3) || lines[0];
  const byLine = lines.find((l) => /^by\b/i.test(l));
  let author   = "";

  if (byLine) {
    author = byLine.replace(/^by\s*/i, "").trim();
  } else {
    const candidates = lines.filter(
      (l) => l !== title && l.length > 2 && l.length < 60
    );
    author = candidates[0] || "";
  }

  return { title, author };
}

/**
 * Return the top N words sorted by visual size (largest = likely title).
 */
function getLargestTextBlocks(blocks, topN = 5) {
  return [...blocks]
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))
    .slice(0, topN)
    .map((b) => b.text);
}

// ── Step 3a: Open Library ─────────────────────────────────

async function searchOpenLibrary(title, author = "") {
  try {
    const q   = encodeURIComponent(`${title} ${author}`.trim());
    const url = `https://openlibrary.org/search.json?q=${q}&limit=1&fields=title,author_name,isbn,first_publish_year,publisher,cover_i,key`;

    const { data } = await axios.get(url, { timeout: 10000 });
    const doc      = data?.docs?.[0];
    if (!doc) return null;

    const thumbnail = doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : "";

    let description = "";
    if (doc.key) {
      try {
        const work = await axios.get(`https://openlibrary.org${doc.key}.json`, { timeout: 8000 });
        const desc = work.data?.description;
        description = typeof desc === "string" ? desc : desc?.value || "";
      } catch (_) {}
    }

    return {
      title:         doc.title                   || title,
      author:        doc.author_name?.join(", ") || author,
      isbn:          doc.isbn?.[0]               || "",
      publishedDate: String(doc.first_publish_year || ""),
      publisher:     doc.publisher?.[0]          || "",
      description,
      thumbnail,
    };
  } catch (err) {
    console.warn("⚠️  Open Library search failed:", err.message);
    return null;
  }
}

// ── Step 3b: Google Books fallback ───────────────────────

async function searchGoogleBooks(title, author = "") {
  try {
    const q   = encodeURIComponent(
      author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`
    );
    const key = process.env.GOOGLE_BOOKS_API_KEY
      ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}`
      : "";
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1${key}`;

    const { data } = await axios.get(url, { timeout: 10000 });
    const info     = data?.items?.[0]?.volumeInfo;
    if (!info) return null;

    const ids  = info.industryIdentifiers || [];
    const isbn =
      ids.find((i) => i.type === "ISBN_13")?.identifier ||
      ids.find((i) => i.type === "ISBN_10")?.identifier || "";

    return {
      title:         info.title                                                  || title,
      author:        info.authors?.join(", ")                                   || author,
      isbn,
      publishedDate: info.publishedDate                                         || "",
      publisher:     info.publisher                                             || "",
      description:   info.description                                           || "",
      thumbnail:     info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
    };
  } catch (err) {
    console.warn("⚠️  Google Books search failed:", err.message);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────

module.exports = {
  detectText,
  getLargestTextBlocks,
  parseTitleAndAuthor,
  searchOpenLibrary,
  searchGoogleBooks,
};