// ─────────────────────────────────────────────────────────
//  routes/searchBooks.js
//  GET /api/search-books?title=...&author=...
//
//  Workflow:
//  1. Search Philippine library catalogs (eLib, National Library)
//  2. Search Open Library and Google Books in parallel
//  3. Combine and sort by relevance (exact matches first)
//
//  Output fields:
//    - title, author, publisher, year
//    - library_location (if available)
//    - thumbnail (cover image URL)
//    - source ("Philippine Library", "Open Library", "Google Books")
//    - link (catalog page URL)
// ─────────────────────────────────────────────────────────
const express = require("express");
const axios = require("axios");

const router = express.Router();

// ── Cache for search results (simple in-memory cache) ──
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(title, author) {
  return `${title.trim().toLowerCase()}:${(author || "").trim().toLowerCase()}`;
}

function getCachedResults(key) {
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }
  return null;
}

function setCacheResults(key, results) {
  searchCache.set(key, { results, timestamp: Date.now() });
  // Limit cache size
  if (searchCache.size > 100) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
}

/**
 * Calculate relevance score for a book result
 * Higher score = more relevant (exact match first)
 */
function calculateRelevanceScore(book, searchTitle, searchAuthor) {
  const title = book.title.toLowerCase();
  const author = (book.author || "").toLowerCase();
  const searchTitleLower = searchTitle.toLowerCase();
  const searchAuthorLower = searchAuthor.toLowerCase();
  
  let score = 0;
  
  // Exact title match (highest priority)
  if (title === searchTitleLower) {
    score += 100;
  }
  // Title starts with search term
  else if (title.startsWith(searchTitleLower)) {
    score += 80;
  }
  // Title contains search term
  else if (title.includes(searchTitleLower)) {
    score += 50;
  }
  // Title has all words from search (partial match)
  else {
    const searchWords = searchTitleLower.split(/\s+/).filter(w => w.length > 0);
    const matchedWords = searchWords.filter(word => title.includes(word));
    score += (matchedWords.length / searchWords.length) * 40;
  }
  
  // Author match bonus
  if (searchAuthorLower) {
    if (author === searchAuthorLower) {
      score += 50;
    } else if (author.includes(searchAuthorLower)) {
      score += 30;
    } else if (searchAuthorLower.split(/\s+/).some(word => author.includes(word) && word.length > 2)) {
      score += 15;
    }
  }
  
  // Has thumbnail bonus (more likely to be the right book)
  if (book.thumbnail) {
    score += 5;
  }
  
  return score;
}

/**
 * Sort results by relevance (highest score first)
 */
function sortByRelevance(results, searchTitle, searchAuthor) {
  return [...results].sort((a, b) => {
    const scoreA = calculateRelevanceScore(a, searchTitle, searchAuthor);
    const scoreB = calculateRelevanceScore(b, searchTitle, searchAuthor);
    return scoreB - scoreA;
  });
}

/**
 * Deduplicate results based on title + author similarity
 */
function deduplicateResults(results) {
  const seen = new Map();
  const deduped = [];
  
  for (const book of results) {
    const key = `${book.title.toLowerCase().trim()}|${(book.author || "").toLowerCase().trim()}`;
    
    if (!seen.has(key)) {
      seen.set(key, book);
      deduped.push(book);
    } else {
      // Keep the one that has more information (thumbnail, year, etc.)
      const existing = seen.get(key);
      if (book.thumbnail && !existing.thumbnail) {
        seen.set(key, book);
      }
    }
  }
  
  return deduped;
}

/**
 * Search eLib (Philippine eLibrary) - https://www.elib.gov.ph/
 * Note: eLib may have changed their API - try different endpoints
 */
