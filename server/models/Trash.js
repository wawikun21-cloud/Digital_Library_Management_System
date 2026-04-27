// ─────────────────────────────────────────────────────────
//  models/Trash.js
//  Unified soft-delete model for all entity types.
//  Handles: soft-delete, restore, permanent delete,
//           list trash, purge expired (30-day auto-cleanup).
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

// Map entity type → actual DB table name
const TABLE_MAP = {
  book:        "books",
  lexora_book: "lexora_books",
  student:     "students",
  faculty:     "faculty",
  transaction: "borrowed_books",
  attendance:  "attendance",
};

// Fields to snapshot for display in Recently Deleted UI
const SNAPSHOT_MAP = {
  book:        (r) => ({ title: r.title, author: r.author, genre: r.genre, isbn: r.isbn }),
  lexora_book: (r) => ({ title: r.title, author: r.author, resource_type: r.resource_type, program: r.program }),
  student:     (r) => ({ title: r.student_name, subtitle: r.student_id_number, course: r.student_course }),
  faculty:     (r) => ({ title: r.faculty_name, subtitle: r.department }),
  transaction: (r) => ({ title: r.book_title || r.bookTitle || "Transaction", subtitle: r.borrower_name, status: r.status }),
  attendance:  (r) => ({ title: r.student_name, subtitle: r.student_id_number, checkin: r.check_in_time }),
};

