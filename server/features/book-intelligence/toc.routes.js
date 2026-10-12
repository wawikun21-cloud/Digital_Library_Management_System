const express = require("express");
const router = express.Router();

const TocController = require("./toc.controller");
const { requireAuth } = require("../../middleware/authMiddleware");
const { resolvePermissions, requirePermissionAction } = require("../../features/roles");

// Read-only proposal for a book's table of contents. Gated on the same
// permission as editing a book, since its output feeds the book form.
router.post(
  "/:id/toc/generate",
  requireAuth,
  resolvePermissions,
  requirePermissionAction("manage_lexora_books", "edit"),
  TocController.generate
);

module.exports = router;
