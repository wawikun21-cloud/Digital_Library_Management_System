const multer = require("multer");

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter(_req, file, callback) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const error = new Error("Choose a JPEG, PNG, or WebP image.");
      error.code = "INVALID_THUMBNAIL_TYPE";
      callback(error);
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: MAX_THUMBNAIL_BYTES, files: 1 },
});

function courseThumbnailUpload(req, res, next) {
  upload.single("thumbnail")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "Thumbnail must be 5 MB or smaller."
        : "Unable to process thumbnail upload.";
      return res.status(400).json({ success: false, error: message });
    }
    if (error?.code === "INVALID_THUMBNAIL_TYPE") {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error) return next(error);
    next();
  });
}

module.exports = { courseThumbnailUpload };
