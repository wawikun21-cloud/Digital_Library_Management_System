const LexoraBookModel = require("../models/LexoraBook");

// pdf.js issues many Range requests per PDF; avoid 1-2 DB queries for each one.
// The decision is cached briefly per (book, viewer), so unpublishing/permission
// changes take effect within ACCESS_TTL_MS.
const ACCESS_TTL_MS = 10_000;
const accessCache = new Map();

// Files named by the book's own row. `download_url` is deliberately excluded:
// it may point off-site and is never served from this folder.
const BOOK_FILE_FIELDS = ["pdf_url", "thumbnail_url", "cover_url"];

function accessKey(bookId, user) {
  return `${bookId}:${user?.id ?? "anon"}:${user?.role ?? ""}`;
}

/** Drops expired rows; bounded by distinct (book, viewer) pairs in one window. */
function pruneAccessCache() {
  if (accessCache.size <= 500) return;
  for (const [key, entry] of accessCache) if (entry.expires <= Date.now()) accessCache.delete(key);
}

module.exports = async function lexoraMediaAccess(req, res, next) {
  const segments = req.path.split("/").filter(Boolean);
  if (segments.length !== 2 || !/^\d+$/.test(segments[0])) {
    return res.status(404).end();
  }

  const [rawBookId, filename] = segments;
  if (
    !filename ||
    filename === "." ||
    filename === ".." ||
    filename.includes("\\") ||
    !/\.(pdf|jpe?g|png|webp)$/i.test(filename)
  ) {
    return res.status(404).end();
  }

  try {
    const bookId = Number(rawBookId);
    if (!Number.isSafeInteger(bookId) || bookId < 1) return res.status(404).end();

    const user = req.session?.user;
    const cacheKey = accessKey(bookId, user);
    const cached = accessCache.get(cacheKey);
    const requestedUrl = `${req.baseUrl}${req.path}`;

    if (cached && cached.expires > Date.now()) {
      if (cached.urls.has(requestedUrl)) return next();
      return cached.verified ? res.status(404).end() : verifyPageImage();
    }

    const result = await LexoraBookModel.getById(bookId);
    if (!result.success) return res.status(404).end();

    const book = result.data;
    const isManager = user?.role === "admin" || user?.role === "librarian";
    const isOwner = user && Number(book.created_by) === Number(user.id);
    const isPublic = book.status === "published" && book.visibility === "public";

    if (!isPublic && !isManager && !isOwner) {
      // No URLs and nothing left to verify: every request for this viewer
      // inside the window answers 404 without touching the database.
      accessCache.set(cacheKey, {
        urls: new Set(),
        verified: true,
        expires: Date.now() + ACCESS_TTL_MS,
      });
      pruneAccessCache();
      return res.status(404).end();
    }

    // Seed the cache with the three URLs the book's own row names; page images
    // are added as they are verified, so a large book never has its whole page
    // list loaded just to answer one file request.
    const urls = new Set(BOOK_FILE_FIELDS.map((field) => book[field]).filter(Boolean));
    const imageBook = book.source_type === "images";
    accessCache.set(cacheKey, { urls, verified: !imageBook, expires: Date.now() + ACCESS_TTL_MS });
    pruneAccessCache();

    if (urls.has(requestedUrl)) return next();
    return imageBook ? verifyPageImage() : res.status(404).end();

    async function verifyPageImage() {
      if (!(await LexoraBookModel.ownsPageImage(bookId, requestedUrl))) {
        return res.status(404).end();
      }
      // Remember it for the rest of the TTL window.
      const live = accessCache.get(cacheKey);
      if (live && live.expires > Date.now()) live.urls.add(requestedUrl);
      next();
    }
  } catch (error) {
    console.error("[LexoraMediaAccess]", error.message);
    res.status(500).json({ success: false, error: "Unable to load book media" });
  }
};
