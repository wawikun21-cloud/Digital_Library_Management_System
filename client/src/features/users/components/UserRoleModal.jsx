import { AlertTriangle } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import UserRoleBadge from "./UserRoleBadge";
import { ROLE_LABELS } from "../../../constants/roles";

/**
 * Role-change modal.
 *
 * The page owns the result: on a refused change (the server answers 403
 * with the missing permission named) the modal stays open and shows the
 * message passed back through `error`. Closing unconditionally is what
 * made a failed role change look like it had succeeded.
 */
export default function UserRoleModal({ open, user, currentUserRole, availableRoles, error, onClose, onSubmit }) {
  if (!open || !user) return null;

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    const newRole = e.target.elements.role.value;
    if (!newRole) return;
    const result = await onSubmit(user.id, newRole, `Role changed from ${user.role} to ${newRole}`);
    if (result?.success) onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Change Role"
      subtitle={`${user.full_name || user.username} · @${user.username}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleRoleSubmit} className="space-y-4">
        {error && (
          <div className="rp-callout rp-callout--danger" role="alert">
            <AlertTriangle size={14} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Current Role
          </span>
          <div className="mb-4">
            <UserRoleBadge role={user.role} />
          </div>

          <label htmlFor="user-new-role" className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            New Role
          </label>
          <select
            id="user-new-role"
            name="role"
            defaultValue=""
            required
            className="rp-field px-3 py-2.5 text-sm"
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

        <div
          className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end"
          style={{ borderTop: "1px solid var(--border-light)" }}
        >
          <button type="button" onClick={onClose} className="rp-btn rp-btn--ghost">
            Cancel
          </button>
          <button type="submit" className="rp-btn rp-btn--primary" style={{ minWidth: 112 }}>
            Change Role
          </button>
        </div>
      </form>
    </Modal>
  );
}
