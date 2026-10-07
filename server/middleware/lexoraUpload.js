const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const TEMP_DIR = path.join(__dirname, "../uploads/tmp/lexora");
const PDF_MAX_SIZE = 50 * 1024 * 1024;
const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const MAX_PAGE_FILES = 50;

const IMAGE_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    fs.mkdir(TEMP_DIR, { recursive: true }, (error) => callback(error, TEMP_DIR));
  },
  filename(_req, file, callback) {
    callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

function createFileFilter(type) {
  return (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const valid = type === "pdf"
      ? extension === ".pdf" && file.mimetype === "application/pdf"
      : IMAGE_TYPES.get(extension) === file.mimetype;

    if (!valid) {
      const error = new Error(type === "pdf"
        ? "Upload a valid PDF file."
        : "Upload a JPG, PNG, or WEBP image.");
      error.code = "INVALID_FILE_TYPE";
      return callback(error);
    }

    callback(null, true);
  };
}

function createUploader(type, limits) {
  return multer({
    storage,
    fileFilter: createFileFilter(type),
    limits,
  });
}

const uploadPdf = createUploader("pdf", { fileSize: PDF_MAX_SIZE, files: 1 }).single("pdf");
const uploadImage = createUploader("image", { fileSize: IMAGE_MAX_SIZE, files: 1 }).single("cover");
const uploadThumbnail = createUploader("image", { fileSize: IMAGE_MAX_SIZE, files: 1 }).single("thumbnail");
const uploadPages = createUploader("image", {
  fileSize: IMAGE_MAX_SIZE,
  files: MAX_PAGE_FILES,
}).array("pages", MAX_PAGE_FILES);

function handleLexoraUploadError(error, _req, res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "The file exceeds the maximum allowed size.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        error: `Upload no more than ${MAX_PAGE_FILES} page images at once.`,
      });
    }
    return res.status(400).json({ success: false, error: "Invalid upload." });
  }
  if (error?.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({ success: false, error: error.message });
  }
  next(error);
}

module.exports = {
  uploadPdf,
  uploadImage,
  uploadThumbnail,
  uploadPages,
  handleLexoraUploadError,
};
