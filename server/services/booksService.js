// ─────────────────────────────────────────────────────────
//  services/booksService.js
//  ISBN regex extraction + Google Books API lookup
//  Includes: retry on 429, smart title cleaning
// ─────────────────────────────────────────────────────────
const axios = require("axios");

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

// ── ISBN regex ───────────────────────────────────────────
const ISBN_REGEX =
  /(?:ISBN(?:-1[03])?:?\s*)?(?=[-\d\sX]{10,17})(?:97[89][-\s]?)?(?:\d[-\s]?){9}[\dXx]/gi;

/**
 * Extract all ISBNs found in a text string.
 */
function extractISBNs(text) {
  const raw = text.match(ISBN_REGEX) || [];
  return raw
    .map((s) => s.replace(/[^0-9Xx]/g, "").toUpperCase())
    .filter((s) => s.length === 10 || s.length === 13);
}

/**
 * Sleep helper for retry delays.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Query Google Books API with automatic retry on 429.
 */
async function queryGoogleBooks(q, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(GOOGLE_BOOKS_API, {
        params: { q, maxResults: 1 },
        timeout: 8000,
      });

      const items = response.data?.items;
      if (!items || items.length === 0) return null;
      return normaliseBook(items[0].volumeInfo);

    } catch (err) {
      const status = err.response?.status;

      if (status === 429) {
        // Rate limited — wait and retry
        const wait = attempt * 2000; // 2s, 4s, 6s
        console.warn(`[Google Books] 429 rate limit — waiting ${wait}ms before retry ${attempt}/${retries}`);
        await sleep(wait);
        continue;
      }

      // Any other error — log and return null gracefully
      console.error(`[Google Books API error] ${err.message}`);
      return null;
    }
  }

  // All retries exhausted
  console.error("[Google Books] All retries failed due to rate limiting.");
  return null;
}

/**
 * Normalise a Google Books volumeInfo into our response shape.
 */
function normaliseBook(volumeInfo) {
  let thumbnail =
    volumeInfo?.imageLinks?.thumbnail ||
    volumeInfo?.imageLinks?.smallThumbnail ||
    "";

  if (thumbnail.startsWith("http://")) {
    thumbnail = thumbnail.replace("http://", "https://");
  }

  return {
    title:         volumeInfo?.title         || "",
    authors:       volumeInfo?.authors       || [],
    publisher:     volumeInfo?.publisher     || "",
    publishedDate: volumeInfo?.publishedDate || "",
    description:   volumeInfo?.description   || "",
    thumbnail,
  };
}

/**
 * Look up a book by ISBN.
 */
async function lookupByISBN(isbn) {
  return queryGoogleBooks(`isbn:${isbn}`);
}

/**
 * Search by title extracted from OCR.
 * Cleans up noise words and punctuation before querying.
 */
async function searchByTitle(titleGuess) {
  // Remove lone punctuation, numbers-only tokens, and very short words
  const cleaned = titleGuess
    .split(/\s+/)
    .filter((w) => w.length > 2 && /[a-zA-Z]/.test(w))  // must have letters
    .filter((w) => !/^[\d\W]+$/.test(w))                  // skip pure numbers/symbols
    .slice(0, 6)                                           // max 6 words
    .join(" ");

  if (!cleaned) return null;

  console.log(`[Google Books] Searching intitle: "${cleaned}"`);
  return queryGoogleBooks(`intitle:${cleaned}`);
}

module.exports = { extractISBNs, lookupByISBN, searchByTitle };