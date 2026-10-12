/**
 * Every multipart upload middleware in the app is built here.
 *
 * Before this, five features each owned their own multer config, allow-list
 * and LIMIT_FILE_SIZE mapping, and they had already drifted — e.g. the generic
 * uploader advertised gif/bmp/tiff support that the controllers' magic-byte
 * checks reject. Naming the asset kinds once, and mapping errors once, keeps
 * the rules identical and the messages truthful.
 *
 * Storage choice matters at volume: `disk` streams the body to the temp folder
 * so a 50 MB upload costs disk, not heap, and the controller then renames it
 * into place. Use it for anything large or that many users upload at once.
 */

const path = require("path");
const crypto = require("crypto");
const fs = require("fs/promises");
const multer = require("multer");
const { tempUploadsDir } = require("../config/uploads");

const KB = 1024;
const MB = 1024 * KB;

// Single ceiling per kind of asset, so no feature can quietly raise its own.
const MAX_IMAGE_BYTES = 5 * MB;
const MAX_PDF_BYTES = 50 * MB;
const MAX_ASSET_BYTES = 50 * MB;

// Only formats the controllers' magic-byte checks can positively verify.
// gif/bmp/tiff are deliberately absent: they pass a MIME check but then fail
// the signature check, which produced a confusing second failure.
const IMAGE_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const PDF_MIME = new Set(["application/pdf"]);

const DOCUMENT_MIME = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const IMAGE_EXTENSIONS = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

/** Named allow-lists. `strictExtension` adds the extension/MIME cross-check. */
const ASSET_TYPES = {
  image: { mime: IMAGE_MIME, strictExtension: true, bytes: MAX_IMAGE_BYTES },
  pdf: { mime: PDF_MIME, strictExtension: false, bytes: MAX_PDF_BYTES },
  imageOrPdf: { mime: new Set([...IMAGE_MIME, ...PDF_MIME]), strictExtension: false, bytes: MAX_PDF_BYTES },
  document: { mime: new Set([...IMAGE_MIME, ...DOCUMENT_MIME]), strictExtension: false, bytes: MAX_ASSET_BYTES },
};

function typeError(message) {
  return Object.assign(new Error(message), { code: "INVALID_FILE_TYPE" });
}

function diskDestination(subdir) {
  const destinationDir = path.join(tempUploadsDir, subdir);
  return (_req, _file, callback) => {
    fs.mkdir(destinationDir, { recursive: true })
      .then(() => callback(null, destinationDir))
      .catch((error) => callback(error));
  };
}

function buildUploader({ storage, subdir, type, maxBytes }) {
  const asset = ASSET_TYPES[type];
  if (!asset) throw new Error(`Unknown upload asset type: ${type}`);

  // 'disk' streams the body to the temp folder; 'memory' stays for small
  // avatars and portal artwork, where the copy into the final folder is cheap.
  const fileStorage = storage === "disk"
    ? multer.diskStorage({
        destination: diskDestination(subdir),
        filename(_req, file, callback) {
          callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
        },
      })
    : multer.memoryStorage();

  const fileFilter = (_req, file, callback) => {
    const mime = file.mimetype.toLowerCase();
    if (!asset.mime.has(mime)) return callback(typeError(WRONG_TYPE[type]));

    // For images, the extension must agree with the declared MIME, so a
    // renamed .exe cannot ride in as image/webp.
    if (asset.strictExtension) {
      const expectedForExtension = IMAGE_EXTENSIONS.get(path.extname(file.originalname).toLowerCase());
      if (expectedForExtension !== mime) return callback(typeError(WRONG_TYPE[type]));
    }
    callback(null, true);
  };

  return multer({
    storage: fileStorage,
    fileFilter,
    // Cap every field at the widest limit in the request; tighter per-field
    // limits are enforced after parsing so the message can name the field.
    limits: { fileSize: maxBytes ?? asset.bytes },
  });
}