async function searchELib(title, author = "") {
  try {
    const query = encodeURIComponent(`${title} ${author}`.trim());
    
    // Try different eLib API endpoints
    const endpoints = [
      `https://www.elib.gov.ph/api/v1/resources/search?q=${query}&limit=10`,
      `https://www.elib.gov.ph/api/books/search?q=${query}&limit=10`,
      `https://elib.gov.ph/api/v1/search?q=${query}&limit=10`,
    ];
    
    for (const baseUrl of endpoints) {
      try {
        const { data } = await axios.get(baseUrl, { timeout: 8000 });
        
        // Different APIs may return results in different formats
        const results = data?.data?.results || data?.results || data?.items || [];
        if (results.length > 0) {
          return results.map((item) => ({
            title: item.title || item.book_title || "",
            author: item.authors?.map(a => a.name).join(", ") || item.author || "",
            publisher: item.publisher || "",
            year: item.publication_year || item.year || "",
            library_location: "eLib Digital Library (Philippines)",
            thumbnail: item.cover_image || item.thumbnail || "",
            source: "Philippine Library",
            link: item.url || item.link || `https://www.elib.gov.ph/books/${item.id}`,
          }));
        }
      } catch (e) {
        console.warn(`⚠️  eLib endpoint failed: ${baseUrl}`, e.message);
        continue;
      }
    }
    
    return [];
  } catch (err) {
    console.warn("⚠️  eLib search failed:", err.message);
    return [];
  }
}

/**
 * Search National Library of the Philippines OPAC
 * Note: NLP doesn't have a public API, so we generate search links
 * and try to scrape/search via alternative methods
 */
async function searchNationalLibrary(title, author = "") {
  // Since NLP doesn't have a public API, we'll generate search links
  // and return them as results users can click
  const query = encodeURIComponent(`${title} ${author}`.trim());
  const searchUrl = `https://pnb.nlp.gov.ph/cgi-bin/koha/opac-search.pl?q=${query}`;
  
  // Return a "result" with just the link - user can click to view
  // This is a workaround since there's no public API
  return [{
    title: title,
    author: author,
    publisher: "",
    year: "",
    library_location: "National Library of the Philippines (Manila)",
    thumbnail: "",
    source: "Philippine Library",
    link: searchUrl,
    isSearchLink: true,
  }];
}

/**
 * Search both Philippine libraries
 */
async function searchPhilippineLibraries(title, author = "") {
  // Search eLib
  const elibResults = await searchELib(title, author);
  
  // Combine with National Library search link
  const nlpResults = await searchNationalLibrary(title, author);
  
  // If eLib has results, add NLP as additional option
  if (elibResults.length > 0) {
    return elibResults;
  }
  
  // Return NLP search link if no eLib results
  return nlpResults;
}

/**
 * Search Open Library for multiple books by title/author
 */
async function searchOpenLibraryMultiple(title, author = "", limit = 10) {
  try {
    const q = encodeURIComponent(`${title} ${author}`.trim());
    const url = `https://openlibrary.org/search.json?q=${q}&limit=${limit}&fields=title,author_name,isbn,first_publish_year,publisher,cover_i,key`;

    const { data } = await axios.get(url, { timeout: 10000 });
    const docs = data?.docs || [];

    if (docs.length === 0) return [];

    return docs.map((doc) => {
      const thumbnail = doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : "";
      
      const key = doc.key || "";
      const olid = key.replace("/works/", "");

      return {
        title: doc.title || "",
        author: doc.author_name?.join(", ") || "",
        isbn: doc.isbn?.[0] || "",
        year: doc.first_publish_year ? String(doc.first_publish_year) : "",
        publisher: doc.publisher?.[0] || "",
        library_location: "",
        thumbnail,
        source: "Open Library",
        link: key ? `https://openlibrary.org${key}` : `https://openlibrary.org/search?q=${encodeURIComponent(doc.title)}`,
      };
    });
  } catch (err) {
    console.warn("⚠️  Open Library search failed:", err.message);
    return [];
  }
}

/**
 * Search Google Books for multiple books by title/author
 */
