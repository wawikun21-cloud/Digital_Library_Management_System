// ─────────────────────────────────────────────────────────
//  controllers/authController.js
//  Handles login, logout, session check, and profile update
// ─────────────────────────────────────────────────────────

const User = require("../models/User");

/**
 * POST /api/auth/login
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

    const user = await User.findByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid username or password" });
    }

    const valid = await User.verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: "Invalid username or password" });
    }

    req.session.user = {
      id:         user.id,
      username:   user.username,
      role:       user.role,
      avatar_url: user.avatar_url || null,
    };

    return res.json({
      success: true,
      user: req.session.user,
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
 */
function me(req, res) {
  if (!req.session?.user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  return res.json({ success: true, user: req.session.user });
}

/**
 * PATCH /api/auth/profile
 * Body (multipart/form-data):
 *   username        – new username (optional)
 *   password        – new password (optional)
 *   confirmPassword – must match password (validated here)
 *   avatar          – image file upload (optional)
 */
async function updateProfile(req, res) {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const userId = req.session.user.id;
    const { username, password, confirmPassword } = req.body;

    // ── Validate username ────────────────────────────────
    if (username !== undefined) {
      const trimmed = username.trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, error: "Username cannot be empty" });
      }
      if (trimmed.length < 3) {
        return res.status(400).json({ success: false, error: "Username must be at least 3 characters" });
      }
      // Check uniqueness (skip if same as current)
      if (trimmed !== req.session.user.username) {
        const existing = await User.findByUsername(trimmed);
        if (existing) {
          return res.status(409).json({ success: false, error: "Username already taken" });
        }
      }
    }

    // ── Validate password ────────────────────────────────
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
      }
      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, error: "Passwords do not match" });
      }
    }

    // ── Handle avatar upload (stored as base64 data URL) ─
    let avatar_url;
    if (req.file) {
      const mime   = req.file.mimetype;
      const b64    = req.file.buffer.toString("base64");
      avatar_url   = `data:${mime};base64,${b64}`;
    }

    // ── Persist changes ──────────────────────────────────
    const updated = await User.updateProfile(userId, {
      username: username?.trim(),
      password: password || undefined,
      avatar_url,
    });

    // ── Refresh session ──────────────────────────────────
    req.session.user = {
      id:         updated.id,
      username:   updated.username,
      role:       updated.role,
      avatar_url: updated.avatar_url || null,
    };

    return res.json({
      success: true,
      user:    req.session.user,
      message: "Profile updated successfully",
    });
  } catch (err) {
    console.error("[Auth] updateProfile error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = { login, logout, me, updateProfile };