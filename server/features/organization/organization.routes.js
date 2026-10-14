// ─────────────────────────────────────────────────────────
//  features/organization/organization.routes.js
//
//  /api/organization/* — schools, departments, categories,
//  hierarchy, and category↔book assignments.
//
//  Guard chain on every route:
//    requireAuth → resolvePermissions → resolveSchoolScope
//      → requirePermissionAction("manage_organization", <action>)
//
//  School WRITES are additionally restricted to super_admin
//  inside the service layer (the guard alone must not be the
//  only control).
// ─────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();

const OrganizationController = require("./organization.controller");
const { resolveSchoolScope } = require("./schoolScope");
const {
  requireAuth,
  resolvePermissions,
  requirePermissionAction,
} = require("../roles");

router.use(requireAuth, resolvePermissions, resolveSchoolScope);

// ── Hierarchy ─────────────────────────────────────────────
router.get(
  "/hierarchy",
  requirePermissionAction("manage_organization", "view"),
  OrganizationController.getHierarchy
);

// ── Schools ───────────────────────────────────────────────
router.get(
  "/schools",
  requirePermissionAction("manage_organization", "view"),
  OrganizationController.listSchools
);
router.get(
  "/schools/:id",
  requirePermissionAction("manage_organization", "view"),
  OrganizationController.getSchool
);
router.post(
  "/schools",
  requirePermissionAction("manage_organization", "create"),
  OrganizationController.createSchool
);
router.put(
  "/schools/:id",
  requirePermissionAction("manage_organization", "edit"),
  OrganizationController.updateSchool
);
router.delete(
  "/schools/:id",
  requirePermissionAction("manage_organization", "delete"),
  OrganizationController.deleteSchool
);

// ── Departments ───────────────────────────────────────────
router.get(
  "/departments",
  requirePermissionAction("manage_organization", "view"),
  OrganizationController.listDepartments
);
router.get(
  "/departments/:id",
  requirePermissionAction("manage_organization", "view"),
  OrganizationController.getDepartment
);
router.post(
  "/departments",
  requirePermissionAction("manage_organization", "create"),
  OrganizationController.createDepartment
);
router.put(
  "/departments/:id",
  requirePermissionAction("manage_organization", "edit"),
  OrganizationController.updateDepartment
);
router.delete(
  "/departments/:id",
  requirePermissionAction("manage_organization", "delete"),
  OrganizationController.deleteDepartment
);

// ── Categories ────────────────────────────────────────────
router.get(
  "/categories",
  requirePermissionAction("manage_organization", "view"),
  OrganizationController.listCategories
);
router.get(
  "/categories/:id",
  requirePermissionAction("manage_organization", "view"),
  OrganizationController.getCategory
);
router.get(
  "/categories/:id/books",
  requirePermissionAction("manage_organization", "view"),
  OrganizationController.getCategoryBooks
);

// Bulk assignment: filter-driven or explicit ids (dry_run previews).
router.post(
  "/categories/:id/books",
  requirePermissionAction("manage_organization", "edit"),
  OrganizationController.assignCategoryBooks
);
router.post(
  "/categories",
  requirePermissionAction("manage_organization", "create"),
  OrganizationController.createCategory
);
router.put(
  "/categories/:id",
  requirePermissionAction("manage_organization", "edit"),
  OrganizationController.updateCategory
);
router.delete(
  "/categories/:id",
  requirePermissionAction("manage_organization", "delete"),
  OrganizationController.deleteCategory
);

// ── Category ↔ book assignments ───────────────────────────
router.get(
  "/books/:bookId/categories",
  requirePermissionAction("manage_organization", "view"),
  OrganizationController.getBookCategories
);
router.get(
  "/lexora-books/:bookId/categories",
  requirePermissionAction("manage_organization", "view"),
  OrganizationController.getLexoraBookCategories
);
router.put(
  "/books/:bookId/categories",
  requirePermissionAction("manage_organization", "edit"),
  OrganizationController.setBookCategories
);
router.put(
  "/lexora-books/:bookId/categories",
  requirePermissionAction("manage_organization", "edit"),
  OrganizationController.setLexoraBookCategories
);

module.exports = router;