const TrashModel = {

  // ── Soft-delete a record ────────────────────────────────
  async softDelete(entityType, entityId, deletedBy = "admin") {
    const table = TABLE_MAP[entityType];
    if (!table) return { success: false, error: `Unknown entity type: ${entityType}` };

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Fetch the record first to snapshot it
      const [rows] = await conn.query(`SELECT * FROM ${table} WHERE id = ?`, [entityId]);
      if (!rows.length) {
        await conn.rollback();
        return { success: false, error: "Record not found" };
      }

      const record = rows[0];
      if (record.deleted_at) {
        await conn.rollback();
        return { success: false, error: "Record is already in trash" };
      }

// Mark as deleted (different columns for different tables)
      if (entityType === "student" || entityType === "faculty") {
        // Students/faculty use is_active instead of is_deleted
        await conn.query(
          `UPDATE ${table} SET is_active = 0, deleted_at = NOW(), deleted_by = ? WHERE id = ?`,
          [deletedBy, entityId]
        );
      } else {
        // Other tables use is_deleted
        await conn.query(
          `UPDATE ${table} SET is_deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ?`,
          [deletedBy, entityId]
        );

        // For books also soft-delete all copies
        if (entityType === "book") {
          await conn.query(
            `UPDATE book_copies SET is_deleted = 1, deleted_at = NOW() WHERE book_id = ? AND is_deleted = 0`,
            [entityId]
          );
        }
      }

      // For books also soft-delete all copies
      if (entityType === "book") {
        await conn.query(
          `UPDATE book_copies SET is_deleted = 1, deleted_at = NOW() WHERE book_id = ? AND is_deleted = 0`,
          [entityId]
        );
      }

      // For students/faculty also set is_active = 0
      if (entityType === "student" || entityType === "faculty") {
        await conn.query(`UPDATE ${table} SET is_active = 0 WHERE id = ?`, [entityId]);
      }

      // Build display snapshot (join book title for transactions)
      let snapshot = {};
      if (entityType === "transaction") {
        const [bookRow] = await conn.query(
          "SELECT title FROM books WHERE id = ?", [record.book_id]
        );
        record.book_title = bookRow[0]?.title || "";
      }
      snapshot = SNAPSHOT_MAP[entityType](record);

      // Log to trash_log
      await conn.query(
        `INSERT INTO trash_log (entity_type, entity_id, entity_title, entity_meta, deleted_by)
         VALUES (?, ?, ?, ?, ?)`,
        [entityType, entityId, snapshot.title || `ID: ${entityId}`, JSON.stringify(snapshot), deletedBy]
      );

      await conn.commit();
      console.log(`🗑️  Soft-deleted [${entityType}] ID ${entityId}`);
      return { success: true, data: record };
    } catch (error) {
      await conn.rollback();
      console.error("[TrashModel.softDelete]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },

  // ── Restore a soft-deleted record ──────────────────────
  async restore(trashLogId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [logRows] = await conn.query(
        "SELECT * FROM trash_log WHERE id = ?", [trashLogId]
      );
      if (!logRows.length) {
        await conn.rollback();
        return { success: false, error: "Trash entry not found" };
      }

      const log    = logRows[0];
      const table  = TABLE_MAP[log.entity_type];
      if (!table) {
        await conn.rollback();
        return { success: false, error: "Unknown entity type" };
      }

      // Check record still exists
      const softDeleteCondition = (log.entity_type === "student" || log.entity_type === "faculty")
        ? "is_active = 0"
        : "is_deleted = 1";
      const [recordRows] = await conn.query(
        `SELECT id FROM ${table} WHERE id = ? AND (${softDeleteCondition} OR deleted_at IS NOT NULL)`, [log.entity_id]
      );
      if (!recordRows.length) {
        await conn.rollback();
        return { success: false, error: "Record no longer exists or was permanently deleted" };
      }

      // Restore
      if (log.entity_type === "student" || log.entity_type === "faculty") {
        await conn.query(
          `UPDATE ${table} SET is_active = 1, deleted_at = NULL, deleted_by = NULL WHERE id = ?`,
          [log.entity_id]
        );
      } else {
        await conn.query(
          `UPDATE ${table} SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?`,
          [log.entity_id]
        );
      }

      // Re-activate students/faculty
      if (log.entity_type === "student" || log.entity_type === "faculty") {
        await conn.query(`UPDATE ${table} SET is_active = 1 WHERE id = ?`, [log.entity_id]);
      }

      // Remove from trash log
      await conn.query("DELETE FROM trash_log WHERE id = ?", [trashLogId]);

      await conn.commit();
      console.log(`♻️  Restored [${log.entity_type}] ID ${log.entity_id}`);
      return { success: true, entityType: log.entity_type, entityId: log.entity_id };
    } catch (error) {
      await conn.rollback();
      console.error("[TrashModel.restore]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },

  // ── Permanently delete a single trash entry ─────────────
  async permanentDelete(trashLogId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [logRows] = await conn.query(
        "SELECT * FROM trash_log WHERE id = ?", [trashLogId]
      );
      if (!logRows.length) {
        await conn.rollback();
        return { success: false, error: "Trash entry not found" };
      }

      const log   = logRows[0];
      const table = TABLE_MAP[log.entity_type];

      if (table) {
        // For transactions still marked Borrowed, restore book stock first
        if (log.entity_type === "transaction") {
          const [txn] = await conn.query(
            "SELECT * FROM borrowed_books WHERE id = ? AND deleted_at IS NOT NULL",
            [log.entity_id]
          );
          if (txn.length && txn[0].status === "Borrowed") {
            if (txn[0].accession_number) {
              await conn.query(
                "UPDATE book_copies SET status = 'Available' WHERE book_id = ? AND accession_number = ?",
                [txn[0].book_id, txn[0].accession_number]
              );
            }
            await conn.query(
              "UPDATE books SET quantity = quantity + 1 WHERE id = ?",
              [txn[0].book_id]
            );
          }
        }

        await conn.query(`DELETE FROM ${table} WHERE id = ? AND deleted_at IS NOT NULL`, [log.entity_id]);
      }

      await conn.query("DELETE FROM trash_log WHERE id = ?", [trashLogId]);
      await conn.commit();

      console.log(`💀 Permanently deleted [${log.entity_type}] ID ${log.entity_id}`);
      return { success: true };
    } catch (error) {
      await conn.rollback();
      console.error("[TrashModel.permanentDelete]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },

  // ── Permanently delete ALL trash ───────────────────────
  async permanentDeleteAll(entityType = null) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const whereClause = entityType ? "WHERE entity_type = ?" : "";
      const params = entityType ? [entityType] : [];

      const [logs] = await conn.query(
        `SELECT * FROM trash_log ${whereClause}`, params
      );

      for (const log of logs) {
        const table = TABLE_MAP[log.entity_type];
        if (!table) continue;

        // Restore book stock for active borrow transactions
        if (log.entity_type === "transaction") {
          const [txn] = await conn.query(
            "SELECT * FROM borrowed_books WHERE id = ? AND deleted_at IS NOT NULL",
            [log.entity_id]
          );
          if (txn.length && txn[0].status === "Borrowed") {
            if (txn[0].accession_number) {
              await conn.query(
                "UPDATE book_copies SET status = 'Available' WHERE book_id = ? AND accession_number = ?",
                [txn[0].book_id, txn[0].accession_number]
              );
            }
            await conn.query(
              "UPDATE books SET quantity = quantity + 1 WHERE id = ?",
              [txn[0].book_id]
            );
          }
        }

        await conn.query(
          `DELETE FROM ${table} WHERE id = ? AND deleted_at IS NOT NULL`,
          [log.entity_id]
        );
      }

      if (entityType) {
        await conn.query("DELETE FROM trash_log WHERE entity_type = ?", [entityType]);
      } else {
        await conn.query("DELETE FROM trash_log");
      }

      await conn.commit();
      console.log(`💀 Permanently deleted all trash (type=${entityType || "all"})`);
      return { success: true, count: logs.length };
    } catch (error) {
      await conn.rollback();
      console.error("[TrashModel.permanentDeleteAll]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },

  // ── Get all trash entries ───────────────────────────────
  async getAll(filters = {}) {
    try {
      const conditions = ["DATE_SUB(NOW(), INTERVAL 30 DAY) < t.deleted_at"];
      const params     = [];

      if (filters.entityType && filters.entityType !== "all") {
        conditions.push("t.entity_type = ?");
        params.push(filters.entityType);
      }

      if (filters.search) {
        conditions.push("(t.entity_title LIKE ? OR t.entity_meta LIKE ?)");
        const term = `%${filters.search}%`;
        params.push(term, term);
      }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

      const [rows] = await pool.query(
        `SELECT t.*,
                TIMESTAMPDIFF(SECOND, NOW(), t.expires_at) AS seconds_until_expiry
         FROM trash_log t
         ${where}
         ORDER BY t.deleted_at DESC`,
        params
      );

      return {
        success: true,
        data: rows.map(r => ({
          ...r,
          entity_meta: r.entity_meta
            ? (typeof r.entity_meta === "string" ? JSON.parse(r.entity_meta) : r.entity_meta)
            : {},
        })),
      };
    } catch (error) {
      console.error("[TrashModel.getAll]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Purge expired entries (called by cron) ──────────────
  async purgeExpired() {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [expired] = await conn.query(
        "SELECT * FROM trash_log WHERE expires_at <= NOW()"
      );

      let purged = 0;
      for (const log of expired) {
        const table = TABLE_MAP[log.entity_type];
        if (!table) continue;

        // Restore book stock for expired borrow transactions
        if (log.entity_type === "transaction") {
          const [txn] = await conn.query(
            "SELECT * FROM borrowed_books WHERE id = ? AND deleted_at IS NOT NULL",
            [log.entity_id]
          );
          if (txn.length && txn[0].status === "Borrowed") {
            if (txn[0].accession_number) {
              await conn.query(
                "UPDATE book_copies SET status = 'Available' WHERE book_id = ? AND accession_number = ?",
                [txn[0].book_id, txn[0].accession_number]
              );
            }
            await conn.query("UPDATE books SET quantity = quantity + 1 WHERE id = ?", [txn[0].book_id]);
          }
        }

        await conn.query(
          `DELETE FROM ${table} WHERE id = ? AND deleted_at IS NOT NULL`,
          [log.entity_id]
        );
        purged++;
      }

      await conn.query("DELETE FROM trash_log WHERE expires_at <= NOW()");
      await conn.commit();

      if (purged > 0) console.log(`🧹 Purged ${purged} expired trash entries`);
      return { success: true, purged };
    } catch (error) {
      await conn.rollback();
      console.error("[TrashModel.purgeExpired]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },
};

module.exports = TrashModel;