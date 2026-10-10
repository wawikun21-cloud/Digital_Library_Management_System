import UserForm from "./UserForm";

export default function UserFormModal({ open, mode, user, currentUserRole, onClose, onSubmit }) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(2px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-101">
                {mode === "create" ? "Create New User" : "Edit User"}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <UserForm
              initialData={mode === "edit" ? user : null}
              currentUserRole={currentUserRole}
              onSubmit={onSubmit}
              onCancel={onClose}
              submitLabel={mode === "create" ? "Create User" : "Save Changes"}
            />
          </div>
        </div>
      </div>
    </>
  );
}
