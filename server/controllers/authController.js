// ─────────────────────────────────────────────────────────
//  controllers/authController.js
//  Handles login, logout, and session check
// ─────────────────────────────────────────────────────────

const User = require("../models/User");

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required",
      });
    }

    // Look up user
    const user = await User.findByUsername(username.trim());
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    // Verify password
    const valid = await User.verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password",
      });
    }

    // Save user info in session (no JWT)
    req.session.user = {
      id:       user.id,
      username: user.username,
      role:     user.role,
    };

    return res.json({
      success: true,
      user: {
        id:       user.id,
        username: user.username,
        role:     user.role,
      },
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * POST /api/auth/logout
 */
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: "Could not log out" });
    }
    res.clearCookie("lexora.sid");
    return res.json({ success: true, message: "Logged out successfully" });
  });
}

/**
 * GET /api/auth/me
 * Returns current session user (used to verify session on page refresh)
 */
function me(req, res) {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  return res.json({ success: true, user: req.session.user });
}

module.exports = { login, logout, me };