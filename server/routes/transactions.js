// ─────────────────────────────────────────────────────────
//  routes/transactions.js
//  Transactions API Routes (Borrow/Return Books)
// ─────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const TransactionModel = require("../models/Transaction");

/**
 * GET /api/transactions
 * Get all transactions
 */
router.get("/", async (req, res) => {
  try {
    const result = await TransactionModel.getAll();
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[GET /api/transactions] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/transactions/active
 * Get all active borrows
 */
router.get("/active", async (req, res) => {
  try {
    const result = await TransactionModel.getActiveBorrows();
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[GET /api/transactions/active] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/transactions/overdue
 * Get all overdue borrows
 */
router.get("/overdue", async (req, res) => {
  try {
    const result = await TransactionModel.getOverdueBorrows();
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[GET /api/transactions/overdue] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/transactions/stats
 * Get transaction statistics
 */
router.get("/stats", async (req, res) => {
  try {
    const result = await TransactionModel.getStats();
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[GET /api/transactions/stats] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/transactions/:id
 * Get transaction by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await TransactionModel.getById(id);

    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[GET /api/transactions/:id] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/transactions/book/:bookId
 * Get transactions by book ID
 */
router.get("/book/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const result = await TransactionModel.getByBookId(bookId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[GET /api/transactions/book/:bookId] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * POST /api/transactions
 * Create a new transaction (borrow a book)
 */
router.post("/", async (req, res) => {
  try {
    const {
      book_id,
      borrower_name,
      borrower_id_number,
      borrower_contact,
      borrower_email,
      borrower_course,
      borrower_yr_level,
      borrow_date,
      due_date,
    } = req.body;

    // Validate required fields
    const errors = [];
    if (!book_id) errors.push("Book ID is required");
    if (!borrower_name?.trim()) errors.push("Borrower name is required");
    if (!due_date) errors.push("Due date is required");

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors.join(", ") });
    }

    const result = await TransactionModel.create({
      book_id,
      borrower_name,
      borrower_id_number,
      borrower_contact,
      borrower_email,
      borrower_course,
      borrower_yr_level,
      borrow_date,
      due_date,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    console.error("[POST /api/transactions] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * PUT /api/transactions/:id/return
 * Return a book (update transaction)
 */
router.put("/:id/return", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await TransactionModel.returnBook(id);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[PUT /api/transactions/:id/return] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete a transaction
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await TransactionModel.delete(id);

    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[DELETE /api/transactions/:id] Error:", error.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;

