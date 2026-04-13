// ─────────────────────────────────────────────────────────
//  routes/transactions.js
// ─────────────────────────────────────────────────────────

const express                = require("express");
const router                 = express.Router();
const TransactionModel       = require("../models/Transaction");
const TransactionsController = require("../controllers/transactionsController"); // ← added

// ── Static routes first ───────────────────────────────────

router.get("/active", async (req, res) => {
  const result = await TransactionModel.getActiveBorrows();
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/overdue", async (req, res) => {
  const result = await TransactionModel.getOverdueBorrows();
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/stats", async (req, res) => {
  const result = await TransactionModel.getStats();
  res.status(result.success ? 200 : 400).json(result);
});

// ── Borrower / book search ────────────────────────────────

router.get("/lookup/student/:idNumber", async (req, res) => {
  try {
    const result = await TransactionModel.lookupStudent(req.params.idNumber);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/lookup/faculty", async (req, res) => {
  try {
    const { q = "" } = req.query;
    const result = await TransactionModel.searchFaculty(q);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/search/books", async (req, res) => {
  try {
    const { q = "" } = req.query;
    const result = await TransactionModel.searchBooks(q);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── CRUD ──────────────────────────────────────────────────

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
 * → controller: saves borrow + sends confirmation email + broadcasts WS
 */
router.post("/", TransactionsController.createTransaction); // ← changed

/**
 * PUT /api/transactions/:id
 * → controller: updates metadata + broadcasts WS
 */
router.put("/:id", TransactionsController.updateTransaction); // ← changed

/**
 * PUT /api/transactions/:id/return
 * → controller: marks returned + broadcasts WS
 */
router.put("/:id/return", TransactionsController.returnTransaction); // ← changed

/**
 * PUT /api/transactions/:id/extend
 * Extend the due date by N days (no email side-effect needed)
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
 * → controller: marks fine paid + broadcasts WS
 */
router.put("/:id/pay-fine", TransactionsController.payFine); // ← changed

/**
 * DELETE /api/transactions/:id
 * → controller: soft-deletes + broadcasts WS
 */
router.delete("/:id", TransactionsController.deleteTransaction); // ← changed

module.exports = router;