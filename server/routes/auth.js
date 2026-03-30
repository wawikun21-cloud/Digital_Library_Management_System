// ─────────────────────────────────────────────────────────
//  routes/auth.js
// ─────────────────────────────────────────────────────────

const express  = require("express");
const router   = express.Router();
const { login, logout, me, updateProfile } = require("../controllers/authController");
const { upload, handleUploadError }        = require("../middleware/upload");

router.post("/login",  login);
router.post("/logout", logout);
router.get ("/me",     me);

// PATCH /api/auth/profile  — avatar (optional file) + username + password
router.patch(
  "/profile",
  upload.single("avatar"),
  handleUploadError,
  updateProfile
);

module.exports = router;