const LexoraBookModel = require("../models/LexoraBook");
const auditService    = require("../services/auditService");
const { successResponse, errorResponse } = require("../utils/responseFormatter");
const path            = require("path");
// Async forms only: every handler below awaited these calls while holding the
// event loop, which stalled unrelated requests during a large upload.
const fs              = require("fs/promises");
const crypto          = require("crypto");
const { lexoraUploadsDir } = require("../config/uploads");
const { userHasPermission } = require("../features/roles");


// ── Uploads directory ───────────────────────────────────────
const UPLOAD_DIR = lexoraUploadsDir;

async function ensureBookDir(bookId) {
  const dir = path.join(UPLOAD_DIR, String(bookId));
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function safeFilename(originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  return `${crypto.randomUUID()}${ext}`;
}

/** True when the file's magic bytes match the extension it claims. */
async function hasValidFileSignature(file, type) {
  let handle;
  try {
    handle = await fs.open(file.path, "r");
    const buffer = Buffer.alloc(1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const header = buffer.subarray(0, bytesRead);

    if (type === "pdf") return header.includes(Buffer.from("%PDF-"));

    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ext === ".jpg" || ext === ".jpeg") {
      return bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    }
    if (ext === ".png") {
      return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (ext === ".webp") {
      return bytesRead >= 12 &&
        header.toString("ascii", 0, 4) === "RIFF" &&
        header.toString("ascii", 8, 12) === "WEBP";
    }
    return false;
  } catch {
    return false;
  } finally {
    if (handle) await handle.close().catch(() => {});
  }
}

/** Deletes a multer temp file, tolerating one that was already moved. */
async function removeTempUpload(file) {
  try {
    if (file?.path) await fs.unlink(file.path);
  } catch {}
}

/** Deletes several multer temp files, tolerating ones already moved. */
async function removeTempUploads(files = []) {
  await Promise.all(files.map(removeTempUpload));
}

/** Deletes a file already in its final location, tolerating a missing one. */
async function removeStoredFile(storedPath) {
  try {
    await fs.unlink(storedPath);
  } catch {}
}

/** True when a book already has a regular file stored under that name. */
async function hasValidStoredFile(bookId, filename) {
  if (!filename || path.basename(filename) !== filename) return false;
  try {
    const stat = await fs.stat(path.join(UPLOAD_DIR, String(bookId), filename));
    return stat.isFile();
  } catch {
    return false;
  }
}

async function removePreviousMedia(bookId, url, replacementPath) {
  const prefix = `/uploads/lexora-books/${bookId}/`;
  if (typeof url !== "string" || !url.startsWith(prefix)) return;
  const filename = url.slice(prefix.length);
  if (!filename || path.basename(filename) !== filename) return;
  const oldPath = path.join(UPLOAD_DIR, String(bookId), filename);
  if (oldPath === replacementPath) return;
  await removeStoredFile(oldPath);
}

function parseBookId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function getSessionUserId(req) {
  return parseBookId(req.session?.user?.id);
}

/**
 * Loads a book and applies the same access rule as the reader endpoint:
 * managers, the book's owner, or anyone for a published public book.
 * School scope (category assignments) is checked after those rules —
 * defense in depth, so a direct request cannot read another school's
 * titles, pages, bookmarks, or progress.
 * Returns { book } or { error: { status, message } }.
 */
async function resolveAccessibleBook(req) {
  const bookId = parseBookId(req.params.id);
  if (!bookId) return { error: { status: 400, message: "Invalid book ID" } };

  const book = await LexoraBookModel.getById(bookId, { scope: req.schoolScope });
  if (!book.success) return { error: { status: 404, message: book.error } };

  const user = req.session?.user;
  const isManager = user ? await userHasPermission(req, "manage_lexora_books") : false;
  const isOwner = user && Number(book.data.created_by) === Number(user.id);
  const isPublic = book.data.status === "published" && book.data.visibility === "public";
  if (!isPublic && !isManager && !isOwner) {
    return { error: { status: user ? 403 : 401, message: "Access denied" } };
  }

  const { bookAccess } = require("../features/organization");
  const access = await bookAccess.isLexoraBookAccessible(req.schoolScope, bookId);
  if (access.success && !access.accessible) {
    return { error: { status: 404, message: "Book not found" } };
  }

  return { book: book.data };
}

/** Rejects page numbers past the book's known length (0 = unknown length). */
function pageBoundError(book, pageNum) {
  const total = Number(book.total_pages) || 0;
  if (total > 0 && pageNum > total) {
    return `page_number must be between 1 and ${total}`;
  }
  return null;
}

/**
 * School-scope-only check for user-scoped endpoints (bookmarks,
 * progress): is this book visible to the caller at all?
 * Returns false for a book of another school (indistinguishable
 * from "Book not found").
 */
async function isBookAccessible(req) {
  const { bookAccess } = require("../features/organization");
  const bookId = parseBookId(req.params.id);
  if (!bookId) return false;
  const access = await bookAccess.isLexoraBookAccessible(req.schoolScope, bookId);
  return !access.success ? true : access.accessible;
}

// ───────────────────────────────────────────────────────────
//  CRUD
// ───────────────────────────────────────────────────────────

const getLexoraBooks = async (req, res) => {
  try {
    const {
      program, subjectCourse, search, status, visibility, source_type,
      category_id, tag_id, page, pageSize, sortBy,
    } = req.query;

    const rawPage  = Number(page);
    const rawSize  = Number(pageSize);
    const usePaging = Number.isSafeInteger(rawPage) && rawPage >= 1;

    const result = await LexoraBookModel.getAll({
      program, search, status, visibility, source_type, category_id, tag_id,
      ...(usePaging
        ? {
            page: Math.floor(rawPage),
            pageSize: Number.isSafeInteger(rawSize) && rawSize > 0
              ? Math.min(100, Math.floor(rawSize))
              : 25,
          }
        : {}),
      sortBy,
      scope: req.schoolScope,
    });
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("[LexoraController.getAll]", error.message);
    res.status(500).json(errorResponse("Failed to fetch Lexora books", 500));
  }
};

const getLexoraBook = async (req, res) => {
  try {
    const result = await LexoraBookModel.getById(req.params.id, { scope: req.schoolScope });
    if (!result.success) return res.status(404).json(errorResponse(result.error, 404));

    const [categoryResult, tagResult, pageResult] = await Promise.all([
      LexoraBookModel.getCategories(req.params.id),
      LexoraBookModel.getTags(req.params.id),
      LexoraBookModel.getBookPages(req.params.id),
    ]);
    if (!categoryResult.success || !tagResult.success || !pageResult.success) {
      return res.status(500).json(errorResponse("Failed to load book details", 500));
    }

    res.json({
      success: true,
      data: {
        ...result.data,
        categories: categoryResult.data,
        tags: tagResult.data,
        pages: pageResult.data,
      },
    });
  } catch (error) {
    console.error("[LexoraController.getOne]", error.message);
    res.status(500).json(errorResponse("Failed to fetch book", 500));
  }
};

const createLexoraBook = async (req, res) => {
  try {
    const result = await LexoraBookModel.create({
      ...req.body,
      created_by: req.session.user.id,
      status: "draft",
      published_at: null,
    });
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

    await auditService.logAction(req, {
      entity_type : "lexora_book",
      entity_id   : result.data?.id ?? null,
      action      : "CREATE",
      old_data    : null,
      new_data    : { title: result.data?.title, source_type: result.data?.source_type },
    });

    res.status(201).json(successResponse(result.data, "Lexora book created", 201));
  } catch (error) {
    console.error("[LexoraController.create]", error.message);
    res.status(500).json(errorResponse("Failed to create book", 500));
  }
};

const updateLexoraBook = async (req, res) => {
  try {
    const existing = await LexoraBookModel.getById(req.params.id);
    if (!existing.success) return res.status(404).json(errorResponse(existing.error, 404));

    const oldData = { ...existing.data };
    const result  = await LexoraBookModel.update(req.params.id, {
      ...req.body,
      created_by: existing.data.created_by,
      status: existing.data.status,
      published_at: existing.data.published_at,
    });
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

    await auditService.logAction(req, {
      entity_type : "lexora_book",
      entity_id   : Number(req.params.id),
      action      : "UPDATE",
      old_data    : { title: oldData.title, status: oldData.status },
      new_data    : { title: result.data.title, status: result.data.status },
    });

    res.json(successResponse(result.data, "Book updated"));
  } catch (error) {
    console.error("[LexoraController.update]", error.message);
    res.status(500).json(errorResponse("Failed to update book", 500));
  }
};

const deleteLexoraBook = async (req, res) => {
  try {
    const result = await LexoraBookModel.delete(req.params.id);
    if (!result.success) return res.status(404).json(errorResponse(result.error, 404));

    await auditService.logAction(req, {
      entity_type : "lexora_book",
      entity_id   : Number(req.params.id),
      action      : "DELETE",
      old_data    : null,
      new_data    : null,
    });

    res.json(successResponse(result.data, "Book deleted"));
  } catch (error) {
    console.error("[LexoraController.delete]", error.message);
    res.status(500).json(errorResponse("Failed to delete book", 500));
  }
};

const publishLexoraBook = async (req, res) => {
  try {
    const existing = await LexoraBookModel.getById(req.params.id);
    if (!existing.success) return res.status(404).json(errorResponse(existing.error, 404));

    const book = existing.data;
    if (!book.title?.trim()) {
      return res.status(400).json(errorResponse("A title is required before publishing.", 400));
    }
    if (book.source_type === "pdf") {
      const expectedPrefix = `/uploads/lexora-books/${book.id}/`;
      const filename = path.basename(book.pdf_url || "");
      const pdfOnDisk = await hasValidStoredFile(book.id, filename);
      if (
        !book.pdf_url?.startsWith(expectedPrefix) ||
        !filename ||
        filename === "." ||
        filename === ".." ||
        path.extname(filename) !== ".pdf" ||
        !pdfOnDisk
      ) {
        return res.status(400).json(errorResponse("Upload a valid PDF before publishing.", 400));
      }
    } else if (book.source_type === "images") {
      const pages = await LexoraBookModel.getBookPages(book.id);
      if (!pages.success) return res.status(500).json(errorResponse("Failed to validate book pages.", 500));
      if (!pages.data.length) {
        return res.status(400).json(errorResponse("Upload at least one page image before publishing.", 400));
      }
    } else {
      return res.status(400).json(errorResponse("Choose a PDF or image source before publishing.", 400));
    }
    if (!book.cover_url && !book.thumbnail_url) {
      return res.status(400).json(errorResponse("Upload a cover or thumbnail before publishing.", 400));
    }

    const result = await LexoraBookModel.update(req.params.id, { status: "published", published_at: new Date() });
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(result.data, "Book published"));
  } catch (error) {
    console.error("[LexoraController.publish]", error.message);
    res.status(500).json(errorResponse("Failed to publish book", 500));
  }
};

const unpublishLexoraBook = async (req, res) => {
  try {
    const result = await LexoraBookModel.update(req.params.id, {
      status: "draft",
      published_at: null,
    });
    if (!result.success) return res.status(404).json(errorResponse(result.error, 404));
    res.json(successResponse(result.data, "Book returned to draft"));
  } catch (error) {
    console.error("[LexoraController.unpublish]", error.message);
    res.status(500).json(errorResponse("Failed to unpublish book", 500));
  }
};

const archiveLexoraBook = async (req, res) => {
  try {
    const result = await LexoraBookModel.update(req.params.id, { status: "archived" });
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(result.data, "Book archived"));
  } catch (error) {
    console.error("[LexoraController.archive]", error.message);
    res.status(500).json(errorResponse("Failed to archive book", 500));
  }
};

