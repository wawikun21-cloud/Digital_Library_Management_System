// ─────────────────────────────────────────────────────────
//  routes/transactions.js
// ─────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const TransactionModel = require("../models/Transaction");

// ── Static routes first ───────────────────────────────────

router.get("/active",  async (req, res) => {
  const result = await TransactionModel.getActiveBorrows();
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/overdue", async (req, res) => {
  const result = await TransactionModel.getOverdueBorrows();
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/stats",   async (req, res) => {
  const result = await TransactionModel.getStats();
  res.status(result.success ? 200 : 400).json(result);
});

// ── Borrower / book search ────────────────────────────────

/**
 * GET /api/transactions/lookup/student/:idNumber
 * Look up a student by their ID number
 */
router.get("/lookup/student/:idNumber", async (req, res) => {
  try {
    const result = await TransactionModel.lookupStudent(req.params.idNumber);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/transactions/lookup/faculty?q=name
 * Search faculty by name
 */
router.get("/lookup/faculty", async (req, res) => {
  try {
    const { q = "" } = req.query;
    const result = await TransactionModel.searchFaculty(q);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * GET /api/transactions/search/books?q=query
 * Search available books by accession number or title
 */
router.get("/search/books", async (req, res) => {
  try {
    const { q = "" } = req.query;
    const result = await TransactionModel.searchBooks(q);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── CRUD ─────────────────────────────────────────────────

router.get("/", async (req, res) => {
  const result = await TransactionModel.getAll();
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/book/:bookId", async (req, res) => {
  const result = await TransactionModel.getByBookId(req.params.bookId);
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/:id", async (req, res) => {
  const result = await TransactionModel.getById(req.params.id);
  res.status(result.success ? 200 : 404).json(result);
});

/**
 * POST /api/transactions
 * Create a new borrow transaction
 */
router.post("/", async (req, res) => {
  try {
    const { book_id, accession_number, borrower_name, due_date } = req.body;
    const errors = [];
    if (!book_id)                errors.push("Book ID is required");
    if (!accession_number)       errors.push("Accession number required for availability tracking");
    if (!borrower_name?.trim())  errors.push("Borrower name is required");
    if (!due_date)               errors.push("Due date is required");
    if (errors.length) return res.status(400).json({ success: false, error: errors.join(", ") });

    const result = await TransactionModel.create(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (err) {
    console.error("[POST /api/transactions]", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * PUT /api/transactions/:id
 * Update transaction details (edit)
 */
router.put("/:id", async (req, res) => {
  try {
    const result = await TransactionModel.update(req.params.id, req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * PUT /api/transactions/:id/return
 * Mark a book as returned
 */
router.put("/:id/return", async (req, res) => {
  try {
    const result = await TransactionModel.returnBook(req.params.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * PUT /api/transactions/:id/extend
 * Extend the due date by N days (default 1)
 */
router.put("/:id/extend", async (req, res) => {
  try {
    const days   = Number(req.body.days) || 1;
    const result = await TransactionModel.extend(req.params.id, days);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * PUT /api/transactions/:id/pay-fine
 * Mark the fine for a transaction as paid
 */
router.put("/:id/pay-fine", async (req, res) => {
  try {
    const result = await TransactionModel.payFine(req.params.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/**
 * DELETE /api/transactions/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const result = await TransactionModel.delete(req.params.id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;