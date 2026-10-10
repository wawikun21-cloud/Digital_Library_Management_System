import { useEffect } from "react";
import { useRolesManager } from "../hooks/useRolesManager";
import PermissionsDrawer from "./PermissionsDrawer";
import Drawer from "../../../components/ui/Drawer";
import Toast from "../../../components/Toast";
import { useToast } from "../../../hooks/useToast";

/**
 * Specific-user permission editor, reachable directly from the Users page
 * (`/dashboard/users?permissions=<id>`).
 *
 * It reuses the same state manager and drawer as `/dashboard/roles`, so both
 * entry points drive one editor rather than two divergent ones.
 */
export default function UserPermissionsDrawer({ userId, onClose }) {
  const { toast, success, error, hideToast } = useToast();
  const onFeedback = (type, message) => (type === "success" ? success(message) : error(message));

  const manager = useRolesManager({ onFeedback });

  // Load the target user whenever the deep-link id changes.
  useEffect(() => {
    if (userId) manager.openUserById(userId);
    else manager.closeDrawer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!userId) return null;

  return (
    <>
      <Drawer
        open={manager.drawerMode !== null}
        onClose={manager.closeDrawer}
        width={520}
        label="User Permissions"
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
    </>
  );
}
