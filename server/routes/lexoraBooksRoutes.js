// ─────────────────────────────────────────────────────────
//  routes/lexoraBooksRoutes.js
//
//  Role guards were replaced by permission guards:
//    • GET /, /:id, /:id/stats            → view_lexora_books:view / manage_lexora_books:view
//    • GET /:id/pages                     → view_lexora_books:read
//    • GET /categories/all, /tags/all     → manage_lexora_books:view
//    • POST /, PUT /:id                   → manage_lexora_books:create / :edit
//    • DELETE /:id, /:id/pdf, /:id/cover  → manage_lexora_books:delete / :edit
//    • publish/unpublish                  → manage_lexora_books:publish
//    • archive/restore                    → manage_lexora_books:archive
//    • POST /lexora-import                → manage_lexora_books:import
//
//  Public and reader routes keep their current access and are
//  registered BEFORE the guard middleware so it never runs for them.
// ─────────────────────────────────────────────────────────

const express        = require("express");
const router         = express.Router();
const lexoraCtrl     = require("../controllers/lexoraController");
const LexoraBookModel = require("../models/LexoraBook");

const { requireAuth } = require("../middleware/authMiddleware");
const {
  resolvePermissions,
  requirePermissionAction,
} = require("../features/roles");
const { resolveSchoolScope } = require("../features/organization");

/** Clamps client paging input; returns { page, pageSize } or null. */
function parsePaging(query) {
  const rawPage = Number(query.page);
  const rawSize = Number(query.pageSize);
  if (!Number.isSafeInteger(rawPage) || rawPage < 1) return null;
  return {
    page: Math.floor(rawPage),
    pageSize: Number.isSafeInteger(rawSize) && rawSize > 0
      ? Math.min(100, Math.floor(rawSize))
      : 25,
  };
}

// ── Public (read-only) — no auth, registered first ─────────