const restoreLexoraBook = async (req, res) => {
  try {
    const result = await LexoraBookModel.update(req.params.id, { status: "draft" });
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(result.data, "Book restored to draft"));
  } catch (error) {
    console.error("[LexoraController.restore]", error.message);
    res.status(500).json(errorResponse("Failed to restore book", 500));
  }
};

// ───────────────────────────────────────────────────────────
//  Categories / Tags
// ───────────────────────────────────────────────────────────

const getCategories = async (req, res) => {
  try {
    const result = await LexoraBookModel.getCategories();
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[LexoraController.getCategories]", error.message);
    res.status(500).json(errorResponse("Failed to fetch categories", 500));
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json(errorResponse("Category name is required", 400));
    const result = await LexoraBookModel.createCategory(name.trim());
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.status(201).json(successResponse(result.data, "Category created", 201));
  } catch (error) {
    console.error("[LexoraController.createCategory]", error.message);
    res.status(500).json(errorResponse("Failed to create category", 500));
  }
};

const deleteCategory = async (req, res) => {
  try {
    const categoryId = Number(req.params.id);
    if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json(errorResponse("Invalid category ID", 400));
    }
    const result = await LexoraBookModel.deleteCategory(categoryId);
    if (!result.success) {
      const status = result.error === "Category not found" ? 404 : 400;
      return res.status(status).json(errorResponse(result.error, status));
    }
    res.json(successResponse(null, "Category deleted"));
  } catch (error) {
    console.error("[LexoraController.deleteCategory]", error.message);
    res.status(500).json(errorResponse("Failed to delete category", 500));
  }
};

