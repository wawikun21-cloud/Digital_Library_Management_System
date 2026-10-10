const multer = require("multer");

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter(_req, file, callback) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const error = new Error("Choose a JPEG, PNG, or WebP image.");
      error.code = "INVALID_PORTAL_IMAGE_TYPE";
      callback(error);
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});

/** Accepts one optional image in the `image` form field. */
function portalImageUpload(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "Image must be 5 MB or smaller."
        : "Unable to process the image upload.";
      return res.status(400).json({ success: false, error: message });
    }
    if (error?.code === "INVALID_PORTAL_IMAGE_TYPE") {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error) return next(error);
    next();
  });
}

module.exports = { portalImageUpload };
