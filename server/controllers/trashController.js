// ─────────────────────────────────────────────────────────
//  controllers/trashController.js
//  Handles all Recently Deleted (trash) API endpoints.
// ─────────────────────────────────────────────────────────

const TrashModel = require("../models/Trash");
const { successResponse, errorResponse } = require("../utils/responseFormatter");

const TrashController = {

  /** GET /api/trash?entityType=book&search=xyz */
  async getAll(req, res) {
    try {
      const { entityType, search } = req.query;
      const result = await TrashModel.getAll({ entityType, search });
      if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
      res.json(successResponse(result.data));
    } catch (err) {
      console.error("[TrashController.getAll]", err.message);
      res.status(500).json(errorResponse("Failed to fetch trash", 500));
    }
  },

  /** POST /api/trash/restore/:trashLogId */
  async restore(req, res) {
    try {
      const result = await TrashModel.restore(Number(req.params.trashLogId));
      if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
      res.json(successResponse(result, "Item restored successfully"));
    } catch (err) {
      console.error("[TrashController.restore]", err.message);
      res.status(500).json(errorResponse("Failed to restore item", 500));
    }
  },

  /** DELETE /api/trash/:trashLogId — permanently delete one */
  async permanentDelete(req, res) {
    try {
      const result = await TrashModel.permanentDelete(Number(req.params.trashLogId));
      if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
      res.json(successResponse(null, "Item permanently deleted"));
    } catch (err) {
      console.error("[TrashController.permanentDelete]", err.message);
      res.status(500).json(errorResponse("Failed to permanently delete item", 500));
    }
  },

  /** DELETE /api/trash — permanently delete all (or by type) */
  async permanentDeleteAll(req, res) {
    try {
      const { entityType } = req.query;
      const result = await TrashModel.permanentDeleteAll(entityType || null);
      if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
      res.json(successResponse({ count: result.count }, `${result.count} item(s) permanently deleted`));
    } catch (err) {
      console.error("[TrashController.permanentDeleteAll]", err.message);
      res.status(500).json(errorResponse("Failed to empty trash", 500));
    }
  },
};

module.exports = TrashController;
