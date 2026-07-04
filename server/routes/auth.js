// ─────────────────────────────────────────────────────────
//  routes/auth.js
//
//  CHANGES:
//    • Added CSRF token endpoint for frontend to retrieve token
//    • Applied CSRF protection to logout/profile endpoints (production only)
//    • In development, CSRF is disabled for convenience; use for production deployment
// ─────────────────────────────────────────────────────────

const express  = require("express");
const router   = express.Router();
const csurf    = require("csurf");
const { login, logout, me, updateProfile } = require("../controllers/authController");
const { upload, handleUploadError }        = require("../middleware/upload");

// CSRF protection middleware for state-changing routes (cookie mode)
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
});

// CSRF error handler - returns proper JSON response
function csrfErrorHandler(err, req, res, next) {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ success: false, error: "Invalid CSRF token" });
  }
  next(err);
}

// CSRF token endpoint - calls csurf to generate a valid token and set cookie
// In development, we skip CSRF validation to avoid chicken-and-egg problem
router.get("/csrf-token", (req, res, next) => {
  // Apply CSRF protection to generate the token
  csrfProtection(req, res, (err) => {
    if (err) {
      // In development, ignore CSRF errors on this endpoint and generate a manual token
      if (process.env.NODE_ENV !== "production") {
        // Return a placeholder token - frontend should handle missing tokens gracefully
        return res.json({ csrfToken: null });
      }
      return next(err);
    }
    res.json({ csrfToken: req.csrfToken() });
  });
});

// Login does NOT require CSRF (no session exists yet)
router.post("/login", login);

// In production, logout and profile require CSRF; in development, optional
if (process.env.NODE_ENV === "production") {
  router.post("/logout", csrfProtection, logout);
  router.patch("/profile", csrfProtection, upload.single("avatar"), handleUploadError, updateProfile);
} else {
  // Development: skip CSRF validation to avoid chicken-and-egg problem
  router.post("/logout", logout);
  router.patch("/profile", upload.single("avatar"), handleUploadError, updateProfile);
}
router.get("/me", me);

// Apply CSRF error handler (must be after routes to catch errors)
router.use(csrfErrorHandler);

module.exports = router;