// ───────────────────────────────────────────────────────────
//  Resource Types
// ───────────────────────────────────────────────────────────

const getResourceTypes = async (req, res) => {
  try {
    const result = await LexoraBookModel.getResourceTypes();
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[LexoraController.getResourceTypes]", error.message);
    res.status(500).json(errorResponse("Failed to fetch resource types", 500));
  }
};

const createResourceType = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json(errorResponse("Resource type name is required", 400));
    const result = await LexoraBookModel.createResourceType(name.trim());
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.status(201).json(successResponse(result.data, "Resource type created", 201));
  } catch (error) {
    console.error("[LexoraController.createResourceType]", error.message);
    res.status(500).json(errorResponse("Failed to create resource type", 500));
  }
};

const deleteResourceType = async (req, res) => {
  try {
    const resourceTypeId = Number(req.params.id);
    if (!Number.isSafeInteger(resourceTypeId) || resourceTypeId <= 0) {
      return res.status(400).json(errorResponse("Invalid resource type ID", 400));
    }
    const result = await LexoraBookModel.deleteResourceType(resourceTypeId);
    if (!result.success) {
      const status = /not found/i.test(result.error) ? 404 : 400;
      return res.status(status).json(errorResponse(result.error, status));
    }
    res.json(successResponse(null, "Resource type deleted"));
  } catch (error) {
    console.error("[LexoraController.deleteResourceType]", error.message);
    res.status(500).json(errorResponse("Failed to delete resource type", 500));
  }
};

