/**
 * Transactions Controller
 * Business logic for borrowing/returning transactions
 */

const TransactionModel = require("../models/Transaction");
const { successResponse, errorResponse } = require("../utils/responseFormatter");

const TransactionsController = {

  /**
   * GET /api/transactions
   * Get all transactions with book details
   */
  getAllTransactions: async (req, res) => {
    try {
      const result = await TransactionModel.getAll();
      if (!result.success) {
        return res.status(400).json(errorResponse(result.error, 400));
      }
      res.json(successResponse(result.data));
    } catch (error) {
      console.error("[TransactionsController] GET / Error:", error.message);
      res.status(500).json(errorResponse("Failed to fetch transactions", 500));
    }
  },

  /**
   * POST /api/transactions
   * Create new borrow transaction
   */
  createTransaction: async (req, res) => {
    try {
      const result = await TransactionModel.create(req.body);
      if (!result.success) {
        return res.status(400).json(errorResponse(result.error, 400));
      }
      res.status(201).json(successResponse(result.data, "Transaction created successfully", 201));
    } catch (error) {
      console.error("[TransactionsController] POST Error:", error.message);
      res.status(500).json(errorResponse("Failed to create transaction", 500));
    }
  },

  /**
   * PUT /api/transactions/:id
   * Update transaction details
   */
  updateTransaction: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await TransactionModel.update(id, req.body);
      if (!result.success) {
        return res.status(400).json(errorResponse(result.error, 400));
      }
      res.json(successResponse(result.data, "Transaction updated successfully"));
    } catch (error) {
      console.error("[TransactionsController] PUT Error:", error.message);
      res.status(500).json(errorResponse("Failed to update transaction", 500));
    }
  },

  /**
   * PUT /api/transactions/:id/return
   * Mark transaction as returned
   */
  returnTransaction: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await TransactionModel.returnBook(id);
      if (!result.success) {
        return res.status(400).json(errorResponse(result.error, 400));
      }
      res.json(successResponse(result.data, "Book returned successfully"));
    } catch (error) {
      console.error("[TransactionsController] Return Error:", error.message);
      res.status(500).json(errorResponse("Failed to return book", 500));
    }
  },

  /**
   * DELETE /api/transactions/:id
   * Delete transaction
   */
  deleteTransaction: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await TransactionModel.delete(id);
      if (!result.success) {
        return res.status(404).json(errorResponse(result.error, 404));
      }
      res.json(successResponse(result.data, "Transaction deleted successfully"));
    } catch (error) {
      console.error("[TransactionsController] DELETE Error:", error.message);
      res.status(500).json(errorResponse("Failed to delete transaction", 500));
    }
  }
};

module.exports = TransactionsController;