async function searchGoogleBooksMultiple(title, author = "", limit = 10) {
  try {
    const q = encodeURIComponent(
      author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`
    );
    const key = process.env.GOOGLE_BOOKS_API_KEY
      ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}`
      : "";
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=${limit}${key}`;

    const { data } = await axios.get(url, { timeout: 10000 });
    const items = data?.items || [];

    if (items.length === 0) return [];

    return items.map((item) => {
      const info = item.volumeInfo || {};
      const ids = info.industryIdentifiers || [];
      const isbn =
        ids.find((i) => i.type === "ISBN_13")?.identifier ||
        ids.find((i) => i.type === "ISBN_10")?.identifier ||
        "";

      return {
        title: info.title || "",
        author: info.authors?.join(", ") || "",
        isbn,
        year: info.publishedDate ? info.publishedDate.slice(0, 4) : "",
        publisher: info.publisher || "",
        library_location: "",
        thumbnail: info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
        source: "Google Books",
        link: info.infoLink || item.selfLink || "",
      };
    });
  } catch (err) {
    console.warn("⚠️  Google Books search failed:", err.message);
    return [];
  }
}

/**
 * Get thumbnail from fallback source if not available
 */
function enrichWithFallbackThumbnail(book) {
  // If thumbnail is already available, return as-is
  if (book.thumbnail && book.thumbnail.startsWith("http")) {
    return book;
  }
  
  // If no thumbnail and source is "Philippine Library", try Open Library as fallback
  // This is handled at the merge step
  return book;
}

/**
 * Fetch editions from Open Library for a given work key
 * @param {string} workKey - Open Library work key (e.g., "/works/OL123W")
 * @returns {Promise<Array>} - Array of edition objects
 */
async function fetchOpenLibraryEditions(workKey, limit = 10) {
  try {
    const url = `https://openlibrary.org${workKey}/editions.json?limit=${limit}`;
    const { data } = await axios.get(url, { timeout: 10000 });
    
    const entries = data?.entries || [];
    if (entries.length === 0) return [];
    
    return entries.slice(0, limit).map(edition => {
      // Get cover ID from different possible locations
      let thumbnail = "";
      if (edition.covers?.[0]) {
        thumbnail = `https://covers.openlibrary.org/b/id/${edition.covers[0]}-M.jpg`;
      }
      
      // Get ISBNs
      const isbns = edition.isbn_13 || edition.isbn_10 || [];
      
      // Get publish year
      const year = edition.publish_date ? 
        (edition.publish_date.match(/\d{4}/)?.[0] || edition.publish_date) : "";
      
      return {
        title: edition.title || "",
        author: "",
        isbn: isbns[0] || "",
        year,
        publisher: edition.publishers?.[0] || "",
        thumbnail,
        source: "Open Library",
        link: edition.key ? `https://openlibrary.org${edition.key}` : "",
        edition_key: edition.key || "",
      };
    });
  } catch (err) {
    console.warn("⚠️  Open Library editions fetch failed:", err.message);
    return [];
  }
}

/**
 * Search Google Books editions - searches for different versions of a book
 */
async function searchGoogleBooksEditions(title, author = "", limit = 10) {
  try {
    const q = encodeURIComponent(
      author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`
    );
    const key = process.env.GOOGLE_BOOKS_API_KEY
      ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}`
      : "";
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=${limit * 2}${key}`;

    const { data } = await axios.get(url, { timeout: 10000 });
    const items = data?.items || [];

    if (items.length === 0) return [];

    // Filter and map to get distinct editions
    const seen = new Set();
    const editions = [];
    
    for (const item of items) {
      const info = item.volumeInfo || {};
      const ids = info.industryIdentifiers || [];
      const isbn = ids.find(i => i.type === "ISBN_13")?.identifier ||
                   ids.find(i => i.type === "ISBN_10")?.identifier || "";
      
      // Create unique key based on title + publisher + year
      const key = `${info.title}|${info.publisher}|${info.publishedDate}`.toLowerCase();
      
      if (!seen.has(key)) {
        seen.add(key);
        editions.push({
          title: info.title || "",
          author: info.authors?.join(", ") || "",
          isbn,
          year: info.publishedDate ? info.publishedDate.slice(0, 4) : "",
          publisher: info.publisher || "",
          thumbnail: info.imageLinks?.thumbnail?.replace("http://", "https://") || "",
          source: "Google Books",
          link: info.infoLink || item.selfLink || "",
          volumeId: item.id || "",
        });
      }
      
      if (editions.length >= limit) break;
    }

    return editions;
  } catch (err) {
    console.warn("⚠️  Google Books editions search failed:", err.message);
    return [];
  }
}

/**
 * Search Open Library to get different editions/variants of a book
 */
async function searchOpenLibraryEditions(title, author = "", limit = 10) {
  try {
    const q = encodeURIComponent(`${title} ${author}`.trim());
    const url = `https://openlibrary.org/search.json?q=${q}&limit=${limit * 2}&fields=key,title,author_name,first_publish_year,publisher,cover_i,isbn`;

    const { data } = await axios.get(url, { timeout: 10000 });
    const docs = data?.docs || [];

    if (docs.length === 0) return [];

    const seen = new Set();
    const editions = [];
    
    for (const doc of docs) {
      const docTitle = (doc.title || "").toLowerCase().trim();
      const searchTitleLower = title.toLowerCase().trim();
      
      // Only include if title is similar
      if (!docTitle.includes(searchTitleLower) && searchTitleLower.length > 3) continue;
      
      const key = `${docTitle}|${doc.publisher?.[0] || ""}|${doc.first_publish_year || ""}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        
        const thumbnail = doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : "";

        editions.push({
          title: doc.title || "",
          author: doc.author_name?.join(", ") || "",
          isbn: doc.isbn?.[0] || "",
          year: doc.first_publish_year ? String(doc.first_publish_year) : "",
          publisher: doc.publisher?.[0] || "",
          thumbnail,
          source: "Open Library",
          link: doc.key ? `https://openlibrary.org${doc.key}` : "",
          workKey: doc.key || "",
        });
      }
      
      if (editions.length >= limit) break;
    }

    return editions;
  } catch (err) {
    console.warn("⚠️  Open Library editions search failed:", err.message);
    return [];
  }
}

