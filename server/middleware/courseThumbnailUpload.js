const { createUpload } = require("./uploadFactory");

const courseThumbnailUpload = createUpload({
  storage: "memory",
  type: "image",
  field: "thumbnail",
  messages: {
    tooLarge: "Thumbnail must be 5 MB or smaller.",
    tooMany: "Upload one thumbnail at a time.",
    invalid: "Unable to process thumbnail upload.",
  },
});

module.exports = { courseThumbnailUpload };