router.get("/public", async (req, res) => {
  try {
    const { search, category, tag, source_type, program, page: rawPage, pageSize: rawSize } = req.query;
    const paging = parsePaging({ page: rawPage, pageSize: rawSize });
    const result = await LexoraBookModel.getPublic({
      search,
      program,
      source_type,
      category_slug: category,
      tag_slug: tag,
      ...(paging ? { page: paging.page, pageSize: paging.pageSize } : {}),
    });
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) {
    console.error("[GET /api/lexora-books/public]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/public/categories", async (_req, res) => {
  try {
    const result = await require("../models/LexoraBook").getCategories();
    if (!result.success) return res.status(500).json({ success: false, error: "Failed to fetch categories" });
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[GET /api/lexora-books/public/categories]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/public/tags", async (_req, res) => {
  try {
    const result = await require("../models/LexoraBook").getTags();
    if (!result.success) return res.status(500).json({ success: false, error: "Failed to fetch tags" });
    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[GET /api/lexora-books/public/tags]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/public/:id", async (req, res) => {
  try {
    const result = await require("../models/LexoraBook").getById(req.params.id, { publishedOnly: true })
    if (!result.success) return res.status(404).json({ success: false, error: result.error })
    const LexoraBook = require("../models/LexoraBook")
    const [categoryResult, tagResult] = await Promise.all([
      LexoraBook.getCategories(req.params.id),
      LexoraBook.getTags(req.params.id),
    ])
    if (!categoryResult.success || !tagResult.success) {
      return res.status(500).json({ success: false, error: "Failed to load book details" })
    }
    res.json({
      success: true,
      data: {
        ...result.data,
        categories: categoryResult.data,
        tags: tagResult.data,
      },
    })
  } catch (err) {
    console.error("[GET /api/lexora-books/public/:id]", err.message)
    res.status(500).json({ success: false, error: "Internal server error" })
  }
});

// ── Reader data (public with in-handler role checks) ───────
//
//  resolveSchoolScope is session-OPTIONAL here: anonymous readers
//  of public books carry no scope, while a logged-in reader is
//  additionally scope-checked against the book's category
//  assignments (bookAccess) before any reader data is served.

router.get("/:id/reader", resolveSchoolScope, async (req, res) => {
  try {
    const bookResult = await LexoraBookModel.getById(req.params.id);
    if (!bookResult.success) return res.status(404).json({ success: false, error: bookResult.error });

    const book = bookResult.data;
    const user = req.session?.user;
    const isManager = user?.role === "admin" || user?.role === "librarian";
    const isOwner = user && Number(book.created_by) === Number(user.id);
    const isPublic = book.status === "published" && book.visibility === "public";
    if (!isPublic && !isManager && !isOwner) {
      return res.status(user ? 403 : 401).json({ success: false, error: "Access denied" });
    }

    // ── School scope (defense in depth after the public/role checks) ──
    const { bookAccess } = require("../features/organization");
    const access = await bookAccess.isLexoraBookAccessible(req.schoolScope, book.id);
    if (access.success && !access.accessible) {
      return res.status(404).json({ success: false, error: "Book not found" });
    }

    let pages = [];
    if (book.source_type === "images") {
      const pageResult = await LexoraBookModel.getBookPages(req.params.id);
      if (!pageResult.success) {
        return res.status(500).json({ success: false, error: "Failed to load book pages" });
      }
      pages = pageResult.data;
    }

    let bookmarks = [];
    let progress = null;
    if (user?.id) {
      const [bookmarkResult, progressResult] = await Promise.all([
        LexoraBookModel.getUserBookmarks(user.id, req.params.id),
        LexoraBookModel.getReadingProgress(user.id, req.params.id),
      ]);
      if (!bookmarkResult.success || !progressResult.success) {
        return res.status(500).json({ success: false, error: "Failed to load reader data" });
      }
      bookmarks = bookmarkResult.data;
      progress = progressResult.data;
    }

    // Explicit field list: the reader must never receive internal columns
    // (created_by, deleted_at, file_size, …) — this endpoint also serves
    // anonymous readers of public books.
    res.json({
      success: true,
      data: {
        id: book.id,
        title: book.title,
        author: book.author,
        source_type: book.source_type,
        pdf_url: book.pdf_url,
        thumbnail_url: book.thumbnail_url,
        cover_url: book.cover_url,
        total_pages: book.total_pages,
        table_of_contents: book.table_of_contents,
        status: book.status,
        visibility: book.visibility,
        // Creator-controlled reader restrictions, normalised to booleans
        // here so the client never casts. Missing/legacy rows read as
        // "allowed", matching the column defaults.
        allow_text_copy: book.allow_text_copy !== 0,
        allow_screenshot: book.allow_screenshot !== 0,
        pages,
        bookmarks,
        reading_progress: progress,
      },
    });
  } catch (err) {
    console.error("[GET /api/lexora-books/:id/reader]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── Everything below requires an authenticated caller with
//    resolved permissions attached to the request. ──────────
router.use(requireAuth, resolvePermissions, resolveSchoolScope);

// ── Admin CRUD ─────────────────────────────────────────────

router.get("/my-bookmarks", lexoraCtrl.getMyBookmarks);

router.get("/", requirePermissionAction("view_lexora_books", "view"), lexoraCtrl.getLexoraBooks);

router.get("/:id", requirePermissionAction("view_lexora_books", "view"), lexoraCtrl.getLexoraBook);

router.post("/", requirePermissionAction("manage_lexora_books", "create"), lexoraCtrl.createLexoraBook);

router.put("/:id", requirePermissionAction("manage_lexora_books", "edit"), lexoraCtrl.updateLexoraBook);

router.delete("/:id", requirePermissionAction("manage_lexora_books", "delete"), lexoraCtrl.deleteLexoraBook);

router.post("/:id/publish", requirePermissionAction("manage_lexora_books", "publish"), lexoraCtrl.publishLexoraBook);

router.post("/:id/unpublish", requirePermissionAction("manage_lexora_books", "publish"), lexoraCtrl.unpublishLexoraBook);

router.post("/:id/archive", requirePermissionAction("manage_lexora_books", "archive"), lexoraCtrl.archiveLexoraBook);

router.post("/:id/restore", requirePermissionAction("manage_lexora_books", "archive"), lexoraCtrl.restoreLexoraBook);

// ── Uploads ────────────────────────────────────────────────

// Upload middleware maps its own limit/type errors to 400 responses, so each
// route is just guard → rate limit → upload → controller.
const {
  uploadPdf,
  uploadImage,
  uploadThumbnail,
  uploadPages,
} = require("../middleware/lexoraUpload");
const { singleUploadLimiter, batchUploadLimiter } = require("../middleware/uploadRateLimits");

router.post("/:id/pdf",
  requirePermissionAction("manage_lexora_books", "edit"),
  singleUploadLimiter,
  uploadPdf,
  lexoraCtrl.uploadBookPdf
);

router.delete("/:id/pdf", requirePermissionAction("manage_lexora_books", "edit"), lexoraCtrl.removeBookPdf);

router.post("/:id/cover",
  requirePermissionAction("manage_lexora_books", "edit"),
  singleUploadLimiter,
  uploadImage,
  lexoraCtrl.uploadBookCover
);

router.delete("/:id/cover", requirePermissionAction("manage_lexora_books", "edit"), lexoraCtrl.removeBookCover);

router.post("/:id/thumbnail",
  requirePermissionAction("manage_lexora_books", "edit"),
  singleUploadLimiter,
  uploadThumbnail,
  lexoraCtrl.uploadBookThumbnail
);

router.post("/:id/pages",
  requirePermissionAction("manage_lexora_books", "edit"),
  batchUploadLimiter,
  uploadPages,
  lexoraCtrl.uploadBookPages
);

router.post("/:id/pages/:pageId/image",
  requirePermissionAction("manage_lexora_books", "edit"),
  singleUploadLimiter,
  uploadImage,
  lexoraCtrl.replaceBookPageImage
);

// ── Book pages management ──────────────────────────────────

router.get("/:id/pages", requirePermissionAction("view_lexora_books", "read"), lexoraCtrl.getBookPages);

router.put("/pages/:pageId",
  requirePermissionAction("manage_lexora_books", "edit"),
  lexoraCtrl.updateBookPage
);

router.delete("/pages/:pageId",
  requirePermissionAction("manage_lexora_books", "edit"),
  lexoraCtrl.deleteBookPage
);

router.put("/:id/pages/reorder",
  requirePermissionAction("manage_lexora_books", "edit"),
  lexoraCtrl.reorderBookPages
);

// ── Categories ─────────────────────────────────────────────

router.get("/categories/all", requirePermissionAction("manage_lexora_books", "view"), lexoraCtrl.getCategories);

router.post("/categories",
  requirePermissionAction("manage_lexora_books", "create"),
  lexoraCtrl.createCategory
);

router.delete("/categories/:id",
  requirePermissionAction("manage_lexora_books", "delete"),
  lexoraCtrl.deleteCategory
);

router.put("/:id/categories",
  requirePermissionAction("manage_lexora_books", "edit"),
  lexoraCtrl.setBookCategories
);

// ── Resource Types ────────────────────────────────────────

router.get("/resource-types/all", requirePermissionAction("manage_lexora_books", "view"), lexoraCtrl.getResourceTypes);

router.post("/resource-types",

  requirePermissionAction("manage_lexora_books", "create"),

  lexoraCtrl.createResourceType

);

router.delete("/resource-types/:id",

  requirePermissionAction("manage_lexora_books", "delete"),

  lexoraCtrl.deleteResourceType

);

// ── Tags ───────────────────────────────────────────────────

router.get("/tags/all", requirePermissionAction("manage_lexora_books", "view"), lexoraCtrl.getTags);

router.post("/tags",
  requirePermissionAction("manage_lexora_books", "create"),
  lexoraCtrl.createTag
);

router.delete("/tags/:id",
  requirePermissionAction("manage_lexora_books", "delete"),
  lexoraCtrl.deleteTag
);

router.put("/:id/tags",
  requirePermissionAction("manage_lexora_books", "edit"),
  lexoraCtrl.setBookTags
);

// ── Bookmarks (user-scoped) ────────────────────────────────

router.get("/:id/bookmarks",   lexoraCtrl.getBookmarks);
router.post("/:id/bookmarks",  lexoraCtrl.addBookmark);
router.delete("/:id/bookmarks/:page", lexoraCtrl.removeBookmark);

// ── Reading progress (user-scoped) ────────────────────────

router.get("/:id/progress", lexoraCtrl.getReadingProgress);
router.put("/:id/progress", lexoraCtrl.saveReadingProgress);

// ── Stats ──────────────────────────────────────────────────

router.get("/:id/stats", requirePermissionAction("manage_lexora_books", "view"), lexoraCtrl.getBookStats);

// ── Legacy import (preserved) ──────────────────────────────

router.post("/lexora-import", requirePermissionAction("manage_lexora_books", "import"), lexoraCtrl.bulkLexoraImport);

module.exports = router;
