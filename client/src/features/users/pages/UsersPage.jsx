import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUsers } from "../hooks/useUsers";
import { useAuth } from "../../../hooks/useAuth";
import { ROLES, ROLE_LABELS, ROLE_HIERARCHY } from "../../../constants/roles";
import { UserPermissionsDrawer } from "../../roles";
import UserTable from "../components/UserTable";
import UserCard from "../components/UserCard";
import UserFormModal from "../components/UserFormModal";
import UserRoleModal from "../components/UserRoleModal";

export default function UsersPage() {
  const { user: currentUser, hasPermissionAction } = useAuth();
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

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState(null);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const drawerUserId = searchParams.get("permissions") ? Number(searchParams.get("permissions")) : null;

  // Per-action gating — the server already enforces the same checks.
  const canCreate       = hasPermissionAction("manage_users", "create");
  const canEdit         = hasPermissionAction("manage_users", "edit");
  const canDelete       = hasPermissionAction("manage_users", "delete");
  const canReactivate   = hasPermissionAction("manage_users", "reactivate");
  const canManageRoles  = hasPermissionAction("manage_users", "manage_roles");
  const canEditPerms    = hasPermissionAction("manage_permissions", "view");

  useEffect(() => {
    loadUsers({ page: 1, limit: pagination.limit, ...(roleFilter && { role: roleFilter }), ...(search && { search }) });
  }, [loadUsers, search, roleFilter, pagination.limit]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleRoleFilter = (e) => {
    setRoleFilter(e.target.value);
  };

  const handleCreate = async (formData) => {
    const result = await addUser({ ...formData, password: "password123" });
    if (result.success) {
      setModalMode(null);
      loadUsers({ page: 1, limit: pagination.limit, ...(roleFilter && { role: roleFilter }), ...(search && { search }) });
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
    await removeUser(user.id);
  };

  const handleReactivate = async (user) => {
    await restoreUser(user.id);
  };

  const handleRoleChange = (user) => {
    setRoleModalUser(user);
    setRoleModalOpen(true);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-101">User Management</h1>
        {canCreate && (
          <button
            onClick={() => { setSelectedUser(null); setModalMode("create"); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Create New User
          </button>
        )}
      </div>
      <div className="h-px bg-gray-200 dark:bg-gray-700" />

      {apiError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {apiError}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by username, name, or email..."
          value={search}
          onChange={handleSearch}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={roleFilter}
          onChange={handleRoleFilter}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-101 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          {availableRoles.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      <div className="hidden lg:block">
        <UserTable
          users={users}
          loading={loading}
          onEdit={canEdit ? (u) => { setSelectedUser(u); setModalMode("edit"); } : undefined}
          onDeactivate={canDelete ? handleDeactivate : undefined}
          onReactivate={canReactivate ? handleReactivate : undefined}
          onRoleChange={canManageRoles ? handleRoleChange : undefined}
          onPermissions={canEditPerms ? handleOpenPermissions : undefined}
          currentUserId={currentUser?.id}
        />
      </div>

      <div className="lg:hidden">
        {users.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            onEdit={canEdit ? (usr) => { setSelectedUser(usr); setModalMode("edit"); } : undefined}
            onDeactivate={canDelete ? handleDeactivate : undefined}
            onReactivate={canReactivate ? handleReactivate : undefined}
            onRoleChange={canManageRoles ? handleRoleChange : undefined}
            onPermissions={canEditPerms ? handleOpenPermissions : undefined}
            currentUserId={currentUser?.id}
          />
        ))}
      </div>

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
        onClose={() => { setRoleModalOpen(false); setRoleModalUser(null); }}
        onSubmit={async (userId, newRole, reason) => {
          await assignRole(userId, newRole, reason);
          setRoleModalOpen(false);
          setRoleModalUser(null);
        }}
      />

      <UserPermissionsDrawer
        userId={drawerUserId}
        onClose={handleClosePermissions}
      />
    </div>
  );
}
