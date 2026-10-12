/**
 * Rate limits for the upload endpoints.
 *
 * The global API limiter counts requests, not bytes: under it, one librarian
 * bulk-importing a 50 MB PDF is indistinguishable from a flood. These cap the
 * work per IP instead, which is what actually protects the server.
 *
 * Kept per-IP because a shared school network can present many users behind
 * one address, so a per-account limit there would throttle a whole lab.
 */

const rateLimit = require("express-rate-limit");

// Uploaded bytes matter more than request count, but express-rate-limit counts
// requests. The generous window below is chosen so a librarian importing a
// book (1 PDF + 1 cover + 1 thumbnail + a batch of pages) stays well inside it.
const isDevelopment = process.env.NODE_ENV !== "production";

const UPLOAD_WINDOW_MS = 60 * 1000;   // 1 minute

function uploadLimiter({ max, message }) {
  return rateLimit({
    windowMs: UPLOAD_WINDOW_MS,
    max: isDevelopment ? max * 10 : max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`[UploadLimit] ${req.ip} throttled on ${req.method} ${req.originalUrl}`);
      res.status(429).json({
        success: false,
        message,
      });
    },
  });
}

// Single-file uploads (PDF, cover, thumbnail, one page image, avatar,
// tool asset). A librarian replacing a cover a few times a minute is normal.
const singleUploadLimiter = uploadLimiter({
  max: 30,
  message: "Too many uploads. Wait a minute and try again.",
});

// Batch page uploads, which carry up to 50 files in one request.
const batchUploadLimiter = uploadLimiter({
  max: 10,
  message: "Too many page batches. Wait a minute and try again.",
});

module.exports = { singleUploadLimiter, batchUploadLimiter };