const getTags = async (req, res) => {
  try {
    const result = await LexoraBookModel.getTags();
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[LexoraController.getTags]", error.message);
    res.status(500).json(errorResponse("Failed to fetch tags", 500));
  }
};

const createTag = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json(errorResponse("Tag name is required", 400));
    const result = await LexoraBookModel.createTag(name.trim());
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.status(201).json(successResponse(result.data, "Tag created", 201));
  } catch (error) {
    console.error("[LexoraController.createTag]", error.message);
    res.status(500).json(errorResponse("Failed to create tag", 500));
  }
};

const deleteTag = async (req, res) => {
  try {
    const tagId = Number(req.params.id);
    if (!Number.isSafeInteger(tagId) || tagId <= 0) {
      return res.status(400).json(errorResponse("Invalid tag ID", 400));
    }
    const result = await LexoraBookModel.deleteTag(tagId);
    if (!result.success) {
      const status = result.error === "Tag not found" ? 404 : 400;
      return res.status(status).json(errorResponse(result.error, status));
    }
    res.json(successResponse(null, "Tag deleted"));
  } catch (error) {
    console.error("[LexoraController.deleteTag]", error.message);
    res.status(500).json(errorResponse("Failed to delete tag", 500));
  }
};

// ───────────────────────────────────────────────────────────
//  Book Categories / Tags assignment
// ───────────────────────────────────────────────────────────

const setBookCategories = async (req, res) => {
  try {
    const result = await LexoraBookModel.setBookCategories(req.params.id, req.body.category_ids || []);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(null, "Categories updated"));
  } catch (error) {
    console.error("[LexoraController.setBookCategories]", error.message);
    res.status(500).json(errorResponse("Failed to update categories", 500));
  }
};

const setBookTags = async (req, res) => {
  try {
    const result = await LexoraBookModel.setBookTags(req.params.id, req.body.tag_ids || []);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(null, "Tags updated"));
  } catch (error) {
    console.error("[LexoraController.setBookTags]", error.message);
    res.status(500).json(errorResponse("Failed to update tags", 500));
  }
};

// ───────────────────────────────────────────────────────────
//  Book Pages
// ───────────────────────────────────────────────────────────

const getBookPages = async (req, res) => {
  try {
    const result = await LexoraBookModel.getBookPages(req.params.id);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[LexoraController.getBookPages]", error.message);
    res.status(500).json(errorResponse("Failed to fetch pages", 500));
  }
};

const addBookPage = async (req, res) => {
  try {
    const result = await LexoraBookModel.addBookPage(req.params.id, req.body);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.status(201).json(successResponse(result.data, "Page added", 201));
  } catch (error) {
    console.error("[LexoraController.addBookPage]", error.message);
    res.status(500).json(errorResponse("Failed to add page", 500));
  }
};

const updateBookPage = async (req, res) => {
  try {
    const result = await LexoraBookModel.updateBookPage(req.params.pageId, req.body);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(result.data, "Page updated"));
  } catch (error) {
    console.error("[LexoraController.updateBookPage]", error.message);
    res.status(500).json(errorResponse("Failed to update page", 500));
  }
};

const deleteBookPage = async (req, res) => {
  try {
    const result = await LexoraBookModel.deleteBookPage(req.params.pageId);
    if (!result.success) return res.status(404).json(errorResponse(result.error, 404));
    const bookId = parseBookId(result.data.book_id);
    if (bookId) {
      const pages = await LexoraBookModel.getBookPages(bookId);
      if (!pages.success) return res.status(500).json(errorResponse(pages.error || "Page deleted but book page count could not be updated", 500));
      const reorderResult = await LexoraBookModel.reorderBookPages(bookId, pages.data.map((page) => page.id));
      if (!reorderResult.success) return res.status(500).json(errorResponse(reorderResult.error || "Page deleted but page order could not be updated", 500));
      const updateResult = await LexoraBookModel.update(bookId, { total_pages: pages.data.length });
      if (!updateResult.success) return res.status(500).json(errorResponse(updateResult.error || "Page deleted but book page count could not be updated", 500));
      await removePreviousMedia(bookId, result.data.image_url);
    }
    res.json(successResponse(null, "Page deleted"));
  } catch (error) {
    console.error("[LexoraController.deleteBookPage]", error.message);
    res.status(500).json(errorResponse("Failed to delete page", 500));
  }
};

