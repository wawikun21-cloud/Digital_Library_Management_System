// ─────────────────────────────────────────────────────────
//  routes/transactions.js
//
//  Role guards were replaced by permission guards:
//    GETs → manage_transactions:view
//    POST / → :create   PUT /:id → :edit   /:id/return → :return
//    /:id/extend → :extend   /:id/pay-fine → :pay_fine   DELETE → :delete
//
//  School scoping: every route is school-scoped through the
//  borrowed book's category assignments (bookAccess). The
//  student borrower lookup is scoped (a student of another
//  school is "not found"); the faculty borrower lookup is
//  deliberately unscoped — faculty may borrow at any school.
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
const { resolveSchoolScope } = require("../features/organization");

router.use(requireAuth, resolvePermissions, resolveSchoolScope);

// ── Static routes first ───────────────────────────────────

router.get("/active", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  const result = await TransactionModel.getActiveBorrows(req.schoolScope);
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/overdue", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  const result = await TransactionModel.getOverdueBorrows(req.schoolScope);
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/stats", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  const result = await TransactionModel.getStats(req.schoolScope);
  res.status(result.success ? 200 : 400).json(result);
});

// ── Borrower / book search ────────────────────────────────

router.get("/lookup/student/:idNumber", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  try {
    const result = await TransactionModel.lookupStudent(req.params.idNumber, req.schoolScope);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Faculty lookups stay unscoped (patron rule): faculty may borrow at any school.
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
    const result = await TransactionModel.searchBooks(q, req.schoolScope);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── CRUD ──────────────────────────────────────────────────

router.get("/", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  const result = await TransactionModel.getAll(req.schoolScope);
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/book/:bookId", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  const result = await TransactionModel.getByBookId(req.params.bookId);
  res.status(result.success ? 200 : 400).json(result);
});

router.get("/:id", requirePermissionAction("manage_transactions", "view"), async (req, res) => {
  const result = await TransactionModel.getById(req.params.id, req.schoolScope);
  res.status(result.success ? 200 : 404).json(result);
});

router.post("/", requirePermissionAction("manage_transactions", "create"), TransactionsController.createTransaction);

router.put("/:id", requirePermissionAction("manage_transactions", "edit"), TransactionsController.updateTransaction);

router.put("/:id/return", requirePermissionAction("manage_transactions", "return"), TransactionsController.returnTransaction);

router.put("/:id/extend", requirePermissionAction("manage_transactions", "extend"), async (req, res) => {
  try {
    const days   = Number(req.body.days) || 1;
    const result = await TransactionModel.extend(req.params.id, days, req.schoolScope);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.put("/:id/pay-fine", requirePermissionAction("manage_transactions", "pay_fine"), TransactionsController.payFine);

router.delete("/:id", requirePermissionAction("manage_transactions", "delete"), TransactionsController.deleteTransaction);

module.exports = router;
