// ─────────────────────────────────────────────────────────
//  controllers/trashController.js
//  Handles all Recently Deleted (trash) API endpoints.
// ─────────────────────────────────────────────────────────

const TrashModel = require("../models/Trash");
const auditService = require("../services/auditService");
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
      
      // Log audit trail
      await auditService.logAction(req, {
        entity_type: result.entityType,
        entity_id: result.entityId,
        action: "RESTORE"
      });
      
      res.json(successResponse(result, "Item restored successfully"));
    } catch (err) {
      console.error("[TrashController.restore]", err.message);
      res.status(500).json(errorResponse("Failed to restore item", 500));
    }
  },

  /** DELETE /api/trash/:trashLogId — permanently delete one */
  async permanentDelete(req, res) {
    try {
      const trashLogId = Number(req.params.trashLogId);
      const trashLogResult = await require("../config/db").pool.query("SELECT entity_type, entity_id FROM trash_log WHERE id = ?", [trashLogId]);
      if (!trashLogResult[0].length) {
        return res.status(404).json(errorResponse("Trash log entry not found", 404));
      }
      const logEntry = trashLogResult[0][0];
      
      const result = await TrashModel.permanentDelete(trashLogId);
      if (!result.success) return res.status(400).json(errorResponse(result.error, 400));
      
      // Log audit trail
      await auditService.logAction(req, {
        entity_type: logEntry.entity_type,
        entity_id: logEntry.entity_id,
        action: "PERMANENT_DELETE"
      });
      
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
      
      // Log audit trail for bulk action
      await auditService.logAction(req, {
        entity_type: entityType || "all_trash",
        action: "BULK_PERMANENT_DELETE",
        old_data: { count: result.count }
      });
      
      res.json(successResponse({ count: result.count }, `${result.count} item(s) permanently deleted`));
    } catch (err) {
      console.error("[TrashController.permanentDeleteAll]", err.message);
      res.status(500).json(errorResponse("Failed to empty trash", 500));
    }
  },
};

module.exports = TrashController;
