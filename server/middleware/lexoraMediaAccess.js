const LexoraBookModel = require("../models/LexoraBook");

// pdf.js issues many Range requests per PDF; avoid 1-2 DB queries for each one.
// The decision is cached briefly per (book, viewer), so unpublishing/permission
// changes take effect within ACCESS_TTL_MS.
const ACCESS_TTL_MS = 10_000;
const accessCache = new Map();

function accessKey(bookId, user) {
  return `${bookId}:${user?.id ?? "anon"}:${user?.role ?? ""}`;
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

    const cacheKey = accessKey(bookId, req.session?.user);
    const hit = accessCache.get(cacheKey);
    const requestedUrlEarly = `${req.baseUrl}${req.path}`;
    if (hit && hit.expires > Date.now()) {
      return hit.urls.has(requestedUrlEarly) ? next() : res.status(404).end();
    }

    const result = await LexoraBookModel.getById(bookId);
    if (!result.success) return res.status(404).end();

    const book = result.data;
    const user = req.session?.user;
    const isManager = user?.role === "admin" || user?.role === "librarian";
    const isOwner = user && Number(book.created_by) === Number(user.id);
    const isPublic = book.status === "published" && book.visibility === "public";

    if (!isPublic && !isManager && !isOwner) return res.status(404).end();

    const requestedUrl = `${req.baseUrl}${req.path}`;
    const mediaUrls = [book.pdf_url, book.thumbnail_url, book.cover_url, book.download_url];

    if (book.source_type === "images") {
      const pageResult = await LexoraBookModel.getBookPages(bookId);
      if (!pageResult.success) {
        console.error("[LexoraMediaAccess] Failed to load page references:", pageResult.error);
        return res.status(500).json({ success: false, error: "Unable to load book media" });
      }
      mediaUrls.push(...pageResult.data.map((page) => page.image_url));
    }

    const allowed = new Set(mediaUrls.filter(Boolean));
    accessCache.set(cacheKey, { urls: allowed, expires: Date.now() + ACCESS_TTL_MS });
    if (accessCache.size > 500) {
      for (const [k, v] of accessCache) if (v.expires <= Date.now()) accessCache.delete(k);
    }

    if (!allowed.has(requestedUrl)) return res.status(404).end();
    next();
  } catch (error) {
    console.error("[LexoraMediaAccess]", error.message);
    res.status(500).json({ success: false, error: "Unable to load book media" });
  }
};
