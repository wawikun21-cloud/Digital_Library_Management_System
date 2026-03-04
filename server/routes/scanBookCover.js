// ─────────────────────────────────────────────────────────
//  routes/scanBookCover.js
//  POST /api/scan-book-cover
//
//  Flow:
//    1. Accept uploaded image (multer memory storage)
//    2. OCR.space API → extract fullText + word blocks
//    3. Extract ISBNs from text (Strategy A)
//    4. If ISBN found → Google Books by ISBN
//    5. If no ISBN → parse title from largest blocks
//                  → Open Library (primary)
//                  → Google Books (fallback)
//    6. Return structured metadata JSON
// ─────────────────────────────────────────────────────────
const express = require("express");
const { upload, handleUploadError } = require("../middleware/upload");
const { detectText, getLargestTextBlocks, parseTitleAndAuthor, searchOpenLibrary, searchGoogleBooks } = require("../services/visionService");
const { extractISBNs, lookupByISBN } = require("../services/booksService");

const router = express.Router();

router.post(
  "/scan-book-cover",
  upload.single("cover"),
  handleUploadError,
  async (req, res) => {

    // ── 1. Validate upload ─────────────────────────────
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error:   "No image file uploaded. Send a multipart/form-data request with field 'cover'.",
      });
    }

    // ── 2. OCR ─────────────────────────────────────────
    let fullText = "";
    let blocks   = [];
    try {
      const result = await detectText(req.file.buffer, req.file.mimetype);
      fullText     = result.fullText;
      blocks       = result.blocks;
    } catch (ocrErr) {
      console.error("[OCR Error]", ocrErr.message);

      const isAuthError =
        ocrErr.message?.includes("OCR_SPACE_API_KEY") ||
        ocrErr.message?.includes("authentication");

      return res.status(500).json({
        success: false,
        error: isAuthError
          ? "OCR.space authentication failed. Check OCR_SPACE_API_KEY in .env."
          : "OCR.space API request failed. Please try again.",
        detail: ocrErr.message,
      });
    }

    // ── 3. No text detected ────────────────────────────
    if (!fullText || fullText.trim().length === 0) {
      return res.status(200).json({
        success:  true,
        ocrText:  "",
        book:     null,
        message:  "No text detected in the image. Try a clearer photo with good lighting.",
      });
    }

    // ── 4. Try ISBN first (Strategy A) ─────────────────
    const isbns        = extractISBNs(fullText);
    const detectedISBN = isbns[0] || null;
    let book           = null;
    let strategy       = "";

    if (detectedISBN) {
      console.log(`[Scan] ISBN detected: ${detectedISBN}`);
      book = await lookupByISBN(detectedISBN);
      if (book) strategy = "isbn-google-books";
    }

    // ── 5. No ISBN — title search (Strategy B) ─────────
    if (!book) {
      // Use largest visual blocks for title guess first,
      // then fall back to line-based parsing
      const largestWords = getLargestTextBlocks(blocks, 5);
      const titleGuess   = largestWords.join(" ").trim();
      const { title, author } = titleGuess
        ? { title: titleGuess, author: "" }
        : parseTitleAndAuthor(fullText);

      console.log(`[Scan] Title guess: "${title}"  Author: "${author}"`);

      if (title) {
        // Primary: Open Library
        book = await searchOpenLibrary(title, author);
        if (book) {
          strategy = "open-library";
          console.log(`[Scan] Match via Open Library: "${book.title}"`);
        }

        // Fallback: Google Books
        if (!book) {
          book = await searchGoogleBooks(title, author);
          if (book) {
            strategy = "google-books";
            console.log(`[Scan] Match via Google Books: "${book.title}"`);
          }
        }
      }
    }

    // ── 6. Build response ──────────────────────────────
    const responsePayload = {
      success:  true,
      ocrText:  fullText,
      isbn:     detectedISBN,
      strategy: strategy || "none",
      book:     book
        ? {
            title:         book.title         || "",
            author:        book.authors ? book.authors.join(", ") : (book.author || ""),
            isbn:          book.isbn          || detectedISBN || "",
            publishedDate: book.publishedDate || "",
            publisher:     book.publisher     || "",
            description:   book.description   || "",
            thumbnail:     book.thumbnail     || "",
          }
        : null,
    };

    if (!book) {
      responsePayload.message = detectedISBN
        ? `ISBN ${detectedISBN} detected but no matching book found. Fill in details manually.`
        : "No ISBN found and no book title match. OCR text is included — fill in details manually.";
    }

    return res.status(200).json(responsePayload);
  }
);

module.exports = router;