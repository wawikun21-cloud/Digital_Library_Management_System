// ─────────────────────────────────────────────────────────
//  routes/rfid.js
//  RFID Card Routes
//
//  CHANGES:
//    • SECURITY: Rate limiter applied to POST /tap (public endpoint).
//      A looped/faulty scanner cannot flood the attendance table or
//      the WebSocket broadcast channel.
//      Limit: 20 taps/min per IP  (≈ 1 tap every 3 s — generous for
//      any real kiosk, tight enough to stop runaway hardware or scripts).
//    • IP whitelist support via RFID_ALLOWED_IPS env var (comma-separated).
//      If set in production, only whitelisted IPs can access /tap.
//    • Global API backstop (200 req/min/IP) applied in index.js.
// ─────────────────────────────────────────────────────────

const express        = require("express");
const router         = express.Router();
const rateLimit      = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const RfidController = require("../controllers/rfidController");
const { requireAuth, requireAdminOrStaff } = require("../middleware/authMiddleware");

// ── Parse allowed IPs from env (comma-separated, e.g. "192.168.1.100,10.0.0.5") ─
const allowedIPs = (process.env.RFID_ALLOWED_IPS || "")
  .split(",")
  .map(ip => ip.trim())
  .filter(ip => ip.length > 0);

// ── IP whitelist middleware (optional) ───────────────────────────────────────
// If RFID_ALLOWED_IPS is set in production, only those IPs can access the tap endpoint
function ipWhitelist(req, res, next) {
  // In development, allow all IPs
  if (process.env.NODE_ENV !== "production" && allowedIPs.length === 0) {
    return next();
  }

  // If whitelist is configured, check if IP is allowed
  if (allowedIPs.length > 0 && !allowedIPs.includes(req.ip)) {
    return res.status(403).json({
      success: false,
      error: "RFID endpoint not accessible from this IP address",
    });
  }

  next();
}

// ── Rate limiter: RFID tap endpoint ──────────────────────
//
// Why 20/min?
//   • A student tapping in/out takes ~1–2 s realistically.
//   • 20/min = 1 tap every 3 s — enough headroom for bursts
//     (e.g. a group arriving together) without allowing floods.
//   • The limiter is per-IP so a single malfunctioning scanner
//     cannot affect other kiosks on different IPs.
//
// standardHeaders: true  → sends RateLimit-* headers (RFC 6585)
// legacyHeaders:  false  → suppresses the old X-RateLimit-* headers
const rfidTapLimiter = rateLimit({
  windowMs:        60 * 1000,   // 1-minute sliding window
  max:             20,           // max 20 taps per IP per window
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    ipKeyGenerator,
  handler: (req, res) => {
    console.warn(`[RateLimit] RFID tap flood from ${req.ip} — blocked`);
    res.status(429).json({
      success: false,
      error:   "Too many tap requests. Please wait before trying again.",
    });
  },
});

/**
 * @route   POST /api/rfid/tap
 * @desc    Handle an RFID card tap (check-in / check-out or unregistered)
 * @access  Public (RFID reader hits this) — rate-limited: 20/min/IP, IP-whitelisted in prod
 */
router.post("/tap", ipWhitelist, rfidTapLimiter, RfidController.tap);

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