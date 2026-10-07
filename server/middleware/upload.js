// ─────────────────────────────────────────────────────────
//  middleware/upload.js
//  Multer config — image + PDF support
// ─────────────────────────────────────────────────────────
const multer = require("multer");

const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
]);

const ALLOWED_PDF_MIME = new Set([
  "application/pdf",
]);

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;   // 5 MB for images
const MAX_PDF_SIZE_BYTES   = 50 * 1024 * 1024;  // 50 MB for PDFs
const MAX_FILES_COUNT      = 50;

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  const mime = file.mimetype.toLowerCase()
  if (ALLOWED_IMAGE_MIME.has(mime) || ALLOWED_PDF_MIME.has(mime)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(
        new Error("Only image files and PDFs are allowed"),
        { code: "INVALID_FILE_TYPE" }
      ),
      false
    );
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_PDF_SIZE_BYTES },
});

function handleUploadError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error:   "File is too large. Maximum allowed size is 50 MB.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        error: `Too many files. Maximum ${MAX_FILES_COUNT} files per request.`,
      });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err?.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
}

module.exports = { upload, handleUploadError };
