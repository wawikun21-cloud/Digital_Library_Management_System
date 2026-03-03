// ─────────────────────────────────────────────────────────
//  routes/scanBookCover.js
//  POST /api/scan-book-cover
//
//  Flow:
//    1. Accept uploaded image (multer memory storage)
//    2. Run Google Vision text detection
//    3. Extract ISBN(s) via regex
//    4. If ISBN found  → lookup Google Books by ISBN
//    5. If ISBN absent → infer title from largest text blocks
//                        → search Google Books by title
//    6. Return structured JSON response
// ─────────────────────────────────────────────────────────
const express              = require("express");
const { upload, handleUploadError } = require("../middleware/upload");
const { detectText, getLargestTextBlocks } = require("../services/visionService");
const { extractISBNs, lookupByISBN, searchByTitle } = require("../services/booksService");

const router = express.Router();

// ── POST /api/scan-book-cover ────────────────────────────
router.post(
  "/scan-book-cover",
  upload.single("cover"),        // field name must match FormData key
  handleUploadError,             // multer error handler (size / type)
  async (req, res) => {

    // 1. Validate file presence
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error:   "No image file uploaded. Send a multipart/form-data request with field name 'cover'.",
      });
    }

    // 2. Run OCR
    let ocrResult;
    try {
      ocrResult = await detectText(req.file.buffer, req.file.mimetype);
    } catch (visionErr) {
      console.error("[Vision API Error]", visionErr);

      // Distinguish auth/config errors from general API errors
      const isCredentialError =
        visionErr.message?.includes("OCR_SPACE_API_KEY") ||
        visionErr.code === 7 ||
        visionErr.code === 16;

      return res.status(500).json({
        success: false,
        error: isCredentialError
          ? "OCR.space authentication failed. Check your OCR_SPACE_API_KEY in .env."
          : "OCR.space API request failed. Please try again.",
        detail: visionErr.message,
      });
    }

    const { fullText, blocks } = ocrResult;

    // 3. No text detected
    if (!fullText || fullText.trim().length === 0) {
      return res.status(200).json({
        success:  true,
        ocrText:  "",
        isbn:     null,
        book:     null,
        message:  "No text detected in the image. Try a clearer photo with good lighting.",
      });
    }

    // 4. Extract ISBNs
    const isbns       = extractISBNs(fullText);
    const detectedISBN = isbns[0] || null;   // use the first match

    let book = null;
    let usedStrategy = "";

    if (detectedISBN) {
      // ── Strategy A: ISBN found ──────────────────────────
      usedStrategy = "isbn";
      console.log(`[Scan] ISBN detected: ${detectedISBN}`);
      book = await lookupByISBN(detectedISBN);
    } else {
      // ── Strategy B: No ISBN — infer title from OCR ──────
      usedStrategy = "title-search";
      const largestWords = getLargestTextBlocks(blocks, 5);
      const titleGuess   = largestWords.join(" ").trim();

      if (titleGuess) {
        console.log(`[Scan] No ISBN. Title guess from OCR: "${titleGuess}"`);
        book = await searchByTitle(titleGuess);
      }
    }

    // 5. Build response
    const response = {
      success:  true,
      ocrText:  fullText,
      isbn:     detectedISBN,
      strategy: usedStrategy,
      book:     book || null,
    };

    // If no book was found via API, communicate it clearly
    if (!book) {
      response.message = detectedISBN
        ? `ISBN ${detectedISBN} was detected but no matching book was found in Google Books. You can fill in the details manually.`
        : "No ISBN found and no book title match in Google Books. The OCR text is included — fill in details manually.";
    }

    return res.status(200).json(response);
  }
);

module.exports = router;