/**
 * GET /api/search-books
 * Query params: title (required), author (optional)
 */
router.get("/search-books", async (req, res) => {
  const { title, author } = req.query;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      error: "Title is required. Use ?title=Book+Title&author=Optional+Author",
    });
  }

  const searchTitle = title.trim();
  const searchAuthor = (author || "").trim();
  const cacheKey = getCacheKey(searchTitle, searchAuthor);

  // Check cache first
  const cachedResults = getCachedResults(cacheKey);
  if (cachedResults) {
    console.log(`[Search] Cache hit for "${searchTitle}"`);
    return res.status(200).json({
      success: true,
      results: cachedResults,
      cached: true,
    });
  }

  console.log(`[Search] title="${searchTitle}" author="${searchAuthor}"`);

  try {
    let allResults = [];
    let searchSources = [];

    // Step 1: Search Philippine libraries first
    console.log("[Search] Step 1: Searching Philippine libraries...");
    const phResults = await searchPhilippineLibraries(searchTitle, searchAuthor);
    
    // Filter out pure search links if we have real results
    const phRealResults = phResults.filter(r => !r.isSearchLink);
    
    if (phRealResults.length > 0) {
      allResults = [...phRealResults];
      searchSources.push("Philippine Library");
      console.log(`[Search] Found ${phRealResults.length} results from Philippine libraries`);
    }

    // Step 2: Search Open Library and Google Books IN PARALLEL
    console.log("[Search] Step 2: Searching Open Library and Google Books in parallel...");
    
    const [olResults, gbResults] = await Promise.all([
      searchOpenLibraryMultiple(searchTitle, searchAuthor, 10),
      searchGoogleBooksMultiple(searchTitle, searchAuthor, 10)
    ]);

    // Collect all sources that have results
    if (olResults.length > 0) {
      allResults = [...allResults, ...olResults];
      searchSources.push("Open Library");
      console.log(`[Search] Found ${olResults.length} results from Open Library`);
    }
    
    if (gbResults.length > 0) {
      allResults = [...allResults, ...gbResults];
      searchSources.push("Google Books");
      console.log(`[Search] Found ${gbResults.length} results from Google Books`);
    }

    // If still no results, try broader search with just title
    if (allResults.length === 0 && searchAuthor) {
      console.log("[Search] No results with author, trying title-only search...");
      
      // Search both sources in parallel
      const [olResultsTitleOnly, gbResultsTitleOnly] = await Promise.all([
        searchOpenLibraryMultiple(searchTitle, "", 15),
        searchGoogleBooksMultiple(searchTitle, "", 15)
      ]);
      
      if (olResultsTitleOnly.length > 0) {
        allResults = [...allResults, ...olResultsTitleOnly];
        searchSources.push("Open Library");
      }
      if (gbResultsTitleOnly.length > 0) {
        allResults = [...allResults, ...gbResultsTitleOnly];
        searchSources.push("Google Books");
      }
    }

    // Deduplicate results
    allResults = deduplicateResults(allResults);

    // Sort by relevance (exact matches first)
    allResults = sortByRelevance(allResults, searchTitle, searchAuthor);

    // Limit results to top 20
    allResults = allResults.slice(0, 20);

    console.log(`[Search] Total results after dedup: ${allResults.length}`);

    // Cache the results
    setCacheResults(cacheKey, allResults);

    return res.status(200).json({
      success: true,
      results: allResults,
      search_source: searchSources.length > 0 ? searchSources.join(", ") : "None",
      cached: false,
    });
  } catch (err) {
    console.error("[Search] Error:", err.message);
    return res.status(500).json({
      success: false,
      error: "An error occurred while searching for books. Please try again.",
    });
  }
});

