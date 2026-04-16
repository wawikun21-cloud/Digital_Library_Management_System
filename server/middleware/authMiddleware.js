// ─────────────────────────────────────────────────────────
//  middleware/authMiddleware.js
// ─────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  next();
}

/**
 * requireRole("admin")          — admin only
 * requireRole("admin","staff")  — both roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.session?.user?.role)) {
      return res.status(403).json({ success: false, error: "Forbidden: insufficient permissions" });
    }
    next();
  };
}

const requireAdmin        = requireRole("admin");
const requireStaff        = requireRole("staff");
const requireAdminOrStaff = requireRole("admin", "staff");

module.exports = { requireAuth, requireRole, requireAdmin, requireStaff, requireAdminOrStaff };