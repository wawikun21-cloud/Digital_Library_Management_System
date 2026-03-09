// ─────────────────────────────────────────────────────────
//  routes/searchBooks.js
//  GET /api/search-books?title=...&author=...
//
//  Workflow:
//  1. Search Philippine library catalogs (eLib, National Library)
//  2. Search Open Library (international)
//  3. Fallback to Google Books
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
    let searchSource = "";

    // Step 1: Search Philippine libraries first
    console.log("[Search] Step 1: Searching Philippine libraries...");
    let phResults = await searchPhilippineLibraries(searchTitle, searchAuthor);
    
    // Filter out pure search links if we have real results
    const phRealResults = phResults.filter(r => !r.isSearchLink);
    
    if (phRealResults.length > 0) {
      allResults = [...phRealResults];
      searchSource = "Philippine Library";
      console.log(`[Search] Found ${phRealResults.length} results from Philippine libraries`);
    } else {
      // Add the NLP search link as an option
      allResults = [...phResults];
      console.log("[Search] No results from Philippine libraries, trying Open Library...");
      
      // Step 2: Search Open Library (international)
      let olResults = await searchOpenLibraryMultiple(searchTitle, searchAuthor, 10);
      
      if (olResults.length > 0) {
        allResults = [...olResults];
        searchSource = "Open Library";
        console.log(`[Search] Found ${olResults.length} results from Open Library`);
      } else {
        console.log("[Search] No results from Open Library, trying Google Books...");
        
        // Step 3: Fallback to Google Books
        let gbResults = await searchGoogleBooksMultiple(searchTitle, searchAuthor, 10);
        
        if (gbResults.length > 0) {
          allResults = [...gbResults];
          searchSource = "Google Books";
          console.log(`[Search] Found ${gbResults.length} results from Google Books`);
        }
      }
    }

    // If still no results, try broader search with just title
    if (allResults.length === 0 && searchAuthor) {
      console.log("[Search] No results with author, trying title-only search...");
      
      // Try Open Library with just title
      let olResults = await searchOpenLibraryMultiple(searchTitle, "", 15);
      if (olResults.length > 0) {
        allResults = [...olResults];
        searchSource = "Open Library";
      } else {
        // Try Google Books with just title
        let gbResults = await searchGoogleBooksMultiple(searchTitle, "", 15);
        if (gbResults.length > 0) {
          allResults = [...gbResults];
          searchSource = "Google Books";
        }
      }
    }

    // Try to get thumbnails from Open Library for Philippine library results without thumbnails
    if (searchSource === "Philippine Library" && allResults.length > 0) {
      console.log("[Search] Enriching Philippine results with Open Library thumbnails...");
      
      // For each Philippine result without thumbnail, try to find cover from Open Library
      for (let i = 0; i < allResults.length; i++) {
        if (!allResults[i].thumbnail) {
          const bookTitle = allResults[i].title;
          const bookAuthor = allResults[i].author;
          
          try {
            const olSearch = await searchOpenLibraryMultiple(bookTitle, bookAuthor, 1);
            if (olSearch.length > 0 && olSearch[0].thumbnail) {
              allResults[i].thumbnail = olSearch[0].thumbnail;
              // Mark that we got thumbnail from fallback
              allResults[i].thumbnail_source = "Open Library";
            }
          } catch (e) {
            // Continue even if thumbnail lookup fails
          }
        }
      }
    }

    console.log(`[Search] Total results: ${allResults.length}`);

    // Cache the results
    setCacheResults(cacheKey, allResults);

    return res.status(200).json({
      success: true,
      results: allResults,
      search_source: searchSource || "None",
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

module.exports = router;

