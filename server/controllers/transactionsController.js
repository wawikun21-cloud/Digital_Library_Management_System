// ─────────────────────────────────────────────────────────
//  controllers/transactionsController.js  (updated)
//  After create / return / delete mutations, broadcasts a
//  "stats:update" event via Socket.io so the dashboard
//  refreshes automatically on every connected client.
// ─────────────────────────────────────────────────────────

const TransactionModel    = require("../models/Transaction");
const analyticsService    = require("../services/analyticsService");
const { broadcast }       = require("../utils/websocket");
const { successResponse, errorResponse } = require("../utils/responseFormatter");

/**
 * After any mutation that changes stock/borrow counts,
 * push fresh KPI stats to all connected dashboard clients.
 */
async function pushStatsUpdate() {
  try {
    const result = await analyticsService.getBookStats();
    if (result.success) broadcast("stats:update", result.data);
  } catch (err) {
    console.error("[WS] Failed to push stats update:", err.message);
  }
}

const TransactionsController = {

  /** GET /api/transactions */
  getAllTransactions: async (req, res) => {
    try {
      const result = await TransactionModel.getAll();
      if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
      res.json(successResponse(result.data));
    } catch (error) {
      console.error("[TransactionsController] GET /", error.message);
      res.status(500).json(errorResponse("Failed to fetch transactions", 500));
    }
  },

  /** POST /api/transactions — borrow a book */
  createTransaction: async (req, res) => {
    try {
      const result = await TransactionModel.create(req.body);
      if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

      // Broadcast new transaction event + updated KPI stats
      broadcast("transaction:new", result.data);
      await pushStatsUpdate();

      res.status(201).json(successResponse(result.data, "Transaction created successfully", 201));
    } catch (error) {
      console.error("[TransactionsController] POST", error.message);
      res.status(500).json(errorResponse("Failed to create transaction", 500));
    }
  },

  /** PUT /api/transactions/:id — update metadata */
  updateTransaction: async (req, res) => {
    try {
      const result = await TransactionModel.update(req.params.id, req.body);
      if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
      res.json(successResponse(result.data, "Transaction updated successfully"));
    } catch (error) {
      console.error("[TransactionsController] PUT", error.message);
      res.status(500).json(errorResponse("Failed to update transaction", 500));
    }
  },

  /** PUT /api/transactions/:id/return — return a book */
  returnTransaction: async (req, res) => {
    try {
      const result = await TransactionModel.returnBook(req.params.id);
      if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

      // Broadcast return event + updated KPI stats
      broadcast("transaction:returned", result.data);
      await pushStatsUpdate();

      res.json(successResponse(result.data, "Book returned successfully"));
    } catch (error) {
      console.error("[TransactionsController] Return", error.message);
      res.status(500).json(errorResponse("Failed to return book", 500));
    }
  },

  /** DELETE /api/transactions/:id */
  deleteTransaction: async (req, res) => {
    try {
      const result = await TransactionModel.delete(req.params.id);
      if (!result.success) return res.status(404).json(errorResponse(result.error, 404));

      broadcast("transaction:deleted", { id: req.params.id });
      await pushStatsUpdate();

      res.json(successResponse(result.data, "Transaction deleted successfully"));
    } catch (error) {
      console.error("[TransactionsController] DELETE", error.message);
      res.status(500).json(errorResponse("Failed to delete transaction", 500));
    }
  },

  /** PUT /api/transactions/:id/pay-fine — mark fine as paid */
  payFine: async (req, res) => {
    try {
      const result = await TransactionModel.payFine(req.params.id);
      if (!result.success) return res.status(400).json(errorResponse(result.error, 400));

      broadcast("transaction:fine_paid", result.data);
      await pushStatsUpdate();

      res.json(successResponse(result.data, "Fine marked as paid"));
    } catch (error) {
      console.error("[TransactionsController] PayFine", error.message);
      res.status(500).json(errorResponse("Failed to pay fine", 500));
    }
  },
};

module.exports = TransactionsController;