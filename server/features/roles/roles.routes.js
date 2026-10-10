// ─────────────────────────────────────────────────────────
//  features/roles/roles.routes.js
//
//  Mounted at /api/roles in server/index.js.
//
//  Static paths are registered BEFORE param paths so
//  `GET /permissions` is never shadowed by `GET /:id`.
//
//  GET /my-permissions is requireAuth only — it is the refresh
//  endpoint ordinary clients call. Everything else is Super Admin.
// ─────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();

const RolesController = require("./roles.controller");
const { requireAuth, requireSuperAdmin } = require("../../middleware/authMiddleware");
const { resolvePermissions } = require("./permissionGuards");

// ── Ordinary users refresh their own resolved permissions ──
router.get("/my-permissions", requireAuth, resolvePermissions, RolesController.getMyPermissions);

// ── Everything below is Super Admin only ──────────────────
router.use(requireAuth, requireSuperAdmin);

// ── Static paths first ────────────────────────────────────
router.get("/",                RolesController.getRoles);
router.post("/",               RolesController.createRole);
router.get("/permissions",     RolesController.getPermissions);
router.get("/entities",        RolesController.getEntities);

// ── Specific-user permission editor ───────────────────────
router.get("/users/:userId/permissions",       RolesController.getUserPermissions);
router.put("/users/:userId/overrides",         RolesController.saveUserOverrides);
router.get("/users/:userId/entity-overrides",  RolesController.getUserEntityOverrides);
router.put("/users/:userId/entity-overrides",  RolesController.saveUserEntityOverrides);
router.post("/users/:userId/full-save",        RolesController.saveUserFull);

// ── Role-level management ─────────────────────────────────
router.post("/roles/:roleName/restore-defaults",      RolesController.restoreRoleDefaults);
router.put("/permissions/:roleName",                  RolesController.saveRolePermissions);
router.get("/roles/:roleName/entity-permissions",     RolesController.getRoleEntityPermissions);
router.put("/roles/:roleName/entity-permissions",     RolesController.saveRoleEntityPermissions);

// ── Role metadata CRUD ────────────────────────────────────
router.put("/:roleName",    RolesController.updateRole);
router.delete("/:roleName", RolesController.deleteRole);

// ── Param path LAST — never shadow the static routes above ─
router.get("/:id", RolesController.getRoleDetail);

module.exports = router;
