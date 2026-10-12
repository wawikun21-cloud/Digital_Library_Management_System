/**
 * Repository for book-intelligence. Owns filesystem access and delegates
 * all persistence to the existing LexoraBook model — no raw SQL here, and
 * no other module is allowed to touch the uploads folder.
 */

const fs = require("fs");
const path = require("path");
const LexoraBookModel = require("../../models/LexoraBook");
const { lexoraUploadsDir } = require("../../config/uploads");

const PDF_URL_PREFIX = "/uploads/lexora-books/";

function getBook(bookId) {
  return LexoraBookModel.getById(bookId);
}

/**
 * Resolves a book's stored pdf_url to an absolute path, or null.
 * Only serves files inside the book's own upload folder: the URL prefix is
 * checked, the filename is reduced to its basename (killing traversal), and
 * the resolved path is verified to stay inside the book directory.
 */
function resolvePdfPath(pdfUrl, bookId) {
  if (typeof pdfUrl !== "string" || !pdfUrl.startsWith(PDF_URL_PREFIX)) return null;

  const bookDir = path.join(lexoraUploadsDir, String(bookId));
  const filePath = path.join(bookDir, path.basename(pdfUrl));

  if (!filePath.startsWith(bookDir + path.sep)) return null;
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath : null;
}

module.exports = { getBook, resolvePdfPath };
