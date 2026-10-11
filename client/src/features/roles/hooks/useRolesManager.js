import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchUsers, fetchUserById } from "../../users";
import * as rolesApi from "../api/rolesApi";
import {
  computeRolePermState,
  computeUserPermState,
  computeUserOverridesToSave,
  computeEntityOverridesToSave,
  initEntityStates,
  toggleUserAction,
  hasRestrictablePermission,
  ENTITY_TYPES,
  getDefinedActions,

} from "../utils/rolesPermissionHelpers";

/**
 * The action set a role is saved with, keyed by permission name.
 *
 * Built from the role's stored grants, so re-running it discards any unsaved
 * edits the drawer has made. Used both when the role editor opens and by
 * "Reset changes", which is why it lives here rather than inside a handler.
 *
 * The input must be a *normalized* role (see openRoleEditor): GET
 * /api/roles/:name returns the whole permission catalog under `permissions`
 * and the role's actual grants under `role_actions` as a
 * { permission_name: actions } map. Reading `permissions` instead seeds every
 * permission as granted, which is what this drawer used to do.
 *
 * `role_actions[name] === null` means "every action this permission defines"
 * — role_permissions.actions is NULL for seeded grants.
 */
function rolePermActionsFrom(role) {
  const permActions = {};
  const definedByName = new Map((role?.permissions || []).map((p) => [p.name, p]));

  for (const [permName, actions] of Object.entries(role?.role_actions || {})) {
    const defined = definedByName.has(permName) ? getDefinedActions(definedByName.get(permName)) : [];
    permActions[permName] = new Set(actions || defined);
  }
  return permActions;
}

/**
 * Flatten GET /api/roles/:name into the shape the drawer needs.
 *
 * The endpoint answers with { role, grants, permissions, role_actions,
 * entity_overrides }. Storing that envelope directly is what put `undefined`
 * in the save URL (`PUT /api/roles/permissions/undefined` → 400 "Role not
 * found") and left the drawer title blank, because `name` and `display_name`
 * live one level down under `role`.
 */
function normalizeRoleDetail(detail, fallbackName) {
  if (!detail?.role) return null;
  return {
    name: detail.role.name || fallbackName,
    display_name: detail.role.display_name || detail.role.name || fallbackName,
    description: detail.role.description || "",
    // Kept so rolePermActionsFrom can resolve "every defined action".
    role_actions: detail.role_actions || {},
    permissions: detail.permissions || [],
  };
}

/**
 * The permissions the user's *role* grants, as full catalog entries.
 *
 * GET /api/roles/users/:id/permissions returns the whole catalog under
 * `permissions` and the granted subset under `role_grants` (names only).
 * Handing the catalog to the editor made every permission look granted, and
 * let a save write overrides for permissions the role does not have at all.
 */
function rolePermissionsForUser(context) {
  const granted = context?.role_grants || [];
  if (!granted.length) return [];
  const byName = new Map((context?.permissions || []).map((p) => [p.name, p]));
  return granted.map((name) => byName.get(name)).filter(Boolean);
}

/**
 * State and transitions for the roles & permissions editor.
 *
 * Holds everything the three drawer modes need so the page can stay a
 * composition of RolesTable + PermissionsDrawer. The pure derivations live
 * in `rolesPermissionHelpers`, so this is orchestration only.
 */
