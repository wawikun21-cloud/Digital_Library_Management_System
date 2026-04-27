// ─────────────────────────────────────────────────────────
//  controllers/analyticsController.js
//
//  FIXES IN THIS FILE:
//
//  Bug B (404 root cause) — The route that serves getBookStats must be
//    registered as router.get('/stats', ...) in server/routes/analytics.js.
//    The previous analyticsApi.js called /api/analytics/book-stats which
//    did not match that registration, causing the 404.
//    This file is correct — only analyticsApi.js needed the URL change.
//    The comment on getBookStats below documents the correct path.
//
//  Bug C — parseFilters() now extracts genre, collection, dateFrom, dateTo
//    so filter values sent by the frontend actually reach the service layer.
// ─────────────────────────────────────────────────────────

const analyticsService = require("../services/analyticsService");
const { successResponse, errorResponse } = require("../utils/responseFormatter");

// FIX C: now extracts genre, collection, dateFrom, dateTo in addition to
// semester/month/schoolYear. Previously those four keys were silently dropped,
// making genre/collection dashboard filters completely non-functional.
function parseFilters(query) {
  const { semester, month, schoolYear, genre, collection, dateFrom, dateTo } = query;

  const norm = (v, fallback) => {
    const s = (v ?? "").trim();
    return s === "" || s === "All" ? fallback : s;
  };

  return {
    semester:   norm(semester,   undefined),
    month:      norm(month,      undefined),
    schoolYear: norm(schoolYear, undefined),
    genre:      norm(genre,      undefined),
    collection: norm(collection, undefined),
    dateFrom:   norm(dateFrom,   undefined),
    dateTo:     norm(dateTo,     undefined),
  };
}

const AnalyticsController = {

  /**
   * GET /api/analytics/stats          ← registered as router.get('/stats', ...)
   *
   * KPI numbers — totals, out of stock, borrowed, returned, overdue.
   * The frontend calls /api/analytics/stats (fixed from the broken /book-stats).
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
   * GET /api/analytics/books-by-status
   */
  getBooksByStatus: async (req, res) => {
    try {
      const filters = parseFilters(req.query);
      const result  = await analyticsService.getBooksByStatus(filters);
      if (!result.success) return res.status(500).json(errorResponse(result.error, 500));
      res.json(successResponse(result.data));
    } catch (err) {
      console.error("[AnalyticsController.getBooksByStatus]", err.message);
      res.status(500).json(errorResponse("Failed to get books by status", 500));
    }
  },

  /**
   * GET /api/analytics/holdings-breakdown
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