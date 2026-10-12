/**
 * Lexora book upload routes.
 *
 * Uses disk storage: a book can carry a 50 MB PDF and up to 50 page images in
 * one request, so the body is streamed to the temp folder and the controller
 * renames it into the book's directory. Config comes from the shared factory
 * so the allow-lists and size ceilings cannot drift from the other features.
 */

const { createUpload } = require("./uploadFactory");

const MAX_PAGE_FILES = 50;

const uploadMessages = {
  tooLarge: "The file exceeds the maximum allowed size.",
  tooMany: `Upload no more than ${MAX_PAGE_FILES} page images at once.`,
  invalid: "Invalid upload.",
};

const uploadPdf = createUpload({
  storage: "disk",
  subdir: "lexora",
  type: "pdf",
  field: "pdf",
});

const uploadImage = createUpload({
  storage: "disk",
  subdir: "lexora",
  type: "image",
  field: "cover",
  messages: uploadMessages,
});

const uploadThumbnail = createUpload({
  storage: "disk",
  subdir: "lexora",
  type: "image",
  field: "thumbnail",
  messages: uploadMessages,
});

const uploadPages = createUpload({
  storage: "disk",
  subdir: "lexora",
  type: "image",
  field: "pages",
  maxCount: MAX_PAGE_FILES,
  messages: uploadMessages,
});

module.exports = {
  uploadPdf,
  uploadImage,
  uploadThumbnail,
  uploadPages,
  MAX_PAGE_FILES,
};