const replaceBookPageImage = async (req, res) => {
  let destPath;
  try {
    if (!req.file) return res.status(400).json(errorResponse("Page image is required", 400));
    const bookId = parseBookId(req.params.id);
    if (!bookId) {
      await removeTempUpload(req.file);
      return res.status(400).json(errorResponse("Invalid book ID", 400));
    }
    const book = await LexoraBookModel.getById(bookId);
    if (!book.success) {
      await removeTempUpload(req.file);
      return res.status(404).json(errorResponse(book.error, 404));
    }
    const pages = await LexoraBookModel.getBookPages(bookId);
    if (!pages.success) {
      await removeTempUpload(req.file);
      return res.status(500).json(errorResponse(pages.error || "Failed to read book pages", 500));
    }
    const page = pages.data.find((item) => String(item.id) === String(req.params.pageId));
    if (!page) {
      await removeTempUpload(req.file);
      return res.status(404).json(errorResponse("Book page not found", 404));
    }
    if (!(await hasValidFileSignature(req.file, "image"))) {
      await removeTempUpload(req.file);
      return res.status(400).json(errorResponse("The uploaded file is not a valid image.", 400));
    }
    const filename = safeFilename(req.file.originalname);
    destPath = path.join(await ensureBookDir(bookId), filename);
    await fs.rename(req.file.path, destPath);
    const imageUrl = `/uploads/lexora-books/${bookId}/${filename}`;
    const updated = await LexoraBookModel.updateBookPage(page.id, {
      image_url: imageUrl,
      file_size: req.file.size,
    });
    if (!updated.success) {
      await removeStoredFile(destPath);
      return res.status(400).json(errorResponse(updated.error, 400));
    }
    await removePreviousMedia(bookId, page.image_url, destPath);
    res.json(successResponse(updated.data, "Page image replaced"));
  } catch (error) {
    await removeTempUpload(req.file);
    if (destPath) await removeStoredFile(destPath);
    console.error("[LexoraController.replaceBookPageImage]", error.message);
    res.status(500).json(errorResponse("Failed to replace page image", 500));
  }
};

const reorderBookPages = async (req, res) => {
  try {
    const { page_ids } = req.body;
    if (!Array.isArray(page_ids)) return res.status(400).json(errorResponse("page_ids array required", 400));
    const result = await LexoraBookModel.reorderBookPages(req.params.id, page_ids);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(null, "Pages reordered"));
  } catch (error) {
    console.error("[LexoraController.reorderBookPages]", error.message);
    res.status(500).json(errorResponse("Failed to reorder pages", 500));
  }
};

// ───────────────────────────────────────────────────────────
//  File uploads
// ───────────────────────────────────────────────────────────

const uploadBookPdf = async (req, res) => {
  let destPath;
  try {
    if (!req.file) return res.status(400).json(errorResponse("PDF file is required", 400));
    const bookId = parseBookId(req.params.id);
    if (!bookId) {
      await removeTempUpload(req.file);
      return res.status(400).json(errorResponse("Invalid book ID", 400));
    }
    const book = await LexoraBookModel.getById(bookId);
    if (!book.success) {
      await removeTempUpload(req.file);
      return res.status(404).json(errorResponse(book.error, 404));
    }
    if (!(await hasValidFileSignature(req.file, "pdf"))) {
      await removeTempUpload(req.file);
      return res.status(400).json(errorResponse("The uploaded file is not a valid PDF.", 400));
    }
    const bookDir = await ensureBookDir(bookId);
    const filename = safeFilename(req.file.originalname);
    destPath = path.join(bookDir, filename);
    await fs.rename(req.file.path, destPath);

    const pdfUrl = `/uploads/lexora-books/${bookId}/${filename}`;
    const result = await LexoraBookModel.update(bookId, {
      pdf_url: pdfUrl,
      source_type: "pdf",
      file_size: req.file.size,
    });
    if (!result.success) {
      await removeStoredFile(destPath);
      return res.status(400).json(errorResponse(result.error, 400));
    }
    await removePreviousMedia(bookId, book.data.pdf_url, destPath);
    res.json(successResponse({ pdf_url: pdfUrl, file_size: req.file.size }, "PDF uploaded"));
  } catch (error) {
    await removeTempUpload(req.file);
    if (destPath) await removeStoredFile(destPath);
    console.error("[LexoraController.uploadBookPdf]", error.message);
    res.status(500).json(errorResponse("Failed to upload PDF", 500));
  }
};

const removeBookPdf = async (req, res) => {
  try {
    const bookId = parseBookId(req.params.id);
    if (!bookId) return res.status(400).json(errorResponse("Invalid book ID", 400));
    const book = await LexoraBookModel.getById(bookId);
    if (!book.success) return res.status(404).json(errorResponse(book.error, 404));
    const removingPdfSource = book.data.source_type === "pdf";
    const result = await LexoraBookModel.update(bookId, {
      pdf_url: null,
      total_pages: removingPdfSource ? null : book.data.total_pages,
      file_size: removingPdfSource ? null : book.data.file_size,
      source_type: removingPdfSource ? null : book.data.source_type,
      status: "draft",
      published_at: null,
    });
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    removePreviousMedia(bookId, book.data.pdf_url);
    res.json(successResponse(result.data, "PDF removed"));
  } catch (error) {
    console.error("[LexoraController.removeBookPdf]", error.message);
    res.status(500).json(errorResponse("Failed to remove PDF", 500));
  }
};