export function useRolesManager({ onFeedback } = {}) {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({});

  const [drawerMode, setDrawerMode] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [editRole, setEditRole] = useState(null);
  const [editRolePermActions, setEditRolePermActions] = useState({});
  const [editRoleUsers, setEditRoleUsers] = useState([]);

  const [editUser, setEditUser] = useState(null);
  const [editUserRolePerms, setEditUserRolePerms] = useState([]);
  const [editUserOverrides, setEditUserOverrides] = useState([]);
  const [editUserNewRoleName, setEditUserNewRoleName] = useState("");
  const [editUserOriginalRole, setEditUserOriginalRole] = useState("");

  const [entityStates, setEntityStates] = useState({});
  const [entityDataLoaded, setEntityDataLoaded] = useState(false);

  /*
   * The feedback callback is held in a ref rather than read directly.
   *
   * Callers pass an inline arrow (`const onFeedback = (…) => …`), which is a
   * brand-new function on every render. Putting that in a dependency array
   * made the load effect re-run on every render, so each fetch resolved a
   * fresh array → setState → re-render → refetch, forever. That is the
   * "Global API flood" on GET /roles and GET /roles/permissions.
   *
   * Reading it through a ref keeps the identity of `notify` stable while
   * still always calling the caller's latest closure.
   */
  const feedbackRef = useRef(onFeedback);
  useEffect(() => {
    feedbackRef.current = onFeedback;
  }, [onFeedback]);

  const notify = useCallback((type, message) => {
    feedbackRef.current?.(type, message);
  }, []);

  /* ── loading ─────────────────────────────────────────── */

  const fetchRoles = useCallback(async () => {
    const res = await rolesApi.getRoles();
    if (!res.data) throw new Error(res.message || "Failed to load roles");
    setRoles(res.data);
  }, []);

  const fetchPermissions = useCallback(async () => {
    const res = await rolesApi.getPermissions();
    if (!res.data) throw new Error(res.message || "Failed to load permissions");
    setPermissions(res.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        await Promise.all([fetchRoles(), fetchPermissions()]);
      } catch (err) {
        if (!cancelled) {
          // Kept in state as well as the toast so the page can render the
          // retryable error panel every other management page has.
          setError(err.message || "Could not load roles.");
          notify("error", err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fetchRoles, fetchPermissions, notify, reloadToken]);

  /** Retry the initial load from the page's error panel. */
  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  /* ── drawer: open roles ──────────────────────────────── */

  const openRoleEditor = useCallback(async (role) => {
    setDrawerMode("editRole");
    setDrawerLoading(true);
    try {
      const [roleRes, usersRes] = await Promise.all([
        rolesApi.getRole(role.name),
        // 100 is the maximum the users list endpoint accepts (validateListQuery
        // rejects anything above it with a 400).
        fetchUsers({ role: role.name, limit: 100 }),
      ]);
      const roleData = normalizeRoleDetail(roleRes.data, role.name);
      if (!roleData) {
        throw new Error(`Role "${role.display_name || role.name}" could not be loaded`);
      }
      setEditRole(roleData);

      // Each granted permission starts at the role's current action set.
      setEditRolePermActions(rolePermActionsFrom(roleData));
      setEditRoleUsers(usersRes.data || []);
    } catch (err) {
      notify("error", err.message || "Failed to load role details");
    } finally {
      setDrawerLoading(false);
    }
  }, [notify]);

  const openUserEditor = useCallback(async (user) => {
    setDrawerMode("editUser");
    setDrawerLoading(true);
    setEntityDataLoaded(false);
    try {
      const [permRes, entityRes] = await Promise.all([
        rolesApi.getUserPermissions(user.id),
        rolesApi.getUserEntityOverrides(user.id),
      ]);

      const overrides = Object.entries(permRes.data?.overrides || {}).map(([permission_name, o]) => ({
        permission_name,
        ...o,
      }));

      setEditUser(user);
      setEditUserRolePerms(rolePermissionsForUser(permRes.data));
      setEditUserOverrides(overrides);
      setEditUserNewRoleName(user.role || editRole?.name || "");
      setEditUserOriginalRole(user.role || editRole?.name || "");
      setEntityStates(initEntityStates(entityRes.data?.rows || []));
    } catch (err) {
      notify("error", err.message || "Failed to load user data");
    } finally {
      setDrawerLoading(false);
    }
  }, [editRole, notify]);

  /**
   * Open the user editor straight from a deep link (the Users page row
   * action), without passing through a role.
   */
  const openUserById = useCallback(async (userId) => {
    setDrawerMode("editUser");
    setDrawerLoading(true);
    setEntityDataLoaded(false);
    try {
      const [userRes, permRes, entityRes] = await Promise.all([
        // Fetch the one target user directly — listing every user to find a
        // single id both exceeded the list endpoint's 100-row cap and scaled
        // with total user count.
        fetchUserById(userId),
        rolesApi.getUserPermissions(userId),
        rolesApi.getUserEntityOverrides(userId),
      ]);
      // A non-2xx response comes back as { success:false, error } rather than
      // throwing, so surface the server's message instead of a misleading
      // "User not found".
      const target = userRes?.data;
      if (!target) throw new Error(userRes?.error || "User not found");

      const overrides = Object.entries(permRes.data?.overrides || {}).map(([permission_name, o]) => ({
        permission_name,
        ...o,
      }));

      setEditUser(target);
      setEditUserRolePerms(rolePermissionsForUser(permRes.data));
      setEditUserOverrides(overrides);
      setEditUserNewRoleName(target.role || "");
      setEditUserOriginalRole(target.role || "");
      setEntityStates(initEntityStates(entityRes.data?.rows || []));
    } catch (err) {
      notify("error", err.message || "Failed to load user data");
    } finally {
      setDrawerLoading(false);
    }
  }, [notify]);

  const enterAccessRestrictions = useCallback(async () => {
    setDrawerMode("accessRestrictions");
    if (entityDataLoaded) return;
    setDrawerLoading(true);
    try {
      const next = { ...entityStates };
      await Promise.all(ENTITY_TYPES.map(async (entityType) => {
        const res = await rolesApi.getEntities(entityType);
        next[entityType] = {
          ...next[entityType],
          entities: res.data || [],
          loaded: true,
        };
      }));
      setEntityStates(next);
      setEntityDataLoaded(true);
    } catch (err) {
      notify("error", err.message || "Failed to load entity data");
    } finally {
      setDrawerLoading(false);
    }
  }, [entityStates, entityDataLoaded, notify]);

  const closeDrawer = useCallback(() => {
    setDrawerMode(null);
    setEditRole(null);
    setEditRolePermActions({});
    setEditRoleUsers([]);
    setEditUser(null);
    setEditUserRolePerms([]);
    setEditUserOverrides([]);
    setEditUserNewRoleName("");
    setEditUserOriginalRole("");
    setEntityStates({});
    setEntityDataLoaded(false);
  }, []);

  /** Back from Access Restrictions to the user's permission grid. */
  const backToUserEditor = useCallback(() => {
    if (editUser) setDrawerMode("editUser");
  }, [editUser]);

  /* ── toggles ─────────────────────────────────────────── */

  const handleRoleActionToggle = useCallback((perm, action) => {
    setEditRolePermActions((prev) => {
      const current = prev[perm.name] || new Set();
      const next = new Set(current);
      if (next.has(action)) next.delete(action);
      else next.add(action);

      const result = { ...prev };
      if (next.size === 0) delete result[perm.name];
      else result[perm.name] = next;
      return result;
    });
  }, []);

  const handleUserActionToggle = useCallback((perm, action) => {
    const roleHasPermission = editUserRolePerms.some((p) => p.name === perm.name);
    setEditUserOverrides((prev) =>
      toggleUserAction(prev, perm.name, action, perm.definedActions, roleHasPermission)
    );
  }, [editUserRolePerms]);

  const handleScopeToggle = useCallback((entityType) => {
    setEntityStates((prev) => {
      const state = prev[entityType];
      if (!state) return prev;
      const nextScope = state.scope === "selected" ? "denied" : "selected";
      return {
        ...prev,
        [entityType]: {
          ...state,
          scope: nextScope,
          selectedIds: nextScope === "selected" ? state.selectedIds : new Set(),
        },
      };
    });
  }, []);

  const handleRecordToggle = useCallback((entityType, entityId) => {
    setEntityStates((prev) => {
      const state = prev[entityType];
      const newIds = new Set(state.selectedIds);
      if (newIds.has(entityId)) newIds.delete(entityId);
      else newIds.add(entityId);
      return { ...prev, [entityType]: { ...state, selectedIds: newIds } };
    });
  }, []);

  const handleEntitySearch = useCallback((entityType, query) => {
    setEntityStates((prev) => ({
      ...prev,
      [entityType]: { ...prev[entityType], search: query },
    }));
  }, []);

  /* ── computed ────────────────────────────────────────── */

  const rolePermStates = useMemo(
    () => computeRolePermState(permissions, editRolePermActions),
    [permissions, editRolePermActions]
  );

  const userPermStates = useMemo(
    () => computeUserPermState(editUserRolePerms, editUserOverrides),
    [editUserRolePerms, editUserOverrides]
  );

  const visibleEntityTypes = useMemo(
    () => ENTITY_TYPES.filter((type) => hasRestrictablePermission(userPermStates, type)),
    [userPermStates]
  );

  const filteredRoles = useMemo(() => {
    const byStatus = statusFilter
      ? roles.filter((r) => (r.is_active !== false) === (statusFilter === "active"))
      : roles;
    if (!search) return byStatus;
    const s = search.toLowerCase();
    return byStatus.filter((r) =>
      String(r.display_name || "").toLowerCase().includes(s) ||
      String(r.name || "").toLowerCase().includes(s)
    );
  }, [roles, search, statusFilter]);

  /* ── save ────────────────────────────────────────────── */

  const handleSaveRole = useCallback(async () => {
    if (!editRole?.name) {
      notify("error", "This role is missing its name, so it cannot be saved. Close and reopen it.");
      return;
    }
    setSaving(true);
    try {
      // `permission_name` is the field the server validates — this used to send
      // `name`, which failed every grant with "permission_name is required".
      const grants = Object.entries(editRolePermActions).map(([permissionName, actions]) => ({
        permission_name: permissionName,
        actions: Array.from(actions),
      }));
      const res = await rolesApi.updateRolePermissions(editRole.name, grants);
      if (!res.ok) throw new Error(res.message || "Failed to update role permissions");
      notify("success", "Role permissions updated");
      closeDrawer();
      await fetchRoles();
    } catch (err) {
      notify("error", err.message);
    } finally {
      setSaving(false);
    }
  }, [editRole, editRolePermActions, closeDrawer, fetchRoles, notify]);

  const handleSaveUser = useCallback(async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await rolesApi.updateUserFullSave(editUser.id, {
        role: editUserNewRoleName && editUserNewRoleName !== editUserOriginalRole ? editUserNewRoleName : undefined,
        overrides: computeUserOverridesToSave(userPermStates, editUserRolePerms),
        entityOverrides: computeEntityOverridesToSave(entityStates),
      });
      if (!res.ok) throw new Error(res.message || "Failed to update user");
      notify("success", "User permissions updated");
      closeDrawer();
      await fetchRoles();
    } catch (err) {
      notify("error", err.message);
    } finally {
      setSaving(false);
    }
  }, [editUser, editUserNewRoleName, editUserOriginalRole, userPermStates, editUserRolePerms, entityStates, closeDrawer, fetchRoles, notify]);

  const handleSave = useCallback(() => {
    if (drawerMode === "editRole") return handleSaveRole();
    if (drawerMode === "editUser") return handleSaveUser();
    return undefined;
  }, [drawerMode, handleSaveRole, handleSaveUser]);

  /* ── role CRUD ───────────────────────────────────────── */

  const handleCreate = useCallback(async () => {
    setSaving(true);
    try {
      const res = await rolesApi.createRole(formData);
      if (!res.ok) throw new Error(res.message || "Failed to create role");
      notify("success", "Role created successfully");
      setShowAddModal(false);
      setFormData({});
      await fetchRoles();
    } catch (err) {
      notify("error", err.message);
    } finally {
      setSaving(false);
    }
  }, [formData, fetchRoles, notify]);

  const handleEdit = useCallback(async () => {
    setSaving(true);
    try {
      const res = await rolesApi.updateRole(editingRole.name, formData);
      if (!res.ok) throw new Error(res.message || "Failed to update role");
      notify("success", "Role updated successfully");
      setShowEditModal(false);
      setEditingRole(null);
      setFormData({});
      await fetchRoles();
    } catch (err) {
      notify("error", err.message);
    } finally {
      setSaving(false);
    }
  }, [editingRole, formData, fetchRoles, notify]);

  const openAdd = useCallback(() => {
    setEditingRole(null);
    setFormData({});
    setShowAddModal(true);
  }, []);

  const closeAdd = useCallback(() => {
    setShowAddModal(false);
    setFormData({});
  }, []);

  const closeEdit = useCallback(() => {
    setShowEditModal(false);
    setEditingRole(null);
    setFormData({});
  }, []);

  const openEdit = useCallback((role) => {
    setEditingRole(role);
    setFormData({
      display_name: role.display_name || "",
      description: role.description || "",
    });
    setShowEditModal(true);
  }, []);

  const openDelete = useCallback((role) => {
    setDeleteTarget({ ...role });
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await rolesApi.deleteRole(deleteTarget.name);
      if (!res.ok) throw new Error(res.message || "Failed to delete role");
      notify("success", "Role deleted successfully");
      setDeleteTarget(null);
      await fetchRoles();
    } catch (err) {
      notify("error", err.message);
    } finally {
      setSaving(false);
    }
  }, [deleteTarget, fetchRoles, notify]);

  /*
   * Bulk actions, one per editor.
   *
   * These used to be a single `grantAll` wired to both the "Grant all" and
   * "Reset to role defaults" buttons, and to the role editor's "Reset to role
   * defaults" link. Clearing overrides does reset a *user* to the role's
   * grants, but it does nothing at all to a *role*, and it certainly does not
   * "grant all" anything — a user's permissions are bounded by their role
   * (computeUserOverridesToSave drops any row for a permission the role does
   * not grant), so an override granting everything is indistinguishable from
   * having no override. Both buttons therefore did the same, and one of them
   * was a silent no-op where it was shown.
   *
   * So: two actions, each named for what it actually does to its own editor.
   */

  /** Role editor — drop unsaved edits, return to the role's saved grants. */
  const resetRoleDefaults = useCallback(() => {
    if (!editRole) return;
    setEditRolePermActions(rolePermActionsFrom(editRole));
  }, [editRole]);

  /** User editor — drop overrides, return to whatever the role grants. */
  const resetUserDefaults = useCallback(() => setEditUserOverrides([]), []);

  return {
    roles,
    permissions,
    loading,
    error,
    reload,
    saving,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filteredRoles,

    showAddModal,
    openAdd,
    closeAdd,
    showEditModal,
    editingRole,
    deleteTarget,
    formData,
    setFormData,
    closeEdit,
    setDeleteTarget,

    drawerMode,
    drawerLoading,
    editRole,
    editRoleUsers,
    rolePermStates,
    editUser,
    editUserNewRoleName,
    editUserOriginalRole,
    editUserRolePerms,
    userPermStates,
    entityStates,
    visibleEntityTypes,

    openRoleEditor,
    openUserEditor,
    openUserById,
    enterAccessRestrictions,
    closeDrawer,
    backToUserEditor,
    handleRoleActionToggle,
    handleUserActionToggle,
    handleScopeToggle,
    handleRecordToggle,
    handleEntitySearch,
    setEditUserNewRoleName,
    resetRoleDefaults,
    resetUserDefaults,
    handleSave,
    handleCreate,
    handleEdit,
    openEdit,
    openDelete,
    handleDelete,
  };
}
