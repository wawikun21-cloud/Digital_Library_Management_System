/**
 * Tool asset uploads (thumbnail + file).
 *
 * Uses disk storage: a tool attachment is allowed up to 50 MB, and keeping it
 * in memory meant ~55 MB of heap per concurrent request. The controller
 * renames the temp files into the tools folder and removes them on failure.
 */

const { createFieldsUpload } = require("./uploadFactory");

const toolsUpload = createFieldsUpload({
  storage: "disk",
  subdir: "tools",
  fields: [
    {
      name: "thumbnail",
      maxCount: 1,
      maxBytes: 5 * 1024 * 1024,
      type: "image",
      label: "The thumbnail",
    },
    {
      name: "file",
      maxCount: 1,
      maxBytes: 50 * 1024 * 1024,
      type: "document",
      label: "The file",
    },
  ],
  messages: {
    tooLarge: "The file exceeds the maximum allowed size.",
    tooMany: "Upload one thumbnail and one file at a time.",
    invalid: "Upload could not be processed.",
  },
});

module.exports = { toolsUpload };
