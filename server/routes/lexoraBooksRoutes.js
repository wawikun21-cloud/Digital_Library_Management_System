const express        = require("express");
const router         = express.Router();
const lexoraCtrl     = require("../controllers/lexoraController");

const {
  requireAuth,
  requireAdmin,
  requireAdminOrLibrarian,
} = require("../middleware/authMiddleware");

// ── Public (read-only) ─────────────────────────────────────

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

// ── Reader data ────────────────────────────────────────────

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

// ── Admin CRUD ─────────────────────────────────────────────

router.get("/my-bookmarks", requireAuth, lexoraCtrl.getMyBookmarks);

router.get("/", requireAuth, requireAdminOrLibrarian, lexoraCtrl.getLexoraBooks);

router.get("/:id", requireAuth, requireAdminOrLibrarian, lexoraCtrl.getLexoraBook);

router.post("/", requireAuth, requireAdminOrLibrarian, lexoraCtrl.createLexoraBook);

router.put("/:id", requireAuth, requireAdminOrLibrarian, lexoraCtrl.updateLexoraBook);

router.delete("/:id", requireAuth, requireAdmin, lexoraCtrl.deleteLexoraBook);

router.post("/:id/publish", requireAuth, requireAdminOrLibrarian, lexoraCtrl.publishLexoraBook);

router.post("/:id/unpublish", requireAuth, requireAdminOrLibrarian, lexoraCtrl.unpublishLexoraBook);

router.post("/:id/archive", requireAuth, requireAdminOrLibrarian, lexoraCtrl.archiveLexoraBook);

router.post("/:id/restore", requireAuth, requireAdminOrLibrarian, lexoraCtrl.restoreLexoraBook);

// ── Uploads ────────────────────────────────────────────────

const {
  uploadPdf,
  uploadImage,
  uploadThumbnail,
  uploadPages,
  handleLexoraUploadError,
} = require("../middleware/lexoraUpload");

router.post("/:id/pdf",
  requireAuth, requireAdminOrLibrarian,
  uploadPdf, handleLexoraUploadError,
  lexoraCtrl.uploadBookPdf
);

router.delete("/:id/pdf", requireAuth, requireAdminOrLibrarian, lexoraCtrl.removeBookPdf);

router.post("/:id/cover",
  requireAuth, requireAdminOrLibrarian,
  uploadImage, handleLexoraUploadError,
  lexoraCtrl.uploadBookCover
);

router.delete("/:id/cover", requireAuth, requireAdminOrLibrarian, lexoraCtrl.removeBookCover);

router.post("/:id/thumbnail",
  requireAuth, requireAdminOrLibrarian,
  uploadThumbnail, handleLexoraUploadError,
  lexoraCtrl.uploadBookThumbnail
);

router.post("/:id/pages",
  requireAuth, requireAdminOrLibrarian,
  uploadPages, handleLexoraUploadError,
  lexoraCtrl.uploadBookPages
);

router.post("/:id/pages/:pageId/image",
  requireAuth, requireAdminOrLibrarian,
  uploadImage, handleLexoraUploadError,
  lexoraCtrl.replaceBookPageImage
);

// ── Book pages management ──────────────────────────────────

router.get("/:id/pages", requireAuth, requireAdminOrLibrarian, lexoraCtrl.getBookPages);

router.put("/pages/:pageId",
  requireAuth, requireAdminOrLibrarian,
  lexoraCtrl.updateBookPage
);

router.delete("/pages/:pageId",
  requireAuth, requireAdminOrLibrarian,
  lexoraCtrl.deleteBookPage
);

router.put("/:id/pages/reorder",
  requireAuth, requireAdminOrLibrarian,
  lexoraCtrl.reorderBookPages
);

// ── Categories ─────────────────────────────────────────────

router.get("/categories/all", requireAuth, requireAdminOrLibrarian, lexoraCtrl.getCategories);

router.post("/categories",
  requireAuth, requireAdminOrLibrarian,
  lexoraCtrl.createCategory
);

router.put("/:id/categories",
  requireAuth, requireAdminOrLibrarian,
  lexoraCtrl.setBookCategories
);

// ── Tags ───────────────────────────────────────────────────

router.get("/tags/all", requireAuth, requireAdminOrLibrarian, lexoraCtrl.getTags);

router.post("/tags",
  requireAuth, requireAdminOrLibrarian,
  lexoraCtrl.createTag
);

router.put("/:id/tags",
  requireAuth, requireAdminOrLibrarian,
  lexoraCtrl.setBookTags
);

// ── Bookmarks ──────────────────────────────────────────────

router.get("/:id/bookmarks",
  requireAuth,
  lexoraCtrl.getBookmarks
);

router.post("/:id/bookmarks",
  requireAuth,
  lexoraCtrl.addBookmark
);

router.delete("/:id/bookmarks/:page",
  requireAuth,
  lexoraCtrl.removeBookmark
);

// ── Reading Progress ───────────────────────────────────────

router.get("/:id/progress",
  requireAuth,
  lexoraCtrl.getReadingProgress
);

router.put("/:id/progress",
  requireAuth,
  lexoraCtrl.saveReadingProgress
);

// ── Stats ──────────────────────────────────────────────────

router.get("/:id/stats",
  requireAuth, requireAdminOrLibrarian,
  lexoraCtrl.getBookStats
);

// ── Legacy import (preserved) ──────────────────────────────

router.post("/lexora-import",
  requireAuth, requireAdminOrLibrarian,
  lexoraCtrl.bulkLexoraImport
);

module.exports = router;
