import Modal from "../../../components/ui/Modal";
import UserForm from "./UserForm";

/**
 * Add / Edit user modal — the shared Modal shell (same as RolesPage) with
 * the wide layout the multi-section user form needs.
 */
export default function UserFormModal({ open, mode, user, currentUserRole, onClose, onSubmit }) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={mode === "create" ? "Create New User" : "Edit User"}
      subtitle={
        mode === "create"
          ? "Add an account and assign a role"
          : `Update details for ${user?.full_name || user?.username || "this user"}`
      }
      maxWidth="max-w-4xl"
    >
      <UserForm
        initialData={mode === "edit" ? user : null}
        currentUserRole={currentUserRole}
        onSubmit={onSubmit}
        onCancel={onClose}
        submitLabel={mode === "create" ? "Create User" : "Save Changes"}
      />
    </Modal>
  );
}