const uploadBookCover = async (req, res) => {
  let destPath;
  try {
    if (!req.file) return res.status(400).json(errorResponse("Cover image is required", 400));
    const bookId = parseBookId(req.params.id);
    if (!bookId) {
      await removeTempUpload(req.file);
      return res.status(400).json(errorResponse("Invalid book ID", 400));
    }
    const book = await LexoraBookModel.getById(bookId);
    if (!book.success) {
      await removeTempUpload(req.file);
      return res.status(404).json(errorResponse(book.error, 404));
    }
    if (!(await hasValidFileSignature(req.file, "image"))) {
      await removeTempUpload(req.file);
      return res.status(400).json(errorResponse("The uploaded file is not a valid image.", 400));
    }
    const bookDir = await ensureBookDir(bookId);
    const filename = safeFilename(req.file.originalname);
    destPath = path.join(bookDir, filename);
    await fs.rename(req.file.path, destPath);

    const coverUrl = `/uploads/lexora-books/${bookId}/${filename}`;
    const result = await LexoraBookModel.update(bookId, { cover_url: coverUrl });
    if (!result.success) {
      await removeStoredFile(destPath);
      return res.status(400).json(errorResponse(result.error, 400));
    }
    await removePreviousMedia(bookId, book.data.cover_url, destPath);
    res.json(successResponse({ cover_url: coverUrl }, "Cover uploaded"));
  } catch (error) {
    await removeTempUpload(req.file);
    if (destPath) await removeStoredFile(destPath);
    console.error("[LexoraController.uploadBookCover]", error.message);
    res.status(500).json(errorResponse("Failed to upload cover", 500));
  }
};

const removeBookCover = async (req, res) => {
  try {
    const bookId = parseBookId(req.params.id);
    if (!bookId) return res.status(400).json(errorResponse("Invalid book ID", 400));
    const book = await LexoraBookModel.getById(bookId);
    if (!book.success) return res.status(404).json(errorResponse(book.error, 404));
    const result = await LexoraBookModel.update(bookId, { cover_url: null });
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    removePreviousMedia(bookId, book.data.cover_url);
    res.json(successResponse(result.data, "Cover removed"));
  } catch (error) {
    console.error("[LexoraController.removeBookCover]", error.message);
    res.status(500).json(errorResponse("Failed to remove cover", 500));
  }
};

const uploadBookThumbnail = async (req, res) => {
  let destPath;
  try {
    if (!req.file) return res.status(400).json(errorResponse("Thumbnail image is required", 400));
    const bookId = parseBookId(req.params.id);
    if (!bookId) {
      await removeTempUpload(req.file);
      return res.status(400).json(errorResponse("Invalid book ID", 400));
    }
    const book = await LexoraBookModel.getById(bookId);
    if (!book.success) {
      await removeTempUpload(req.file);
      return res.status(404).json(errorResponse(book.error, 404));
    }
    if (!(await hasValidFileSignature(req.file, "image"))) {
      await removeTempUpload(req.file);
      return res.status(400).json(errorResponse("The uploaded file is not a valid image.", 400));
    }
    const bookDir = await ensureBookDir(bookId);
    const filename = safeFilename(req.file.originalname);
    destPath = path.join(bookDir, filename);
    await fs.rename(req.file.path, destPath);

    const thumbnailUrl = `/uploads/lexora-books/${bookId}/${filename}`;
    const result = await LexoraBookModel.update(bookId, { thumbnail_url: thumbnailUrl });
    if (!result.success) {
      await removeStoredFile(destPath);
      return res.status(400).json(errorResponse(result.error, 400));
    }
    await removePreviousMedia(bookId, book.data.thumbnail_url, destPath);
    res.json(successResponse({ thumbnail_url: thumbnailUrl }, "Thumbnail uploaded"));
  } catch (error) {
    await removeTempUpload(req.file);
    if (destPath) await removeStoredFile(destPath);
    console.error("[LexoraController.uploadBookThumbnail]", error.message);
    res.status(500).json(errorResponse("Failed to upload thumbnail", 500));
  }
};

