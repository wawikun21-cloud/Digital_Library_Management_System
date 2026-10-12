// ─────────────────────────────────────────────────────────
//  middleware/upload.js
//  Generic one-field uploader (currently only the avatar on /auth/profile).
//
//  Config comes from the shared factory. `images` is limited to formats the
//  controllers can actually verify (gif/bmp/tiff used to be advertised here
//  but the magic-byte checks reject them, so they failed confusingly later).
// ─────────────────────────────────────────────────────────
const { createUpload } = require("./uploadFactory");

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_SIZE_BYTES   = 50 * 1024 * 1024;

// Enforced rather than merely reported: the old config declared this number
// and had a message for it, but never passed it to multer.
const MAX_FILES_COUNT = 50;

const upload = createUpload({
  storage: "memory",
  type: "imageOrPdf",
  field: "avatar",
  maxCount: 1,
  maxBytes: MAX_IMAGE_SIZE_BYTES,
  messages: {
    tooLarge: "Image must be 5 MB or smaller.",
    invalid: "Only image files and PDFs are allowed.",
  },
});

module.exports = { upload, MAX_IMAGE_SIZE_BYTES, MAX_PDF_SIZE_BYTES, MAX_FILES_COUNT };
