// ─────────────────────────────────────────────────────────
//  routes/transactions.js
// ─────────────────────────────────────────────────────────

const express                = require("express");
const router                 = express.Router();
const TransactionModel       = require("../models/Transaction");
const TransactionsController = require("../controllers/transactionsController");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

// ── Static routes first ───────────────────────────────────

router.get("/active", requireAuth, requireAdmin, async (req, res) => {
  const result = await TransactionModel.getActiveBorrows();
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/overdue", requireAuth, requireAdmin, async (req, res) => {
  const result = await TransactionModel.getOverdueBorrows();
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  const result = await TransactionModel.getStats();
  res.status(result.success ? 200 : 400).json(result);
});

// ── Borrower / book search ────────────────────────────────

router.get("/lookup/student/:idNumber", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await TransactionModel.lookupStudent(req.params.idNumber);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/lookup/faculty", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { q = "" } = req.query;
    const result = await TransactionModel.searchFaculty(q);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/search/books", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { q = "" } = req.query;
    const result = await TransactionModel.searchBooks(q);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── CRUD ──────────────────────────────────────────────────

router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const result = await TransactionModel.getAll();
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/book/:bookId", requireAuth, requireAdmin, async (req, res) => {
  const result = await TransactionModel.getByBookId(req.params.bookId);
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  const result = await TransactionModel.getById(req.params.id);
  res.status(result.success ? 200 : 404).json(result);
});

router.post("/", requireAuth, requireAdmin, TransactionsController.createTransaction);

router.put("/:id", requireAuth, requireAdmin, TransactionsController.updateTransaction);

router.put("/:id/return", requireAuth, requireAdmin, TransactionsController.returnTransaction);

router.put("/:id/extend", requireAuth, requireAdmin, async (req, res) => {
  try {
    const days   = Number(req.body.days) || 1;
    const result = await TransactionModel.extend(req.params.id, days);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.put("/:id/pay-fine", requireAuth, requireAdmin, TransactionsController.payFine);

router.delete("/:id", requireAuth, requireAdmin, TransactionsController.deleteTransaction);

module.exports = router;