const uploadBookPages = async (req, res) => {
  const movedPaths = [];
  try {
    if (!req.files?.length) return res.status(400).json(errorResponse("Page images are required", 400));
    const bookId = parseBookId(req.params.id);
    if (!bookId) {
      await removeTempUploads(req.files);
      return res.status(400).json(errorResponse("Invalid book ID", 400));
    }
    const book = await LexoraBookModel.getById(bookId);
    if (!book.success) {
      await removeTempUploads(req.files);
      return res.status(404).json(errorResponse(book.error, 404));
    }

    // Verify every image before any of them leaves the temp folder, so a
    // rejected batch cannot leave orphaned files in the book's directory.
    const signatures = await Promise.all(
      req.files.map((file) => hasValidFileSignature(file, "image"))
    );    if (signatures.some((valid) => !valid)) {
      await removeTempUploads(req.files);
      return res.status(400).json(errorResponse("One or more uploads are not valid images.", 400));
    }

    const bookDir = await ensureBookDir(bookId);
    const staged = [];
    for (const file of req.files) {
      const filename = safeFilename(file.originalname);
      const destPath = path.join(bookDir, filename);
      await fs.rename(file.path, destPath);
      movedPaths.push(destPath);
      staged.push({
        image_url: `/uploads/lexora-books/${bookId}/${filename}`,
        file_size: file.size,
      });
    }

    // One transaction assigns page numbers and refreshes total_pages, so
    // concurrent uploads for the same book cannot collide or lose counts.
    const result = await LexoraBookModel.addBookPages(bookId, staged);
    if (!result.success) {
      await Promise.all(movedPaths.map(removeStoredFile));
      return res.status(400).json(errorResponse(result.error, 400));
    }

    res.status(201).json(successResponse(result.data, `${result.data.length} pages uploaded`, 201));
  } catch (error) {
    await removeTempUploads(req.files || []);
    await Promise.all(movedPaths.map(removeStoredFile));
    console.error("[LexoraController.uploadBookPages]", error.message);
    res.status(500).json(errorResponse("Failed to upload pages", 500));
  }
};

// ───────────────────────────────────────────────────────────
//  Bookmarks & Progress
// ───────────────────────────────────────────────────────────

const getBookmarks = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json(errorResponse("Unauthorized", 401));

    // School scope: bookmarks of another school's book are not readable.
    const accessible = await isBookAccessible(req);
    if (!accessible) return res.status(404).json(errorResponse("Book not found", 404));

    const result = await LexoraBookModel.getUserBookmarks(userId, req.params.id);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[LexoraController.getBookmarks]", error.message);
    res.status(500).json(errorResponse("Failed to fetch bookmarks", 500));
  }
};

const getMyBookmarks = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json(errorResponse("Unauthorized", 401));
    const result = await LexoraBookModel.getUserBookmarks(userId);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

    // School scope: keep only bookmarks on accessible books.
    const { bookAccess } = require("../features/organization");
    const { pool } = require("../config/db");
    const { lexoraBookScopeSql } = require("../features/organization/bookAccess.service");
    const rows = Array.isArray(result.data) ? result.data : [result.data].filter(Boolean);
    const scope = lexoraBookScopeSql(req.schoolScope);
    if (scope.sql && rows.length) {
      const ids = [...new Set(rows.map((r) => r.book_id).filter(Boolean))];
      if (ids.length) {
        const [allowed] = await pool.query(
          `SELECT lb.id FROM lexora_books lb WHERE lb.id IN (${ids.map(() => "?").join(", ")}) ${scope.sql}`,
          [...ids, ...scope.params]
        );
        const allowedSet = new Set(allowed.map((r) => r.id));
        const filtered = rows.filter((r) => allowedSet.has(r.book_id));
        return res.json({ success: true, data: filtered });
      }
      return res.json({ success: true, data: [] });
    }
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("[LexoraController.getMyBookmarks]", error.message);
    res.status(500).json(errorResponse("Failed to fetch bookmarks", 500));
  }
};

const addBookmark = async (req, res) => {
  try {
    const userId   = getSessionUserId(req);
    const pageNum  = Number(req.body.page_number);
    if (!userId) return res.status(401).json(errorResponse("Unauthorized", 401));
    if (!Number.isSafeInteger(pageNum) || pageNum < 1) {
      return res.status(400).json(errorResponse("page_number must be a positive integer", 400));
    }

    const { book, error } = await resolveAccessibleBook(req);
    if (error) return res.status(error.status).json(errorResponse(error.message, error.status));

    const bound = pageBoundError(book, pageNum);
    if (bound) return res.status(400).json(errorResponse(bound, 400));

    const result = await LexoraBookModel.addBookmark(userId, book.id, pageNum);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.status(201).json(successResponse(result.data, "Bookmark added", 201));
  } catch (error) {
    console.error("[LexoraController.addBookmark]", error.message);
    res.status(500).json(errorResponse("Failed to add bookmark", 500));
  }
};

