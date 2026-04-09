// ─────────────────────────────────────────────────────────
//  controllers/analyticsController.js
//  Thin HTTP layer — extracts query params, calls service,
//  returns JSON. No SQL lives here.
// ─────────────────────────────────────────────────────────

const analyticsService = require("../services/analyticsService");
const { successResponse, errorResponse } = require("../utils/responseFormatter");

// Helper: pull & sanitize filter params from req.query
function parseFilters(query) {
  const { semester = "2nd Sem", month = "All", schoolYear = "2024-2025" } = query;
  return {
    semester:   semester.trim(),
    month:      month.trim(),
    schoolYear: schoolYear.trim(),
  };
}

const AnalyticsController = {

  /**
   * GET /api/books/stats
   * KPI numbers — totals, out of stock, borrowed, returned, overdue
   */
  getBookStats: async (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const result  = await analyticsService.getBookStats(filters);
      if (!result.success) return res.status(500).json(errorResponse(result.error, 500));
      res.json(successResponse(result.data));
    } catch (err) {
      console.error("[AnalyticsController.getBookStats]", err.message);
      res.status(500).json(errorResponse("Failed to get book stats", 500));
    }
  },

  /**
   * GET /api/analytics/most-borrowed
   * ?semester=1st+Sem&month=All&schoolYear=2024-2025
   */
  getMostBorrowed: async (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const result  = await analyticsService.getMostBorrowed(filters);
      if (!result.success) return res.status(500).json(errorResponse(result.error, 500));
      res.json(successResponse(result.data));
    } catch (err) {
      console.error("[AnalyticsController.getMostBorrowed]", err.message);
      res.status(500).json(errorResponse("Failed to get most borrowed books", 500));
    }
  },

  /**
   * GET /api/analytics/attendance
   * ?semester=1st+Sem&month=Aug&schoolYear=2024-2025
   */
  getAttendance: async (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const result  = await analyticsService.getAttendance(filters);
      if (!result.success) return res.status(500).json(errorResponse(result.error, 500));
      res.json(successResponse(result.data));
    } catch (err) {
      console.error("[AnalyticsController.getAttendance]", err.message);
      res.status(500).json(errorResponse("Failed to get attendance data", 500));
    }
  },

  /**
   * GET /api/analytics/fines
   * ?semester=2nd+Sem&month=Mar&schoolYear=2024-2025
   */
  getFines: async (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const result  = await analyticsService.getFines(filters);
      if (!result.success) return res.status(500).json(errorResponse(result.error, 500));
      res.json(successResponse(result.data));
    } catch (err) {
      console.error("[AnalyticsController.getFines]", err.message);
      res.status(500).json(errorResponse("Failed to get fines data", 500));
    }
  },

  /**
   * GET /api/analytics/overdue
   * ?semester=1st+Sem&month=Nov&schoolYear=2024-2025
   */
  getOverdue: async (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const result  = await analyticsService.getOverdue(filters);
      if (!result.success) return res.status(500).json(errorResponse(result.error, 500));
      res.json(successResponse(result.data));
    } catch (err) {
      console.error("[AnalyticsController.getOverdue]", err.message);
      res.status(500).json(errorResponse("Failed to get overdue data", 500));
    }
  },

  /**
   * GET /api/analytics/holdings-breakdown
   * Returns per-program/category book counts for NEMCO and Lexora.
   * No filter params — always returns total holdings (not time-scoped).
   */
  getHoldingsBreakdown: async (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const result  = await analyticsService.getHoldingsBreakdown(filters);
      if (!result.success) return res.status(500).json(errorResponse(result.error, 500));
      res.json(successResponse({
        data:      result.data,
        maxNemco:  result.maxNemco,
        maxLexora: result.maxLexora,
      }));
    } catch (err) {
      console.error("[AnalyticsController.getHoldingsBreakdown]", err.message);
      res.status(500).json(errorResponse("Failed to get holdings breakdown", 500));
    }
  },
};

module.exports = AnalyticsController;