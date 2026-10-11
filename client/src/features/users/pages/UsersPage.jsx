import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Users, AlertTriangle, RotateCw } from "lucide-react";
import { useUsers } from "../hooks/useUsers";
import { useAuth } from "../../../hooks/useAuth";
import { ROLE_HIERARCHY } from "../../../constants/roles";
import { UserPermissionsDrawer } from "../../roles";
import Pagination from "../../../components/books/Pagination";
import UsersToolbar from "../components/UsersToolbar";
import UsersEmptyState from "../components/UsersEmptyState";
import UserTable from "../components/UserTable";
import UserCard from "../components/UserCard";
import UserFormModal from "../components/UserFormModal";
import UserRoleModal from "../components/UserRoleModal";
import Toast from "../../../components/Toast";
import { useToast } from "../../../hooks/useToast";

/**
 * User Management — composition only.
 *
 * The shell, header scale and error panel follow the same pattern as
 * RolesPage, CourseLibrary and ManageLexoraBooks (shared primitives from
 * src/styles/ui.css). Data lives in `useUsers`; UI-level state is limited
 * to which modal is open, which row is selected, and the query filters.
 *
 * Per-action gating mirrors the server: a handler the signed-in user is
 * not allowed to run is passed as `undefined`, and the tables render no
 * button for it.
 */