const removeBookmark = async (req, res) => {
  try {
    const userId  = getSessionUserId(req);
    const bookId  = parseBookId(req.params.id);
    const pageNum = Number(req.params.page);
    if (!userId) return res.status(401).json(errorResponse("Unauthorized", 401));
    if (!bookId) return res.status(400).json(errorResponse("Invalid book ID", 400));
    if (!Number.isSafeInteger(pageNum) || pageNum < 1) {
      return res.status(400).json(errorResponse("page must be a positive integer", 400));
    }

    // School scope: no mutating bookmarks on another school's book.
    const accessible = await isBookAccessible(req);
    if (!accessible) return res.status(404).json(errorResponse("Book not found", 404));

    const result = await LexoraBookModel.removeBookmark(userId, bookId, pageNum);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(null, "Bookmark removed"));
  } catch (error) {
    console.error("[LexoraController.removeBookmark]", error.message);
    res.status(500).json(errorResponse("Failed to remove bookmark", 500));
  }
};

const getReadingProgress = async (req, res) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) return res.status(401).json(errorResponse("Unauthorized", 401));

    // School scope: progress of another school's book is not readable.
    const accessible = await isBookAccessible(req);
    if (!accessible) return res.status(404).json(errorResponse("Book not found", 404));

    const result = await LexoraBookModel.getReadingProgress(userId, req.params.id);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[LexoraController.getReadingProgress]", error.message);
    res.status(500).json(errorResponse("Failed to fetch reading progress", 500));
  }
};

const saveReadingProgress = async (req, res) => {
  try {
    const userId  = getSessionUserId(req);
    const pageNum = Number(req.body.page_number);
    if (!userId) return res.status(401).json(errorResponse("Unauthorized", 401));
    if (!Number.isSafeInteger(pageNum) || pageNum < 1) {
      return res.status(400).json(errorResponse("page_number must be a positive integer", 400));
    }

    const { book, error } = await resolveAccessibleBook(req);
    if (error) return res.status(error.status).json(errorResponse(error.message, error.status));

    const bound = pageBoundError(book, pageNum);
    if (bound) return res.status(400).json(errorResponse(bound, 400));

    const result = await LexoraBookModel.upsertReadingProgress(userId, book.id, pageNum);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json(successResponse(result.data, "Progress saved"));
  } catch (error) {
    console.error("[LexoraController.saveReadingProgress]", error.message);
    res.status(500).json(errorResponse("Failed to save reading progress", 500));
  }
};

const getBookStats = async (req, res) => {
  try {
    const result = await LexoraBookModel.getBookStats(req.params.id);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[LexoraController.getBookStats]", error.message);
    res.status(500).json(errorResponse("Failed to fetch book stats", 500));
  }
};

// ───────────────────────────────────────────────────────────
//  Legacy import (preserved)
// ───────────────────────────────────────────────────────────

const bulkLexoraImport = async (req, res) => {
  try {
    const {
      books, is_first_chunk = false, is_last_chunk = false,
      acc_imported = 0, acc_updated = 0, acc_errors = 0, acc_skippedCopies = 0,
    } = req.body;

    const result = await LexoraBookModel.bulkImport(books);
    if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

    const chunkImported      = result.imported      ?? 0;
    const chunkUpdated       = result.updated       ?? 0;
    const chunkErrors        = result.errors        ?? 0;
    const chunkSkippedCopies = result.skippedCopies ?? 0;

    if (is_last_chunk) {
      await auditService.logAction(req, {
        entity_type : "lexora_book",
        entity_id   : null,
        action      : "BULK_IMPORT",
        old_data    : null,
        new_data    : {
          imported      : acc_imported      + chunkImported,
          updated       : acc_updated       + chunkUpdated,
          errors        : acc_errors        + chunkErrors,
          skippedCopies : acc_skippedCopies + chunkSkippedCopies,
        },
      });
    }

    res.json({
      success: true, imported: chunkImported, updated: chunkUpdated,
      errors: chunkErrors, data: result.data || [],
      updatedBooks: result.updatedBooks || [],
      errorsDetail: result.errorsDetail || [],
      skippedCopies: chunkSkippedCopies,
    });
  } catch (error) {
    console.error("[LexoraController.bulkImport]", error.message);
    res.status(500).json(errorResponse("Failed to import Lexora books", 500));
  }
};

module.exports = {
  getLexoraBooks,
  getLexoraBook,
  createLexoraBook,
  updateLexoraBook,
  deleteLexoraBook,
  publishLexoraBook,
  unpublishLexoraBook,
  archiveLexoraBook,
  restoreLexoraBook,
  getCategories,
  createCategory,
  deleteCategory,
  getResourceTypes,
  createResourceType,
  deleteResourceType,
  getTags,
  createTag,
  deleteTag,
  setBookCategories,
  setBookTags,
  getBookPages,
  addBookPage,
  updateBookPage,
  deleteBookPage,
  replaceBookPageImage,
  reorderBookPages,
  uploadBookPdf,
  removeBookPdf,
  uploadBookCover,
  removeBookCover,
  uploadBookThumbnail,
  uploadBookPages,
  getBookmarks,
  getMyBookmarks,
  addBookmark,
  removeBookmark,
  getReadingProgress,
  saveReadingProgress,
  getBookStats,
  bulkLexoraImport,
};
