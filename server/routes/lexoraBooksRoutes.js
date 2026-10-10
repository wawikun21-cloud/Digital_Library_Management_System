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

const { requireAuth } = require("../middleware/authMiddleware");
const {
  resolvePermissions,
  requirePermissionAction,
} = require("../features/roles");

// ── Public (read-only) — no auth, registered first ─────────

router.get("/public", async (req, res) => {
  try {
    const { search, category, tag, source_type, program } = req.query;
    const result = await require("../models/LexoraBook").getPublic({
      search,
      program,
      source_type,
      category_slug: category,
      tag_slug: tag,
    });
    if (!result.success) return res.status(400).json({ success: false, error: result.error });
    res.json({ success: true, data: result.data });
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

router.get("/:id/reader", async (req, res) => {
  try {
    const LexoraBook = require("../models/LexoraBook");
    const bookResult = await LexoraBook.getById(req.params.id);
    if (!bookResult.success) return res.status(404).json({ success: false, error: bookResult.error });

    const book = bookResult.data;
    const user = req.session?.user;
    const isManager = user?.role === "admin" || user?.role === "librarian";
    const isOwner = user && Number(book.created_by) === Number(user.id);
    const isPublic = book.status === "published" && book.visibility === "public";
    if (!isPublic && !isManager && !isOwner) {
      return res.status(user ? 403 : 401).json({ success: false, error: "Access denied" });
    }
    if (book.visibility === "private" && !isManager && !isOwner) {
      return res.status(user ? 403 : 401).json({ success: false, error: "Access denied" });
    }

    let pages = [];
    if (book.source_type === "images") {
      const pageResult = await LexoraBook.getBookPages(req.params.id);
      if (!pageResult.success) {
        return res.status(500).json({ success: false, error: "Failed to load book pages" });
      }
      pages = pageResult.data;
    }

    let bookmarks = [];
    let progress = null;
    if (user?.id) {
      const [bookmarkResult, progressResult] = await Promise.all([
        LexoraBook.getUserBookmarks(user.id, req.params.id),
        LexoraBook.getReadingProgress(user.id, req.params.id),
      ]);
      if (!bookmarkResult.success || !progressResult.success) {
        return res.status(500).json({ success: false, error: "Failed to load reader data" });
      }
      bookmarks = bookmarkResult.data;
      progress = progressResult.data;
    }

    res.json({
      success: true,
      data: {
        ...book,
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
router.use(requireAuth, resolvePermissions);

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

const {
  uploadPdf,
  uploadImage,
  uploadThumbnail,
  uploadPages,
  handleLexoraUploadError,
} = require("../middleware/lexoraUpload");

router.post("/:id/pdf",
  requirePermissionAction("manage_lexora_books", "edit"),
  uploadPdf, handleLexoraUploadError,
  lexoraCtrl.uploadBookPdf
);

router.delete("/:id/pdf", requirePermissionAction("manage_lexora_books", "edit"), lexoraCtrl.removeBookPdf);

router.post("/:id/cover",
  requirePermissionAction("manage_lexora_books", "edit"),
  uploadImage, handleLexoraUploadError,
  lexoraCtrl.uploadBookCover
);

router.delete("/:id/cover", requirePermissionAction("manage_lexora_books", "edit"), lexoraCtrl.removeBookCover);

router.post("/:id/thumbnail",
  requirePermissionAction("manage_lexora_books", "edit"),
  uploadThumbnail, handleLexoraUploadError,
  lexoraCtrl.uploadBookThumbnail
);

router.post("/:id/pages",
  requirePermissionAction("manage_lexora_books", "edit"),
  uploadPages, handleLexoraUploadError,
  lexoraCtrl.uploadBookPages
);

router.post("/:id/pages/:pageId/image",
  requirePermissionAction("manage_lexora_books", "edit"),
  uploadImage, handleLexoraUploadError,
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
