// ─────────────────────────────────────────────────────────
//  middleware/upload.js
//  Multer config — image only, max 1 MB
// ─────────────────────────────────────────────────────────
const multer = require("multer");

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
]);

const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      Object.assign(
        new Error("Only image files are allowed (JPEG, PNG, WEBP, etc.)"),
        { code: "INVALID_FILE_TYPE" }
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});

function handleUploadError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error:   "Image is too large. Maximum allowed size is 1 MB.",
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