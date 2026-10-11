import UserRoleBadge from "../components/UserRoleBadge";
import { ROLE_LABELS } from "../../../constants/roles";

export default function UserRoleModal({ open, user, currentUserRole, availableRoles, error, onClose, onSubmit }) {
  if (!open || !user) return null;

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    const newRole = e.target.elements.role.value;
    if (!newRole) return;
    // The page owns the result: on a refused change (the server answers
    // 403 with the missing permission named) it keeps the modal open and
    // passes the message back through `error`. Closing unconditionally is
    // what made a failed role change look like it had succeeded.
    const result = await onSubmit(user.id, newRole, `Role changed from ${user.role} to ${newRole}`);
    if (result?.success) onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(2px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-101">
                Change Role: {user.full_name || user.username}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRoleSubmit} className="space-y-4">
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                >
                  {error}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Role
                </label>
                <div className="mb-2">
                  <UserRoleBadge role={user.role} />
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
                    <option key={r} value={r} disabled={r === user.role}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
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
    </>
  );
}