const WRONG_TYPE = {
  image: "Upload a JPG, PNG, or WEBP image.",
  pdf: "Upload a valid PDF file.",
  imageOrPdf: "Only image files and PDFs are allowed.",
  document: "Only image or supported document files are allowed.",
};

/**
 * Maps a MulterError, or one of the filter errors above, to a single 400.
 * Anything else falls through to the global error handler.
 */
function handleUploadError(error, _req, res, next, customMessages = {}) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: customMessages.tooLarge || "The file exceeds the maximum allowed size.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        error: customMessages.tooMany || "Too many files in one request.",
      });
    }
    return res.status(400).json({
      success: false,
      error: customMessages.invalid || "Upload could not be processed.",
    });
  }
  if (error?.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({ success: false, error: error.message });
  }
  next(error);
}

function withErrorHandling(handler, customMessages) {
  return (req, res, next) =>
    handler(req, res, (error) => handleUploadError(error, req, res, next, customMessages));
}

/**
 * One field, one file (or a bounded array).
 *
 * @param {Object} config
 * @param {'memory'|'disk'} config.storage     'disk' for large or batch uploads
 * @param {string} config.subdir               temp subfolder; required for 'disk'
 * @param {keyof ASSET_TYPES} config.type      allow-list + per-file size ceiling
 * @param {string} config.field                form field name
 * @param {number} [config.maxCount=1]         1 → .single(), >1 → .array()
 * @param {number} [config.maxBytes]           override the type's ceiling
 * @param {Object} [config.messages]           { tooLarge, tooMany, invalid }
 */
function createUpload({
  storage = "memory",
  subdir = "",
  type,
  field,
  maxCount = 1,
  maxBytes,
  messages: responseMessages = {},
}) {
  const uploader = buildUploader({ storage, subdir, type, maxBytes });
  const parsed = maxCount > 1 ? uploader.array(field, maxCount) : uploader.single(field);
  return withErrorHandling(parsed, responseMessages);
}

/**
 * Several fields with different size ceilings, using .fields().
 * multer applies one global limit, so each field's tighter limit is checked
 * after parsing — which also lets the message name the offending field.
 *
 * @param {Object} config
 * @param {string} config.subdir               temp subfolder
 * @param {Array<{name:string, maxCount:number, maxBytes:number, type:keyof ASSET_TYPES, label:string}>} config.fields
 * @param {Object} [config.messages]
 */
function createFieldsUpload({ storage = "memory", subdir = "", fields, messages = {} }) {
  const widest = Math.max(...fields.map((field) => field.maxBytes));
  const uploader = buildUploader({ storage, subdir, type: fields[0].type, maxBytes: widest });
  const specs = fields.map(({ name, maxCount }) => ({ name, maxCount }));

  function tooLarge(spec) {
    return Object.assign(
      new Error(`${spec.label} must be ${Math.floor(spec.maxBytes / MB)} MB or smaller.`),
      { code: "INVALID_FILE_TYPE" }
    );
  }

  return (req, res, next) =>
    uploader.fields(specs)(req, res, (parseError) => {
      if (parseError) return handleUploadError(parseError, req, res, next, messages);

      const oversized = fields
        .flatMap((spec) => (req.files[spec.name] || []).map((file) => ({ spec, file })))
        .find((entry) => entry.file.size > entry.spec.maxBytes);

      if (!oversized) return next();

      // Multer already wrote this file to disk; drop it before failing so a
      // rejected upload cannot leak into the temp folder.
      const cleanup = storage === "disk"
        ? fs.unlink(oversized.file.path).catch(() => {})
        : Promise.resolve();
      cleanup.then(() => handleUploadError(tooLarge(oversized.spec), req, res, next, messages));
    });
}

module.exports = {
  createUpload,
  createFieldsUpload,
  handleUploadError,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_ASSET_BYTES,
  IMAGE_MIME,
  PDF_MIME,
  DOCUMENT_MIME,
};
