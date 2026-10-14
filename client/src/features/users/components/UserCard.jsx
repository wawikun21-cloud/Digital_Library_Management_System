import { Pencil, KeyRound, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import UserRoleBadge from "./UserRoleBadge";
import { formatUserForDisplay } from "../validation/userValidation";

/**
 * Mobile user card (shown below lg — UserTable covers larger screens).
 *
 * Same permission-gating contract as UserTable: an action handler that
 * arrives `undefined` renders no button, so a restricted admin never sees
 * a control that would throw on click.
 */
export default function UserCard({ user, onEdit, onDeactivate, onReactivate, onRoleChange, onPermissions, currentUserId }) {
  const display = formatUserForDisplay(user);
  const isSelf = user.id === currentUserId;
  const isActive = Boolean(user.is_active);

  return (
    <div className="rp-card mb-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-semibold" aria-hidden="true">
                {display.fullName?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium" style={{ color: "var(--text-primary)" }}>{display.fullName}</p>
            <p className="truncate text-[13px]" style={{ color: "var(--text-secondary)" }}>
              @{user.username}
              {isSelf && <span style={{ color: "var(--color-primary)" }}> (you)</span>}
            </p>
          </div>
        </div>
        <UserRoleBadge role={user.role} />
      </div>

      {user.email && (
        <p className="mt-2 break-all text-[13px]" style={{ color: "var(--text-secondary)" }}>{user.email}</p>
      )}

      {/* School scope — mirrors UserTable's columns on small screens. */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]" style={{ color: "var(--text-muted)" }}>
        <span>{user.school_name || <span className="rp-badge rp-badge--muted">Unassigned school</span>}</span>
        {user.department_name && <span>· {user.department_name}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`rp-badge ${isActive ? "rp-badge--ok" : "rp-badge--off"}`}>
          {isActive ? "Active" : "Inactive"}
        </span>

        <div className="flex flex-wrap items-center justify-end gap-1">
          {onEdit && (
            <button type="button" onClick={() => onEdit(user)} className="rp-btn rp-btn--ghost rp-btn--sm">
              <Pencil size={13} aria-hidden="true" />Edit
            </button>
          )}
          {!isSelf && (
            <>
              {onPermissions && (
                <button type="button" onClick={() => onPermissions(user)} className="rp-btn rp-btn--ghost rp-btn--sm">
                  <KeyRound size={13} aria-hidden="true" />Permissions
                </button>
              )}
              {onRoleChange && (
                <button type="button" onClick={() => onRoleChange(user)} className="rp-btn rp-btn--ghost rp-btn--sm">
                  <ShieldCheck size={13} aria-hidden="true" />Role
                </button>
              )}
              {isActive ? (
                onDeactivate && (
                  <button
                    type="button"
                    onClick={() => onDeactivate(user)}
                    className="rp-btn rp-btn--ghost rp-btn--sm"
                    style={{ color: "var(--accent-danger)" }}
                  >
                    <Trash2 size={13} aria-hidden="true" />Deactivate
                  </button>
                )
              ) : (
                onReactivate && (
                  <button type="button" onClick={() => onReactivate(user)} className="rp-btn rp-btn--ghost rp-btn--sm">
                    <UserCheck size={13} aria-hidden="true" />Reactivate
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