export default function UsersPage() {
  const { user: currentUser, hasPermissionAction } = useAuth();
  const { toast, success, error: showError, hideToast } = useToast();
  const {
    users,
    loading,
    error: apiError,
    pagination,
    loadUsers,
    addUser,
    editUser,
    assignRole,
    removeUser,
    restoreUser,
  } = useUsers();

  const [modalMode, setModalMode] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [roleModalError, setRoleModalError] = useState("");

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const drawerUserId = searchParams.get("permissions") ? Number(searchParams.get("permissions")) : null;

  // ── Per-action gating — the server already enforces the same checks. ──
  const canCreate       = hasPermissionAction("manage_users", "create");
  const canEdit         = hasPermissionAction("manage_users", "edit");
  const canDelete       = hasPermissionAction("manage_users", "delete");
  const canReactivate   = hasPermissionAction("manage_users", "reactivate");
  const canManageRoles  = hasPermissionAction("manage_users", "manage_roles");
  const canEditPerms    = hasPermissionAction("manage_permissions", "view");

  // The effect below is the single loader; bumping the token forces a
  // refetch of the current query without duplicating its parameter map.
  const reload = () => setReloadToken((token) => token + 1);

  useEffect(() => {
    loadUsers({
      page,
      limit: pagination.limit,
      ...(roleFilter && { role: roleFilter }),
      ...(search && { search }),
    });
  }, [loadUsers, page, search, roleFilter, pagination.limit, reloadToken]);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleFilter = (value) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleCreate = async (formData) => {
    const result = await addUser({ ...formData, password: "password123" });
    if (result.success) {
      setModalMode(null);
      setPage(1);
      reload();
    }
  };

  const handleEdit = async (formData) => {
    if (!selectedUser) return;
    const result = await editUser(selectedUser.id, formData);
    if (result.success) {
      setModalMode(null);
      setSelectedUser(null);
    }
  };

  const handleDeactivate = async (user) => {
    const result = await removeUser(user.id);
    if (result.success) success("User deactivated");
    else showError(result.error || "Failed to deactivate user");
  };

  const handleReactivate = async (user) => {
    const result = await restoreUser(user.id);
    if (result.success) success("User reactivated");
    else showError(result.error || "Failed to reactivate user");
  };

  const handleRoleChange = (user) => {
    setRoleModalError("");
    setRoleModalUser(user);
    setRoleModalOpen(true);
  };

  /** Submit returns the API result so the modal can stay open on refusal. */
  const handleRoleSubmit = async (userId, newRole, reason) => {
    setRoleModalError("");
    const result = await assignRole(userId, newRole, reason);
    if (result.success) {
      setRoleModalOpen(false);
      setRoleModalUser(null);
    } else {
      setRoleModalError(result.error || "Failed to change role");
    }
    return result;
  };

  /** Deep-linkable entry point for the specific-user permissions drawer. */
  const handleOpenPermissions = useCallback((user) => {
    const next = new URLSearchParams(searchParams);
    next.set("permissions", String(user.id));
    setSearchParams(next);
    navigate({ pathname: "/dashboard/users", search: `?${next.toString()}` });
  }, [navigate, searchParams, setSearchParams]);

  const handleClosePermissions = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("permissions");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleModalClose = () => {
    setModalMode(null);
    setSelectedUser(null);
  };

  const availableRoles = currentUser
    ? (ROLE_HIERARCHY[currentUser.role] || [])
    : [];

  const hasFilters = Boolean(search.trim() || roleFilter);
  const editProps = {
    onEdit: canEdit ? (u) => { setSelectedUser(u); setModalMode("edit"); } : undefined,
    onDeactivate: canDelete ? handleDeactivate : undefined,
    onReactivate: canReactivate ? handleReactivate : undefined,
    onRoleChange: canManageRoles ? handleRoleChange : undefined,
    onPermissions: canEditPerms ? handleOpenPermissions : undefined,
    currentUserId: currentUser?.id,
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold" style={{ color: "var(--text-primary)" }}>
            <Users size={22} style={{ color: "var(--accent-amber)" }} aria-hidden="true" />
            User Management
          </h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Manage accounts, roles, and permissions
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setSelectedUser(null); setModalMode("create"); }}
            className="rp-btn rp-btn--primary"
          >
            <Plus size={16} aria-hidden="true" /> Create New User
          </button>
        )}
      </div>

      {/* ── Load failure ────────────────────────────────── */}
      {apiError && (
        <div
          role="alert"
          className="rounded-xl border p-4 text-sm"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <p className="flex items-start gap-2" style={{ color: "var(--accent-danger)" }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {apiError}
          </p>
          <button type="button" onClick={reload} className="rp-btn rp-btn--secondary mt-3">
            <RotateCw size={14} aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      <UsersToolbar
        search={search}
        onSearch={handleSearch}
        roleFilter={roleFilter}
        onRoleFilter={handleRoleFilter}
        roleOptions={availableRoles}
        total={pagination.total}
      />

      {/* ── Desktop table ───────────────────────────────── */}
      <div className="hidden lg:block">
        <UserTable users={users} loading={loading} hasFilters={hasFilters} {...editProps} />
      </div>

      {/* ── Mobile cards ────────────────────────────────── */}
      <div className="lg:hidden">
        {loading ? (
          <div role="status" className="flex items-center justify-center py-20">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading users…</span>
          </div>
        ) : users.length === 0 ? (
          <UsersEmptyState hasFilters={hasFilters} />
        ) : (
          users.map((u) => <UserCard key={u.id} user={u} {...editProps} />)
        )}
      </div>

      {pagination.totalPages > 1 && (
        <Pagination currentPage={page} totalPages={pagination.totalPages} setCurrentPage={setPage} />
      )}

      <UserFormModal
        open={!!modalMode}
        mode={modalMode}
        user={selectedUser}
        currentUserRole={currentUser?.role}
        onClose={handleModalClose}
        onSubmit={modalMode === "create" ? handleCreate : handleEdit}
      />

      <UserRoleModal
        open={roleModalOpen}
        user={roleModalUser}
        currentUserRole={currentUser?.role}
        availableRoles={availableRoles}
        error={roleModalError}
        onClose={() => { setRoleModalOpen(false); setRoleModalUser(null); setRoleModalError(""); }}
        onSubmit={handleRoleSubmit}
      />

      <UserPermissionsDrawer
        userId={drawerUserId}
        onClose={handleClosePermissions}
      />

      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={hideToast} />
    </div>
  );
}