/**
 * Clear cache endpoint (for testing/debugging)
 */
router.delete("/search-books/cache", (_req, res) => {
  searchCache.clear();
  res.json({ success: true, message: "Cache cleared" });
});

/**
 * GET /api/search-editions
 * Query params: title (required), author (optional)
 * Returns different editions/variants of books from both Open Library and Google Books
 */
router.get("/search-editions", async (req, res) => {
  const { title, author } = req.query;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      error: "Title is required. Use ?title=Book+Title&author=Optional+Author",
    });
  }

  const searchTitle = title.trim();
  const searchAuthor = (author || "").trim();
  const cacheKey = `editions:${getCacheKey(searchTitle, searchAuthor)}`;

  // Check cache first
  const cachedResults = getCachedResults(cacheKey);
  if (cachedResults) {
    console.log(`[Editions] Cache hit for "${searchTitle}"`);
    return res.status(200).json({
      success: true,
      results: cachedResults,
      cached: true,
    });
  }

  console.log(`[Editions] title="${searchTitle}" author="${searchAuthor}"`);

  try {
    // Search both sources in parallel for editions
    const [olEditions, gbEditions] = await Promise.all([
      searchOpenLibraryEditions(searchTitle, searchAuthor, 15),
      searchGoogleBooksEditions(searchTitle, searchAuthor, 15)
    ]);

    // Combine all editions
    let allEditions = [...olEditions, ...gbEditions];

    // Deduplicate based on ISBN or title+year+publisher
    const seen = new Set();
    const deduped = [];
    
    for (const edition of allEditions) {
      const key = edition.isbn || `${edition.title}|${edition.year}|${edition.publisher}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(edition);
      }
    }

    // Sort by year (newest first)
    deduped.sort((a, b) => {
      const yearA = parseInt(a.year) || 0;
      const yearB = parseInt(b.year) || 0;
      return yearB - yearA;
    });

    // Limit to top 20
    const finalResults = deduped.slice(0, 20);

    console.log(`[Editions] Found ${finalResults.length} editions`);

    // Cache the results
    setCacheResults(cacheKey, finalResults);

    return res.status(200).json({
      success: true,
      results: finalResults,
      search_source: "Open Library, Google Books",
      cached: false,
    });
  } catch (err) {
    console.error("[Editions] Error:", err.message);
    return res.status(500).json({
      success: false,
      error: "An error occurred while searching for editions. Please try again.",
    });
  }
});

module.exports = router;

