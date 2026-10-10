// ─────────────────────────────────────────────────────────
//  routes/transactions.js
//
//  Role guards were replaced by permission guards:
//    GETs → manage_transactions:view
//    POST / → :create   PUT /:id → :edit   /:id/return → :return
//    /:id/extend → :extend   /:id/pay-fine → :pay_fine   DELETE → :delete
// ─────────────────────────────────────────────────────────

const express                = require("express");
const router                 = express.Router();
const TransactionModel       = require("../models/Transaction");
const TransactionsController = require("../controllers/transactionsController");
const {
  requireAuth,
  resolvePermissions,
  requirePermissionAction,
} = require("../features/roles");

router.use(requireAuth, resolvePermissions);

// ── Static routes first ───────────────────────────────────

router.get("/active", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  const result = await TransactionModel.getActiveBorrows();
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/overdue", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  const result = await TransactionModel.getOverdueBorrows();
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/stats", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  const result = await TransactionModel.getStats();
  res.status(result.success ? 200 : 400).json(result);
});

// ── Borrower / book search ────────────────────────────────

router.get("/lookup/student/:idNumber", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  try {
    const result = await TransactionModel.lookupStudent(req.params.idNumber);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/lookup/faculty", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  try {
    const { q = "" } = req.query;
    const result = await TransactionModel.searchFaculty(q);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/search/books", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  try {
    const { q = "" } = req.query;
    const result = await TransactionModel.searchBooks(q);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── CRUD ──────────────────────────────────────────────────

router.get("/", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  const result = await TransactionModel.getAll();
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/book/:bookId", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  const result = await TransactionModel.getByBookId(req.params.bookId);
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/:id", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  const result = await TransactionModel.getById(req.params.id);
  res.status(result.success ? 200 : 404).json(result);
});

router.post("/", requirePermissionAction("manage_transactions", "create"), TransactionsController.createTransaction);

router.put("/:id", requirePermissionAction("manage_transactions", "edit"), TransactionsController.updateTransaction);

router.put("/:id/return", requirePermissionAction("manage_transactions", "return"), TransactionsController.returnTransaction);

router.put("/:id/extend", requirePermissionAction("manage_transactions", "extend"), async (req, res) => {
  try {
    const days   = Number(req.body.days) || 1;
    const result = await TransactionModel.extend(req.params.id, days);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.put("/:id/pay-fine", requirePermissionAction("manage_transactions", "pay_fine"), TransactionsController.payFine);

router.delete("/:id", requirePermissionAction("manage_transactions", "delete"), TransactionsController.deleteTransaction);

module.exports = router;
