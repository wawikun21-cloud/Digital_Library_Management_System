const { pool } = require("../config/db");

function sanitize(str) {
  if (!str) return null;
  return String(str).replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 500);
}

const LexoraBookModel = {
  // ── Helpers ──────────────────────────────────────────────
  _applyCommonFilters(query, filters) {
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.visibility) {
      query = query.eq("visibility", filters.visibility);
    }
    if (filters.source_type) {
      query = query.eq("source_type", filters.source_type);
    }
    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      query = query.or(
        `title.ilike.${term},short_description.ilike.${term}`
      );
    }
    return query;
  },

  _sanitizeBookData(data) {
    const {
      title, author, source, year, resource_type, format,
      subject_course, program, collection, short_description,
      source_type, pdf_url, thumbnail_url, cover_url, download_url,
      publish_on, isbn10, isbn13, total_pages, dimensions,
      co_publisher, translator, asin, doi, llcn,
      weight_value, weight_unit, edition, status, visibility,
      created_by, published_at, slug, file_size, length, table_of_contents,
      ...rest
    } = data;
    let tableOfContents = table_of_contents ?? [];
    if (typeof tableOfContents === "string") tableOfContents = JSON.parse(tableOfContents);

    return {
      title:            sanitize(title) || title,
      author:           sanitize(author),
      source:           source || null,
      year:             year || null,
      resource_type:    resource_type || null,
      format:           format || null,
      subject_course:   sanitize(subject_course),
      program:          program || null,
      collection:       collection || null,
      short_description:short_description ? String(short_description).trim() : null,
      source_type:      source_type || null,
      pdf_url:          pdf_url || null,
      thumbnail_url:    thumbnail_url || null,
      cover_url:        cover_url || null,
      download_url:     download_url || null,
      publish_on:       publish_on || null,
      isbn10:           isbn10 ? String(isbn10).trim() : null,
      isbn13:           isbn13 ? String(isbn13).trim() : null,
      total_pages:      total_pages || null,
      dimensions:       dimensions ? String(dimensions).trim() : null,
      co_publisher:     co_publisher ? String(co_publisher).trim() : null,
      translator:       translator ? String(translator).trim() : null,
      asin:             asin ? String(asin).trim() : null,
      doi:              doi ? String(doi).trim() : null,
      llcn:             llcn ? String(llcn).trim() : null,
      weight_value:     weight_value || null,
      weight_unit:      weight_unit ? String(weight_unit).trim() : null,
      edition:          edition ? String(edition).trim() : null,
      status:           status || "draft",
      visibility:       visibility || "public",
      created_by:       created_by || null,
      published_at:     status === "published" && !published_at ? new Date() : (published_at || null),
      slug:             slug || slugify(title),
      file_size:        file_size || null,
      length:           length ? String(length).trim() : null,
      table_of_contents:JSON.stringify((Array.isArray(tableOfContents) ? tableOfContents : []).map((entry) => ({
        title: sanitize(entry.title).trim(),
        page_number: Number(entry.page_number),
      }))),
    };
  },

  _validateTableOfContents(data) {
    let entries = data.table_of_contents ?? [];
    if (typeof entries === "string") {
      try {
        entries = JSON.parse(entries);
      } catch {
        return "Table of contents must be a valid list of entries.";
      }
    }
    if (!Array.isArray(entries)) return "Table of contents must be a list of entries.";

    const totalPages = Number(data.total_pages);
    for (const [index, entry] of entries.entries()) {
      const page = Number(entry?.page_number);
      if (!String(entry?.title || "").trim() || !Number.isSafeInteger(page) || page < 1) {
        return `Table of contents entry ${index + 1} needs a title and a positive whole page number.`;
      }
      if (Number.isSafeInteger(totalPages) && totalPages > 0 && page > totalPages) {
        return `Table of contents entry ${index + 1} cannot be after page ${totalPages}.`;
      }
    }
    return null;
  },

  // ── CRUD ─────────────────────────────────────────────────

  async create(bookData) {
    try {
      const tocError = this._validateTableOfContents(bookData);
      if (tocError) return { success: false, error: tocError };

      const data = this._sanitizeBookData(bookData);
      if (!data.title?.trim()) return { success: false, error: "Title is required" };

      const [result] = await pool.query(
        `INSERT INTO lexora_books
          (title, slug, author, source, year, resource_type, format,
           subject_course, program, collection,
           short_description, source_type, pdf_url, thumbnail_url, cover_url,
           download_url, publish_on, isbn10, isbn13, total_pages, dimensions,
           length, file_size, co_publisher, translator, asin, doi, llcn,
           weight_value, weight_unit, edition, table_of_contents,
           status, visibility, created_by, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.title, data.slug, data.author, data.source, data.year,
          data.resource_type, data.format, data.subject_course,
          data.program, data.collection,
          data.short_description, data.source_type, data.pdf_url,
          data.thumbnail_url, data.cover_url, data.download_url,
          data.publish_on, data.isbn10, data.isbn13, data.total_pages,
          data.dimensions, data.length, data.file_size, data.co_publisher,
          data.translator, data.asin, data.doi, data.llcn,
          data.weight_value, data.weight_unit, data.edition, data.table_of_contents,
          data.status, data.visibility, data.created_by, data.published_at,
        ]
      );

      const [rows] = await pool.query("SELECT * FROM lexora_books WHERE id = ?", [result.insertId]);
      return { success: true, data: rows[0] };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return { success: false, error: "A book with this title/slug already exists." };
      }
      console.error("[LexoraBookModel.create]", error.message);
      return { success: false, error: error.message };
    }
  },

  async getById(id, options = {}) {
    try {
      const conditions = ["id = ?", "deleted_at IS NULL"]
      const params = [id]
      if (options.publishedOnly) {
        conditions.push("status = 'published'", "visibility = 'public'")
      }
      const where = conditions.join(" AND ")
      const [rows] = await pool.query(
        `SELECT * FROM lexora_books WHERE ${where} LIMIT 1`,
        params
      );
      if (!rows.length) return { success: false, error: "Book not found" }
      return { success: true, data: rows[0] }
    } catch (error) {
      console.error("[LexoraBookModel.getById]", error.message)
      return { success: false, error: error.message }
    }
  },

  async update(id, bookData) {
    try {
      const existing = await this.getById(id);
      if (!existing.success) return existing;

      const mergedData = { ...existing.data, ...bookData };
      const tocError = this._validateTableOfContents(mergedData);
      if (tocError) return { success: false, error: tocError };

      const data = this._sanitizeBookData(mergedData);
      if (bookData.status === "published" && !data.published_at) {
        data.published_at = new Date();
      }

      const fields = [];
      const values = [];
      const skip = ["id", "created_at", "deleted_at", "deleted_by"];

      for (const [key, value] of Object.entries(data)) {
        if (!skip.includes(key)) {
          fields.push(`\`${key}\` = ?`);
          values.push(value);
        }
      }

      values.push(id);
      await pool.query(`UPDATE lexora_books SET ${fields.join(", ")} WHERE id = ?`, values);

      const [rows] = await pool.query("SELECT * FROM lexora_books WHERE id = ?", [id]);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[LexoraBookModel.update]", error.message);
      return { success: false, error: error.message };
    }
  },

  async delete(id) {
    try {
      const existing = await this.getById(id);
      if (!existing.success) return existing;

      const TrashModel = require("./Trash");
      return TrashModel.softDelete("lexora_book", Number(id));
    } catch (error) {
      console.error("[LexoraBookModel.delete]", error.message);
      return { success: false, error: error.message };
    }
  },

  async getAll(filters = {}) {
    try {
      const conditions = ["deleted_at IS NULL"];
      const params = [];

      if (filters.status) {
        conditions.push("status = ?");
        params.push(filters.status);
      }
      if (filters.visibility) {
        conditions.push("visibility = ?");
        params.push(filters.visibility);
      }
      if (filters.source_type) {
        conditions.push("source_type = ?");
        params.push(filters.source_type);
      }
      if (filters.category_id) {
        conditions.push(`EXISTS (
          SELECT 1 FROM lexora_book_category_relations lcr
          WHERE lcr.book_id = lexora_books.id AND lcr.category_id = ?
        )`);
        params.push(filters.category_id);
      } else if (filters.category_slug) {
        conditions.push(`EXISTS (
          SELECT 1 FROM lexora_book_category_relations lcr
          INNER JOIN lexora_book_categories lc ON lc.id = lcr.category_id
          WHERE lcr.book_id = lexora_books.id AND lc.slug = ?
        )`);
        params.push(filters.category_slug);
      }
      if (filters.tag_id) {
        conditions.push(`EXISTS (
          SELECT 1 FROM lexora_book_tag_relations ltr
          WHERE ltr.book_id = lexora_books.id AND ltr.tag_id = ?
        )`);
        params.push(filters.tag_id);
      } else if (filters.tag_slug) {
        conditions.push(`EXISTS (
          SELECT 1 FROM lexora_book_tag_relations ltr
          INNER JOIN lexora_book_tags lt ON lt.id = ltr.tag_id
          WHERE ltr.book_id = lexora_books.id AND lt.slug = ?
        )`);
        params.push(filters.tag_slug);
      }
      if (filters.program) {
        conditions.push("program = ?");
        params.push(filters.program);
      }
      if (filters.resource_type) {
        conditions.push("resource_type = ?");
        params.push(filters.resource_type);
      }
      if (filters.search) {
        const term = `%${sanitize(filters.search).toLowerCase()}%`;
        conditions.push(
          `(LOWER(REPLACE(REPLACE(title, '\\n', ' '), '\\r', ' ')) LIKE ?
            OR LOWER(COALESCE(short_description,'')) LIKE ?)`
        );
        params.push(term, term);
      }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const [rows] = await pool.query(
        `SELECT lexora_books.*,
          (SELECT GROUP_CONCAT(lc.name ORDER BY lc.name SEPARATOR ', ')
           FROM lexora_book_category_relations lcr
           INNER JOIN lexora_book_categories lc ON lc.id = lcr.category_id
           WHERE lcr.book_id = lexora_books.id) AS category_names,
          (SELECT GROUP_CONCAT(lt.name ORDER BY lt.name SEPARATOR ', ')
           FROM lexora_book_tag_relations ltr
           INNER JOIN lexora_book_tags lt ON lt.id = ltr.tag_id
           WHERE ltr.book_id = lexora_books.id) AS tag_names
         FROM lexora_books ${where} ORDER BY created_at DESC`,
        params
      );

      const [programs] = await pool.query(
        "SELECT DISTINCT program FROM lexora_books WHERE program IS NOT NULL AND deleted_at IS NULL ORDER BY program"
      );
      const [resourceTypes] = await pool.query(
        "SELECT DISTINCT resource_type FROM lexora_books WHERE resource_type IS NOT NULL AND deleted_at IS NULL ORDER BY resource_type"
      );
      const [categoriesList] = await pool.query(
        "SELECT DISTINCT lc.id, lc.name, lc.slug FROM lexora_book_categories lc INNER JOIN lexora_book_category_relations lcr ON lc.id = lcr.category_id ORDER BY lc.name"
      );
      const [tagsList] = await pool.query(
        "SELECT DISTINCT lt.id, lt.name, lt.slug FROM lexora_book_tags lt INNER JOIN lexora_book_tag_relations ltr ON lt.id = ltr.tag_id ORDER BY lt.name"
      );

      return {
        success: true,
        data: rows,
        programs: programs.map((r) => r.program),
        resourceTypes: resourceTypes.map((r) => r.resource_type),
        categories: categoriesList,
        tags: tagsList,
      };
    } catch (error) {
      console.error("[LexoraBookModel.getAll]", error.message);
      return { success: false, error: error.message };
    }
  },

  async getPublic(filters = {}) {
    return this.getAll({
      ...filters,
      status: "published",
      visibility: "public",
    });
  },

  // ── Legacy upsert/import (preserved) ─────────────────────

  async upsertBook(conn, bookData) {
    try {
      const { title, author, source, year, resourceType, resource_type, format, subject_course, program, collection } = bookData;
      const resourceTypeVal = resourceType ?? resource_type;
      const titleVal = sanitize(title);
      const authorVal = sanitize(author);
      const programVal = program || collection || null;

      let bookId = null;
      let isNewBook = false;

      if (authorVal) {
        const [rows] = await conn.query(
          `SELECT id FROM lexora_books WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) AND LOWER(TRIM(COALESCE(author,''))) = LOWER(TRIM(?)) LIMIT 1`,
          [titleVal, authorVal]
        );
        if (rows.length) bookId = rows[0].id;
      } else {
        const [rows] = await conn.query(
          `SELECT id FROM lexora_books WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) AND (author IS NULL OR TRIM(author) = '') LIMIT 1`,
          [titleVal]
        );
        if (rows.length) bookId = rows[0].id;
      }

      if (!bookId) {
        isNewBook = true;
        const [result] = await conn.query(
          `INSERT INTO lexora_books (title, author, source, year, resource_type, format, subject_course, program, collection) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [titleVal, authorVal, source, year, resourceTypeVal, format, subject_course, programVal, programVal]
        );
        bookId = result.insertId;
      } else {
        await conn.query(
          `UPDATE lexora_books SET author = ?, source = ?, year = ?, resource_type = ?, format = ?, subject_course = ?, program = ?, collection = ? WHERE id = ?`,
          [authorVal, source, year, resourceTypeVal, format, subject_course, programVal, programVal, bookId]
        );
      }

      const [bookRows] = await pool.query("SELECT * FROM lexora_books WHERE id = ?", [bookId]);
      return { success: true, isNewBook, data: bookRows[0] };
    } catch (error) {
      console.error("[LexoraBookModel.upsertBook]", error.message);
      return { success: false, error: error.message };
    }
  },

  async bulkImport(books) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const results = [];
      const errors = [];

      for (const bookData of books) {
        const result = await this.upsertBook(conn, bookData);
        if (result.success) results.push(result);
        else errors.push({ title: bookData.title || "Unknown", error: result.error });
      }

      await conn.commit();
      return {
        success: true,
        imported: results.filter((r) => r.isNewBook).length,
        updated: results.filter((r) => !r.isNewBook).length,
        errors: errors.length,
        data: results.map((r) => r.data),
        updatedBooks: results.filter((r) => !r.isNewBook).map((r) => ({ title: r.data.title, author: r.data.author })),
        errorsDetail: errors,
      };
    } catch (error) {
      await conn.rollback();
      console.error("[LexoraBookModel.bulkImport]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },

  async checkDuplicates(books) {
    try {
      const duplicates = [];
      for (const book of books) {
        const titleVal = sanitize(book.title);
        const authorVal = sanitize(book.author);
        if (!titleVal) continue;

        let rows;
        if (authorVal) {
          [rows] = await pool.query(
            `SELECT id FROM lexora_books WHERE deleted_at IS NULL AND LOWER(TRIM(title)) = LOWER(TRIM(?)) AND LOWER(TRIM(COALESCE(author,''))) = LOWER(TRIM(?)) LIMIT 1`,
            [titleVal, authorVal]
          );
        } else {
          [rows] = await pool.query(
            `SELECT id FROM lexora_books WHERE deleted_at IS NULL AND LOWER(TRIM(title)) = LOWER(TRIM(?)) AND (author IS NULL OR TRIM(author) = '') LIMIT 1`,
            [titleVal]
          );
        }
        if (rows.length) duplicates.push({ title: book.title, author: book.author || null });
      }
      return { success: true, duplicates };
    } catch (error) {
      console.error("[LexoraBookModel.checkDuplicates]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Categories ───────────────────────────────────────────

  async getCategories(bookId = null) {
    try {
      if (bookId) {
        const [rows] = await pool.query(
          `SELECT lc.* FROM lexora_book_categories lc
           INNER JOIN lexora_book_category_relations lcr ON lc.id = lcr.category_id
           WHERE lcr.book_id = ? ORDER BY lc.name`,
          [bookId]
        );
        return { success: true, data: rows };
      }
      const [rows] = await pool.query("SELECT * FROM lexora_book_categories ORDER BY name");
      return { success: true, data: rows };
    } catch (error) {
      console.error("[LexoraBookModel.getCategories]", error.message);
      return { success: false, error: error.message };
    }
  },

  async createCategory(name) {
    try {
      const slug = slugify(name);
      const [result] = await pool.query(
        "INSERT INTO lexora_book_categories (name, slug) VALUES (?, ?)",
        [name.trim(), slug]
      );
      const [rows] = await pool.query("SELECT * FROM lexora_book_categories WHERE id = ?", [result.insertId]);
      return { success: true, data: rows[0] };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        const [rows] = await pool.query("SELECT * FROM lexora_book_categories WHERE slug = ?", [slugify(name)]);
        return { success: true, data: rows[0] };
      }
      console.error("[LexoraBookModel.createCategory]", error.message);
      return { success: false, error: error.message };
    }
  },

  async setBookCategories(bookId, categoryIds) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM lexora_book_category_relations WHERE book_id = ?", [bookId]);
      if (categoryIds?.length) {
        const values = categoryIds.map((cid) => [bookId, cid]);
        await conn.query(
          "INSERT INTO lexora_book_category_relations (book_id, category_id) VALUES ?",
          [values]
        );
      }
      await conn.commit();
      return { success: true };
    } catch (error) {
      await conn.rollback();
      console.error("[LexoraBookModel.setBookCategories]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },

  // ── Tags ─────────────────────────────────────────────────

  async getTags(bookId = null) {
    try {
      if (bookId) {
        const [rows] = await pool.query(
          `SELECT lt.* FROM lexora_book_tags lt
           INNER JOIN lexora_book_tag_relations ltr ON lt.id = ltr.tag_id
           WHERE ltr.book_id = ? ORDER BY lt.name`,
          [bookId]
        );
        return { success: true, data: rows };
      }
      const [rows] = await pool.query("SELECT * FROM lexora_book_tags ORDER BY name");
      return { success: true, data: rows };
    } catch (error) {
      console.error("[LexoraBookModel.getTags]", error.message);
      return { success: false, error: error.message };
    }
  },

  async createTag(name) {
    try {
      const slug = slugify(name);
      const [result] = await pool.query(
        "INSERT INTO lexora_book_tags (name, slug) VALUES (?, ?)",
        [name.trim(), slug]
      );
      const [rows] = await pool.query("SELECT * FROM lexora_book_tags WHERE id = ?", [result.insertId]);
      return { success: true, data: rows[0] };
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        const [rows] = await pool.query("SELECT * FROM lexora_book_tags WHERE slug = ?", [slugify(name)]);
        return { success: true, data: rows[0] };
      }
      console.error("[LexoraBookModel.createTag]", error.message);
      return { success: false, error: error.message };
    }
  },

  async setBookTags(bookId, tagIds) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM lexora_book_tag_relations WHERE book_id = ?", [bookId]);
      if (tagIds?.length) {
        const values = tagIds.map((tid) => [bookId, tid]);
        await conn.query(
          "INSERT INTO lexora_book_tag_relations (book_id, tag_id) VALUES ?",
          [values]
        );
      }
      await conn.commit();
      return { success: true };
    } catch (error) {
      await conn.rollback();
      console.error("[LexoraBookModel.setBookTags]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },

  // ── Book Pages (image books) ─────────────────────────────

  async getBookPages(bookId) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM lexora_book_pages WHERE book_id = ? ORDER BY page_number ASC",
        [bookId]
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[LexoraBookModel.getBookPages]", error.message);
      return { success: false, error: error.message };
    }
  },

  async addBookPage(bookId, { image_url, file_size = null, page_number = null }) {
    try {
      const [maxRow] = await pool.query(
        "SELECT MAX(page_number) AS max FROM lexora_book_pages WHERE book_id = ?",
        [bookId]
      );
      const nextPage = page_number ?? ((maxRow[0]?.max ?? 0) + 1);
      const [result] = await pool.query(
        "INSERT INTO lexora_book_pages (book_id, page_number, image_url, file_size) VALUES (?, ?, ?, ?)",
        [bookId, nextPage, image_url, file_size]
      );
      const [rows] = await pool.query("SELECT * FROM lexora_book_pages WHERE id = ?", [result.insertId]);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[LexoraBookModel.addBookPage]", error.message);
      return { success: false, error: error.message };
    }
  },

  async updateBookPage(pageId, { image_url, page_number, file_size }) {
    try {
      const fields = [];
      const values = [];
      if (image_url !== undefined) { fields.push("image_url = ?"); values.push(image_url); }
      if (page_number !== undefined) { fields.push("page_number = ?"); values.push(page_number); }
      if (file_size !== undefined) { fields.push("file_size = ?"); values.push(file_size); }
      values.push(pageId);
      await pool.query(`UPDATE lexora_book_pages SET ${fields.join(", ")} WHERE id = ?`, values);
      const [rows] = await pool.query("SELECT * FROM lexora_book_pages WHERE id = ?", [pageId]);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[LexoraBookModel.updateBookPage]", error.message);
      return { success: false, error: error.message };
    }
  },

  async deleteBookPage(pageId) {
    try {
      const [rows] = await pool.query("SELECT * FROM lexora_book_pages WHERE id = ? LIMIT 1", [pageId]);
      if (!rows.length) return { success: false, error: "Page not found" };
      await pool.query("DELETE FROM lexora_book_pages WHERE id = ?", [pageId]);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[LexoraBookModel.deleteBookPage]", error.message);
      return { success: false, error: error.message };
    }
  },

  async reorderBookPages(bookId, pageIdsInOrder) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.query(
        "SELECT id, page_number FROM lexora_book_pages WHERE book_id = ? FOR UPDATE",
        [bookId]
      );
      const existingIds = new Set(rows.map((row) => Number(row.id)));
      const requestedIds = pageIdsInOrder.map(Number);
      if (
        requestedIds.length !== rows.length ||
        new Set(requestedIds).size !== rows.length ||
        requestedIds.some((id) => !existingIds.has(id))
      ) {
        await conn.rollback();
        return { success: false, error: "Page order must contain every book page exactly once" };
      }
      const offset = Math.max(0, ...rows.map((row) => Number(row.page_number))) + rows.length + 1;
      for (const row of rows) {
        await conn.query(
          "UPDATE lexora_book_pages SET page_number = ? WHERE id = ? AND book_id = ?",
          [Number(row.page_number) + offset, row.id, bookId]
        );
      }
      for (let i = 0; i < pageIdsInOrder.length; i++) {
        await conn.query(
          "UPDATE lexora_book_pages SET page_number = ? WHERE id = ? AND book_id = ?",
          [i + 1, requestedIds[i], bookId]
        );
      }
      await conn.commit();
      return { success: true };
    } catch (error) {
      await conn.rollback();
      console.error("[LexoraBookModel.reorderBookPages]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },

  // ── Bookmarks ────────────────────────────────────────────

  async getUserBookmarks(userId, bookId = null) {
    try {
      let query = `SELECT bm.*, b.title AS book_title, b.cover_url, b.thumbnail_url
        FROM lexora_bookmarks bm
        INNER JOIN lexora_books b ON b.id = bm.book_id
        WHERE bm.user_id = ?`;
      const params = [userId];
      if (bookId) { query += " AND bm.book_id = ?"; params.push(bookId); }
      query += " ORDER BY bm.created_at DESC, bm.page_number ASC";
      const [rows] = await pool.query(query, params);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[LexoraBookModel.getUserBookmarks]", error.message);
      return { success: false, error: error.message };
    }
  },

  async addBookmark(userId, bookId, pageNumber) {
    try {
      const [result] = await pool.query(
        "INSERT IGNORE INTO lexora_bookmarks (user_id, book_id, page_number) VALUES (?, ?, ?)",
        [userId, bookId, pageNumber]
      );
      if (result.affectedRows === 0) {
        return { success: true, data: null, message: "Bookmark already exists" };
      }
      const [rows] = await pool.query(
        "SELECT * FROM lexora_bookmarks WHERE user_id = ? AND book_id = ? AND page_number = ?",
        [userId, bookId, pageNumber]
      );
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[LexoraBookModel.addBookmark]", error.message);
      return { success: false, error: error.message };
    }
  },

  async removeBookmark(userId, bookId, pageNumber) {
    try {
      await pool.query(
        "DELETE FROM lexora_bookmarks WHERE user_id = ? AND book_id = ? AND page_number = ?",
        [userId, bookId, pageNumber]
      );
      return { success: true };
    } catch (error) {
      console.error("[LexoraBookModel.removeBookmark]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Reading Progress ─────────────────────────────────────

  async getReadingProgress(userId, bookId) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM lexora_book_progress WHERE user_id = ? AND book_id = ? LIMIT 1",
        [userId, bookId]
      );
      return { success: true, data: rows[0] || null };
    } catch (error) {
      console.error("[LexoraBookModel.getReadingProgress]", error.message);
      return { success: false, error: error.message };
    }
  },

  async upsertReadingProgress(userId, bookId, pageNumber) {
    try {
      await pool.query(
        `INSERT INTO lexora_book_progress (user_id, book_id, page_number, updated_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE page_number = VALUES(page_number), updated_at = NOW()`,
        [userId, bookId, pageNumber]
      );
      const [rows] = await pool.query(
        "SELECT * FROM lexora_book_progress WHERE user_id = ? AND book_id = ? LIMIT 1",
        [userId, bookId]
      );
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[LexoraBookModel.upsertReadingProgress]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Stats ────────────────────────────────────────────────

  async getBookStats(bookId) {
    try {
      const [[book]] = await pool.query(
        "SELECT id, title FROM lexora_books WHERE id = ? LIMIT 1",
        [bookId]
      );
      if (!book) return { success: false, error: "Book not found" };

      const [bmRows] = await pool.query(
        "SELECT COUNT(*) AS bookmark_count FROM lexora_bookmarks WHERE book_id = ?",
        [bookId]
      );
      const [progRows] = await pool.query(
        "SELECT COUNT(*) AS reader_count FROM lexora_book_progress WHERE book_id = ?",
        [bookId]
      );
      return {
        success: true,
        data: {
          book_id: bookId,
          title: book.title,
          bookmark_count: bmRows[0]?.bookmark_count || 0,
          reader_count: progRows[0]?.reader_count || 0,
        },
      };
    } catch (error) {
      console.error("[LexoraBookModel.getBookStats]", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = LexoraBookModel;
