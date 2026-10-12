const { createUpload } = require("../../middleware/uploadFactory");

/** Accepts one optional image in the `image` form field. */
const portalImageUpload = createUpload({
  storage: "memory",
  type: "image",
  field: "image",
  messages: {
    tooLarge: "Image must be 5 MB or smaller.",
    tooMany: "Upload one image at a time.",
    invalid: "Unable to process the image upload.",
  },
});

module.exports = { portalImageUpload };
