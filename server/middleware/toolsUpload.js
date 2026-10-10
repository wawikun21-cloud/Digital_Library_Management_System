const multer = require("multer");

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const ALLOWED_FILE_MIME = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const ALLOWED_ALL_MIME = new Set([...ALLOWED_IMAGE_MIME, ...ALLOWED_FILE_MIME]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

function fileFilter(_req, file, callback) {
  const mime = file.mimetype.toLowerCase();
  if (file.fieldname === "thumbnail") {
    if (!ALLOWED_IMAGE_MIME.has(mime)) {
      const error = new Error("Thumbnail must be a JPEG, PNG, or WebP image.");
      error.code = "INVALID_THUMBNAIL_TYPE";
      callback(error, false);
      return;
    }
  } else if (file.fieldname === "file") {
    if (!ALLOWED_ALL_MIME.has(mime)) {
      const error = new Error("Only image files and PDFs are allowed.");
      error.code = "INVALID_FILE_TYPE";
      callback(error, false);
      return;
    }
  }
  callback(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

function toolsUpload(req, res, next) {
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ])(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error?.code === "INVALID_THUMBNAIL_TYPE" || error?.code === "INVALID_FILE_TYPE") {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error) return next(error);
    next();
  });
}

module.exports = { upload: toolsUpload, toolsUpload };
