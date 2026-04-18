// ─────────────────────────────────────────────────────────
//  routes/rfid.js
//  RFID Card Routes
// ─────────────────────────────────────────────────────────

const express    = require("express");
const router     = express.Router();
const RfidController = require("../controllers/rfidController");
const { requireAuth, requireAdminOrStaff } = require("../middleware/authMiddleware");

/**
 * @route   POST /api/rfid/tap
 * @desc    Handle an RFID card tap (check-in / check-out or unregistered)
 * @access  Public (RFID reader hits this)
 */
router.post("/tap", RfidController.tap);

/**
 * @route   GET /api/rfid/simulate
 * @desc    Simulate an RFID tap via the browser (testing without hardware)
 * @access  Admin + Staff
 */
router.get("/simulate", requireAuth, requireAdminOrStaff, RfidController.simulate);

/**
 * @route   POST /api/rfid/register
 * @desc    Register an RFID card to a student
 * @access  Admin + Staff
 */
router.post("/register", requireAuth, requireAdminOrStaff, RfidController.register);

/**
 * @route   GET /api/rfid
 * @desc    Get all registered RFID cards
 * @access  Admin + Staff
 */
router.get("/", requireAuth, requireAdminOrStaff, RfidController.getAll);

/**
 * @route   DELETE /api/rfid/:id
 * @desc    Remove an RFID card registration
 * @access  Admin + Staff
 */
router.delete("/:id", requireAuth, requireAdminOrStaff, RfidController.delete);

module.exports = router;
