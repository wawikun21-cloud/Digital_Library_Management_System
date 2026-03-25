// ─────────────────────────────────────────────────────────
//  middleware/auth.js
//  Protects routes — rejects requests with no active session
// ─────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  next();
}

module.exports = { requireAuth };