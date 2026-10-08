const path = require("path");

const uploadsDir = path.resolve(
  process.env.UPLOADS_DIR || path.join(__dirname, "../uploads")
);

module.exports = {
  uploadsDir,
  tempUploadsDir: path.join(uploadsDir, "tmp"),
  lexoraUploadsDir: path.join(uploadsDir, "lexora-books"),
};
