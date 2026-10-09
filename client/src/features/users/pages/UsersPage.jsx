import { useEffect, useState, useCallback } from "react";
import { useUsers } from "../hooks/useUsers";
import { useAuth } from "../../../hooks/useAuth";
import { ROLES, ROLE_LABELS, ROLE_HIERARCHY } from "../../../constants/roles";
import UserTable from "../components/UserTable";
import UserCard from "../components/UserCard";
import UserForm from "../components/UserForm";
import UserRoleBadge from "../components/UserRoleBadge";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
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

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    const newRole = e.target.elements.role.value;
    if (!newRole) return;
    const result = await assignRole(roleModalUser.id, newRole, `Role changed from ${roleModalUser.role} to ${newRole}`);
    if (result.success) {
      setRoleModalOpen(false);
      setRoleModalUser(null);
    }
  };

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
        {availableRoles.length > 0 && (
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
          onEdit={(u) => { setSelectedUser(u); setModalMode("edit"); }}
          onDeactivate={handleDeactivate}
          onReactivate={handleReactivate}
          onRoleChange={handleRoleChange}
          currentUserId={currentUser?.id}
        />
      </div>

      <div className="lg:hidden">
        {users.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            onEdit={(usr) => { setSelectedUser(usr); setModalMode("edit"); }}
            onDeactivate={handleDeactivate}
            onReactivate={handleReactivate}
            onRoleChange={handleRoleChange}
            currentUserId={currentUser?.id}
          />
        ))}
      </div>

      {modalMode && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(2px)" }}
          onClick={(e) => e.target === e.currentTarget && handleModalClose()}
        >
          <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-101">
                  {modalMode === "create" ? "Create New User" : "Edit User"}
                </h2>
                <button
                  onClick={handleModalClose}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              <UserForm
                initialData={modalMode === "edit" ? selectedUser : null}
                currentUserRole={currentUser?.role}
                onSubmit={modalMode === "create" ? handleCreate : handleEdit}
                onCancel={handleModalClose}
                submitLabel={modalMode === "create" ? "Create User" : "Save Changes"}
              />
            </div>
          </div>
        </div>
      )}

      {roleModalOpen && roleModalUser && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(2px)" }}
          onClick={(e) => e.target === e.currentTarget && (() => { setRoleModalOpen(false); setRoleModalUser(null); })()}
        >
          <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-101">
                  Change Role: {roleModalUser.full_name || roleModalUser.username}
                </h2>
                <button
                  onClick={() => { setRoleModalOpen(false); setRoleModalUser(null); }}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleRoleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Role
                  </label>
                  <div className="mb-2">
                    <UserRoleBadge role={roleModalUser.role} />
                  </div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Role
                  </label>
                  <select
                    name="role"
                    defaultValue=""
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="" disabled>
                      Select new role
                    </option>
                    {availableRoles.map((r) => (
                      <option key={r} value={r} disabled={r === roleModalUser.role}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => { setRoleModalOpen(false); setRoleModalUser(null); }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Change Role
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
