import { Pencil, KeyRound, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import UserRoleBadge from "./UserRoleBadge";
import UsersEmptyState from "./UsersEmptyState";
import { formatUserForDisplay } from "../validation/userValidation";
import { formatDate } from "../../../utils/helpers";
import "./usersUi.css";

function StatusBadge({ isActive }) {
  return (
    <span className={`rp-badge ${isActive ? "rp-badge--ok" : "rp-badge--off"}`}>
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

/**
 * Desktop user list (hidden below lg — UserCard covers small screens).
 *
 * Follows the RolesTable / LexoraBookAdminTable pattern: token-driven
 * surfaces from src/styles/ui.css, right-aligned icon actions, and a
 * skeleton while loading. Each row action arrives as `undefined` when the
 * signed-in user lacks the matching manage_users permission — render
 * nothing rather than a button whose onClick throws.
 */
export default function UserTable({
  users,
  loading,
  onEdit,
  onRoleChange,
  onDeactivate,
  onReactivate,
  onPermissions,
  currentUserId,
  hasFilters = false,
}) {
  if (loading) {
    return (
      <div className="rp-card p-4" role="status" aria-busy="true">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="rp-skeleton h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="rp-skeleton h-3.5 w-1/3" />
                <div className="rp-skeleton h-3 w-1/4" />
              </div>
              <div className="rp-skeleton h-6 w-16 rounded-full" />
              <div className="rp-skeleton h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
        <span className="sr-only">Loading users…</span>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return <UsersEmptyState hasFilters={hasFilters} />;
  }

  return (
    <div
      className="overflow-x-auto rounded-xl border shadow-sm"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ background: "var(--bg-subtle, var(--bg-hover))", borderBottom: "1px solid var(--border)" }}>
            {["User", "Role", "Status", "Created", "Actions"].map((heading, i) => (
              <th
                key={heading}
                scope="col"
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${i === 4 ? "text-right" : "text-left"}`}
                style={{ color: "var(--text-muted)" }}
              >
                {i === 4 ? <span className="sr-only">{heading}</span> : heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const display = formatUserForDisplay(user);
            const isSelf = user.id === currentUserId;
            const isActive = Boolean(user.is_active);

            return (
              <tr key={user.id} className="us-tr">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div
                        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full"
                        style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                      >
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={display.fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold" aria-hidden="true">
                            {display.fullName?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      {isActive && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
                          style={{ background: "var(--rp-success)", borderColor: "var(--bg-surface)" }}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
                        {display.fullName}
                      </p>
                      <p className="truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>
                        @{user.username}
                        {isSelf && <span style={{ color: "var(--color-primary)" }}> (you)</span>}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <UserRoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge isActive={isActive} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  {formatDate(user.created_at) || "—"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Handlers arrive undefined when the user lacks the
                        matching manage_users action — render nothing rather
                        than a button whose onClick throws. Same pattern as
                        RolesTable. */}
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(user)}
                        title="Edit user"
                        aria-label={`Edit ${display.fullName}`}
                        className="rp-icon-btn"
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                    )}

                    {!isSelf && onPermissions && (
                      <button
                        type="button"
                        onClick={() => onPermissions(user)}
                        title="Manage permissions"
                        aria-label={`Manage permissions for ${display.fullName}`}
                        className="rp-icon-btn"
                      >
                        <KeyRound size={14} aria-hidden="true" />
                      </button>
                    )}

                    {!isSelf && onRoleChange && isActive && (
                      <button
                        type="button"
                        onClick={() => onRoleChange(user)}
                        title="Change role"
                        aria-label={`Change role for ${display.fullName}`}
                        className="rp-icon-btn"
                      >
                        <ShieldCheck size={14} aria-hidden="true" />
                      </button>
                    )}

                    {!isSelf && (
                      <>
                        {isActive && onDeactivate && (
                          <button
                            type="button"
                            onClick={() => onDeactivate(user)}
                            title="Deactivate user"
                            aria-label={`Deactivate ${display.fullName}`}
                            className="rp-icon-btn rp-icon-btn--danger"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        )}
                        {!isActive && onReactivate && (
                          <button
                            type="button"
                            onClick={() => onReactivate(user)}
                            title="Reactivate user"
                            aria-label={`Reactivate ${display.fullName}`}
                            className="rp-icon-btn"
                          >
                            <UserCheck size={14} aria-hidden="true" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
