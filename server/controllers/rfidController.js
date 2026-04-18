// ─────────────────────────────────────────────────────────
//  controllers/rfidController.js
//  RFID Card Controller
// ─────────────────────────────────────────────────────────

const RfidCardModel = require("../models/RfidCard");
const { broadcast }  = require("../utils/websocket");

const auditService = require("../services/auditService");

const RfidController = {
  /**
   * POST /api/rfid/tap
   * Body: { rfid_code }
   * - If registered → attendance tap (check in / check out)
   * - If unregistered → returns { unregistered: true, rfid_code }
   */
  async tap(req, res) {
    try {
      const { rfid_code } = req.body;
      if (!rfid_code?.trim()) {
        return res.status(400).json({ success: false, error: "rfid_code is required." });
      }

      const result = await RfidCardModel.tap(rfid_code.trim());

      if (result.unregistered) {
        // Broadcast to all connected clients so the UI can react
        broadcast("rfid:unregistered", { rfid_code: rfid_code.trim() });
        return res.status(200).json({
          success: false,
          unregistered: true,
          rfid_code: rfid_code.trim(),
          message: "RFID card not registered.",
        });
      }

      if (!result.success) {
        return res.status(400).json(result);
      }

      // ── Audit: CHECK_IN / CHECK_OUT (Kiosk RFID)
      try {
        const auditReq = {
          ...req,
          session: { user: { id: null, username: "system/kiosk", role: "system" } },
          headers: req.headers,
          socket: req.socket
        };
        await auditService.logAction(auditReq, {
          entity_type: "attendance",
          entity_id: result.data?.id ?? null,
          action: result.action === "checked_in" ? "CHECK_IN" : "CHECK_OUT",
          old_data: null,
          new_data: {
            rfid_code: rfid_code.trim(),
            student_id_number: result.data?.student_id_number ?? null,
            student_name: result.data?.student_name ?? null,
          }
        });
      } catch (auditErr) {
        console.error("[RfidController.tap audit]", auditErr.message);
      }

      // Broadcast successful tap
      broadcast("rfid:tap", {
        action: result.action,
        data:   result.data,
        rfid_code: rfid_code.trim(),
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("[RfidController.tap]", error.message);
      return res.status(500).json({ success: false, error: "Internal server error." });
    }
  },

  /**
   * POST /api/rfid/register
   * Body: { rfid_code, student_id_number }
   */
  async register(req, res) {
    try {
      const { rfid_code, student_id_number } = req.body;
      if (!rfid_code?.trim() || !student_id_number?.trim()) {
        return res.status(400).json({ success: false, error: "rfid_code and student_id_number are required." });
      }

      const result = await RfidCardModel.register(rfid_code.trim(), student_id_number.trim());

      if (!result.success) {
        return res.status(400).json(result);
      }

      broadcast("rfid:registered", { rfid_code: rfid_code.trim(), student_id_number: student_id_number.trim() });

      return res.status(201).json({ success: true, message: "RFID card registered successfully.", data: result.data });
    } catch (error) {
      console.error("[RfidController.register]", error.message);
      return res.status(500).json({ success: false, error: "Internal server error." });
    }
  },

  /**
   * GET /api/rfid
   * List all registered RFID cards
   */
  async getAll(req, res) {
    try {
      const result = await RfidCardModel.getAll();
      return res.status(200).json(result);
    } catch (error) {
      console.error("[RfidController.getAll]", error.message);
      return res.status(500).json({ success: false, error: "Internal server error." });
    }
  },

  /**
   * DELETE /api/rfid/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await RfidCardModel.delete(id);
      if (!result.success) return res.status(400).json(result);
      return res.status(200).json({ success: true, message: "RFID card removed." });
    } catch (error) {
      console.error("[RfidController.delete]", error.message);
      return res.status(500).json({ success: false, error: "Internal server error." });
    }
  },

  /**
   * GET /api/rfid/simulate
   * Simulates an RFID tap event via WebSocket (for testing without hardware)
   * Query: ?rfid_code=xxxx
   */
  async simulate(req, res) {
    try {
      const { rfid_code } = req.query;
      if (!rfid_code?.trim()) {
        return res.status(400).json({ success: false, error: "rfid_code query param is required." });
      }

      const result = await RfidCardModel.tap(rfid_code.trim());

      if (result.unregistered) {
        broadcast("rfid:unregistered", { rfid_code: rfid_code.trim() });
        return res.status(200).json({
          success: false,
          unregistered: true,
          rfid_code: rfid_code.trim(),
          simulated: true,
        });
      }

      if (result.success) {
        // ── Audit: CHECK_IN / CHECK_OUT (Simulate)
        try {
          const auditReq = {
            ...req,
            session: { user: { id: null, username: "system/kiosk-sim", role: "system" } },
            headers: req.headers,
            socket: req.socket
          };
          await auditService.logAction(auditReq, {
            entity_type: "attendance",
            entity_id: result.data?.id ?? null,
            action: result.action === "checked_in" ? "CHECK_IN" : "CHECK_OUT",
            old_data: null,
            new_data: {
              rfid_code: rfid_code.trim(),
              student_id_number: result.data?.student_id_number ?? null,
              student_name: result.data?.student_name ?? null,
            }
          });
        } catch (auditErr) {
          console.error("[RfidController.simulate audit]", auditErr.message);
        }

        broadcast("rfid:tap", {
          action: result.action,
          data:   result.data,
          rfid_code: rfid_code.trim(),
          simulated: true,
        });
      }

      return res.status(200).json({ ...result, simulated: true });
    } catch (error) {
      console.error("[RfidController.simulate]", error.message);
      return res.status(500).json({ success: false, error: "Internal server error." });
    }
  },
};

module.exports = RfidController;