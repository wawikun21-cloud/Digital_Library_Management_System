import { Plus } from "lucide-react";
import { useRolesManager } from "../hooks/useRolesManager";
import RolesTable from "../components/RolesTable";
import PermissionsDrawer from "../components/PermissionsDrawer";
import RoleForm from "../components/RoleForm";
import Drawer from "../../../components/ui/Drawer";
import Modal from "../../../components/ui/Modal";
import ConfirmationModal from "../../../components/ConfirmationModal";
import Toast from "../../../components/Toast";
import { useToast } from "../../../hooks/useToast";

/**
 * Roles & Permissions — LMS-SOP parity.
 *
 * Composition only: the roles table, the add/edit modals, the delete
 * confirmation, and one three-mode drawer. All editing state lives in
 * `useRolesManager`.
 */
export default function RolesPage() {
  const { toast, success, error, hideToast } = useToast();
  const onFeedback = (type, message) => (type === "success" ? success(message) : error(message));

  const manager = useRolesManager({ onFeedback });

  if (manager.loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Loading roles…
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 p-6 sm:space-y-5">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Roles &amp; Permissions</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            Manage roles and assign permissions
          </p>
        </div>
        <button
          onClick={() => { manager.setFormData({}); manager.setShowAddModal(true); }}
          className="flex items-center gap-2 self-start rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity duration-150 sm:self-auto"
          style={{ background: "#EEA23A" }}
        >
          <Plus size={15} /> Add Role
        </button>
      </div>

      {/* ── Roles table ─────────────────────────────────── */}
      <RolesTable
        roles={manager.filteredRoles}
        search={manager.search}
        onSearch={manager.setSearch}
        onRoleClick={manager.openRoleEditor}
        onEditClick={manager.openEdit}
        onDeleteClick={manager.openDelete}
      />

      {/* ── Add role ────────────────────────────────────── */}
      {manager.showAddModal && (
        <Modal
          isOpen={manager.showAddModal}
          onClose={() => { manager.setShowAddModal(false); manager.setFormData({}); }}
          title="Add New Role"
        >
          <RoleForm
            formData={manager.formData}
            setFormData={manager.setFormData}
            onSave={manager.handleCreate}
            saving={manager.saving}
            onCancel={() => { manager.setShowAddModal(false); manager.setFormData({}); }}
            submitLabel="Create Role"
            showName
          />
        </Modal>
      )}

      {/* ── Edit role metadata ──────────────────────────── */}
      {manager.showEditModal && manager.editingRole && (
        <Modal
          isOpen={manager.showEditModal}
          onClose={() => { manager.setShowEditModal(false); manager.setEditingRole(null); manager.setFormData({}); }}
          title="Edit Role"
        >
          <RoleForm
            formData={manager.formData}
            setFormData={manager.setFormData}
            onSave={manager.handleEdit}
            saving={manager.saving}
            onCancel={() => { manager.setShowEditModal(false); manager.setEditingRole(null); manager.setFormData({}); }}
            submitLabel="Save Changes"
            showName={false}
          />
        </Modal>
      )}

      {/* ── Delete role ─────────────────────────────────── */}
      {manager.deleteTarget && (
        <ConfirmationModal
          isOpen={Boolean(manager.deleteTarget)}
          title="Delete Role"
          description={`Are you sure you want to delete "${manager.deleteTarget.display_name}"? Its permission grants are removed too.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          onConfirm={manager.handleDelete}
          onCancel={() => manager.setDeleteTarget(null)}
        />
      )}

      {/* ── The three-mode permission editor ────────────── */}
      <Drawer
        open={manager.drawerMode !== null}
        onClose={manager.closeDrawer}
        width={520}
        label="Permissions"
      >
        <PermissionsDrawer
          drawerMode={manager.drawerMode}
          drawerLoading={manager.drawerLoading}
          saving={manager.saving}
          editRole={manager.editRole}
          editRoleUsers={manager.editRoleUsers}
          rolePermStates={manager.rolePermStates}
          editUser={manager.editUser}
          editUserNewRoleName={manager.editUserNewRoleName}
          editUserOriginalRole={manager.editUserOriginalRole}
          editUserRolePerms={manager.editUserRolePerms}
          userPermStates={manager.userPermStates}
          entityStates={manager.entityStates}
          visibleEntityTypes={manager.visibleEntityTypes}
          roles={manager.roles}
          onCancel={manager.closeDrawer}
          onSave={manager.handleSave}
          onRoleChange={manager.setEditUserNewRoleName}
          onRoleActionToggle={manager.handleRoleActionToggle}
          onUserActionToggle={manager.handleUserActionToggle}
          onGrantAll={manager.grantAll}
          onResetDefaults={manager.grantAll}
          onManageAccessRestrictions={manager.enterAccessRestrictions}
          onScopeToggle={manager.handleScopeToggle}
          onRecordToggle={manager.handleRecordToggle}
          onEntitySearch={manager.handleEntitySearch}
          onOpenUserEditor={manager.openUserEditor}
          onBackToEditUser={manager.backToUserEditor}
        />
      </Drawer>

      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={hideToast} />
    </div>
  );
}
