import { Plus, AlertTriangle, RotateCw } from "lucide-react";
import { useRolesManager } from "../hooks/useRolesManager";
import { useAuth } from "../../../hooks/useAuth";
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
 *
 * The shell, header scale and loading/error panels follow the same pattern as
 * CourseLibrary and ManageLexoraBooks so this page reads as part of the same
 * product rather than a separate one.
 */
export default function RolesPage() {
  const { toast, success, error, hideToast } = useToast();
  const onFeedback = (type, message) => (type === "success" ? success(message) : error(message));

  // Roles are a manage_permissions resource. The server enforces the same
  // checks; this only stops the UI offering actions that will be refused.
  const { hasPermissionAction } = useAuth();
  const canManageRoles = hasPermissionAction("manage_permissions", "edit");

  const manager = useRolesManager({ onFeedback });

  if (manager.loading) {
    return (
      <div role="status" className="flex items-center justify-center py-20">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading roles…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold" style={{ color: "var(--text-primary)" }}></h1>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          </p>
        </div>
        {canManageRoles && (
          <button onClick={manager.openAdd} className="rp-btn rp-btn--primary">
            <Plus size={16} aria-hidden="true" /> Add Role
          </button>
        )}
      </div>

      {/* ── Load failure ────────────────────────────────── */}
      {manager.error && (
        <div
          role="alert"
          className="rounded-xl border p-4 text-sm"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <p className="flex items-start gap-2" style={{ color: "var(--accent-danger)" }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {manager.error}
          </p>
          <button type="button" onClick={manager.reload} className="rp-btn rp-btn--secondary mt-3">
            <RotateCw size={14} aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      {/* ── Roles table ─────────────────────────────────── */}
      <RolesTable
        roles={manager.filteredRoles}
        search={manager.search}
        onSearch={manager.setSearch}
        statusFilter={manager.statusFilter}
        onStatusFilter={manager.setStatusFilter}
        onRoleClick={manager.openRoleEditor}
        onEditClick={canManageRoles ? manager.openEdit : undefined}
        onDeleteClick={canManageRoles ? manager.openDelete : undefined}
      />

      {/* ── Add role ────────────────────────────────────── */}
      {manager.showAddModal && (
        <Modal isOpen={manager.showAddModal} onClose={manager.closeAdd} title="Add New Role">
          <RoleForm
            formData={manager.formData}
            setFormData={manager.setFormData}
            onSave={manager.handleCreate}
            saving={manager.saving}
            onCancel={manager.closeAdd}
            submitLabel="Create Role"
            showName
          />
        </Modal>
      )}

      {/* ── Edit role metadata ──────────────────────────── */}
      {manager.showEditModal && manager.editingRole && (
        <Modal isOpen={manager.showEditModal} onClose={manager.closeEdit} title="Edit Role">
          <RoleForm
            formData={manager.formData}
            setFormData={manager.setFormData}
            onSave={manager.handleEdit}
            saving={manager.saving}
            onCancel={manager.closeEdit}
            submitLabel="Save Changes"
            showName={false}
          />
        </Modal>
      )}

      {/* ── Delete role ─────────────────────────────────── */}
      {manager.deleteTarget && (
        <ConfirmationModal
          isOpen
          title="Delete Role"
          message={`Are you sure you want to delete "${manager.deleteTarget.display_name}"? Its permission grants are removed too.`}
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
          onResetRoleDefaults={manager.resetRoleDefaults}
          onResetUserDefaults={manager.resetUserDefaults}
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
