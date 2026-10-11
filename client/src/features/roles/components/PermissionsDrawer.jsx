import { Loader2, ChevronLeft, ChevronRight, X, CheckCheck, RotateCcw, ShieldCheck, Info } from "lucide-react";
import PermissionGrid from "./PermissionGrid";
import ResourceRestrictionPanel from "./ResourceRestrictionPanel";
import { getInitials, getAvatarColor } from "../utils/roleUtils";
import "./rolesUi.css";

function headerTitle(drawerMode, editRole, editUser) {
  if (drawerMode === "editRole") return `Edit: ${editRole?.display_name || editRole?.name || ""}`;
  if (drawerMode === "editUser") return `Edit User: ${editUser?.full_name || editUser?.email || ""}`;
  if (drawerMode === "accessRestrictions") return `Access Restrictions for ${editUser?.full_name || editUser?.email || ""}`;
  return "";
}

function headerSubtitle(drawerMode, editRole, editUser) {
  if (drawerMode === "editRole") return editRole?.name ? `Role · ${editRole.name}` : "Role permissions";
  if (drawerMode === "editUser") return editUser?.email || "User permissions";
  if (drawerMode === "accessRestrictions") return "Limit which records this user can reach";
  return "";
}

/**
 * The three-mode permission editor (LMS-SOP parity).
 *
 *  editRole            → action grid + the users holding this role
 *  editUser            → role picker, Grant all / Reset to role defaults,
 *                        action grid, and a link into Access Restrictions
 *  accessRestrictions  → per-entity-type scope control
 *
 * Layout: fixed header, one scrolling body, fixed footer with the actions,
 * so Save is always in reach however long the permission list gets.
 */
export default function PermissionsDrawer({
  drawerMode,
  drawerLoading,
  saving,
  editRole,
  editRoleUsers,
  rolePermStates,
  editUser,
  editUserNewRoleName,
  editUserOriginalRole,
  editUserRolePerms,
  userPermStates,
  entityStates,
  visibleEntityTypes,
  roles,
  onCancel,
  onSave,
  onRoleChange,
  onRoleActionToggle,
  onUserActionToggle,
  onGrantAll,
  onResetDefaults,
  onManageAccessRestrictions,
  onScopeToggle,
  onRecordToggle,
  onEntitySearch,
  onOpenUserEditor,
  onBackToEditUser,
}) {
  const isRestrictions = drawerMode === "accessRestrictions";
  const subtitle = headerSubtitle(drawerMode, editRole, editUser);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="flex shrink-0 items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {isRestrictions && (
            <button
              type="button"
              onClick={onBackToEditUser}
              aria-label="Back to user permissions"
              className="rp-icon-btn shrink-0"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {headerTitle(drawerMode, editRole, editUser)}
            </h3>
            {subtitle && (
              <p className="truncate text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {!isRestrictions && (
          <button type="button" onClick={onCancel} aria-label="Close without saving" className="rp-icon-btn shrink-0">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </header>

      {/* ── Body ───────────────────────────────────────────── */}
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {drawerLoading ? (
          <div
            className="flex flex-col items-center justify-center gap-2 py-16"
            role="status"
            style={{ color: "var(--text-secondary)" }}
          >
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            <span className="text-xs">Loading permissions…</span>
          </div>
        ) : (
          <>
            {/* ── Role editor ────────────────────────────────── */}
            {drawerMode === "editRole" && (
              <div className="space-y-6">
                <PermissionGrid
                  permStates={rolePermStates}
                  onToggleAction={onRoleActionToggle}
                  links={[
                    { label: "Reset to role defaults →", onClick: onResetDefaults },
                  ]}
                />

                <section aria-labelledby="role-users-heading">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 id="role-users-heading" className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      Users with this role
                    </h4>
                    <span className="rp-badge rp-badge--plain rp-badge--muted tabular-nums">{editRoleUsers.length}</span>
                  </div>

                  {editRoleUsers.length === 0 ? (
                    <div className="rp-card px-4 py-6 text-center">
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        No users assigned to this role
                      </p>
                    </div>
                  ) : (
                    <div className="rp-card space-y-0.5 p-1">
                      {editRoleUsers.map((u) => (
                        <button key={u.id} type="button" onClick={() => onOpenUserEditor(u)} className="rp-nav-row">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                            style={{ background: getAvatarColor(u.full_name || u.email) }}
                            aria-hidden="true"
                          >
                            {getInitials(u.full_name || u.email)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{u.full_name || "—"}</span>
                            <span className="block truncate text-[11px]" style={{ color: "var(--text-secondary)" }}>
                              {u.email || "—"}
                            </span>
                          </span>
                          <ChevronRight
                            size={15}
                            className="rp-chev shrink-0"
                            aria-hidden="true"
                            style={{ color: "var(--text-secondary)" }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ── User editor ────────────────────────────────── */}
            {drawerMode === "editUser" && (
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="drawer-role-select"
                    className="mb-1.5 block text-xs font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Role
                  </label>
                  <select
                    id="drawer-role-select"
                    value={editUserNewRoleName || ""}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="rp-field px-3 py-2.5 text-sm"
                  >
                    {(roles || []).filter((r) => r.is_active !== false).map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.display_name || r.name}
                      </option>
                    ))}
                  </select>
                  {editUserNewRoleName !== editUserOriginalRole && (
                    <div className="rp-callout rp-callout--warn mt-2" role="status">
                      <Info size={14} aria-hidden="true" />
                      <span>Role will change on save. Existing overrides are kept only where the new role grants them.</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={onGrantAll} className="rp-btn rp-btn--secondary rp-btn--sm">
                    <CheckCheck size={14} aria-hidden="true" /> Grant all
                  </button>
                  <button type="button" onClick={onResetDefaults} className="rp-btn rp-btn--secondary rp-btn--sm">
                    <RotateCcw size={13} aria-hidden="true" /> Reset to role defaults
                  </button>
                </div>

                <PermissionGrid permStates={userPermStates} onToggleAction={onUserActionToggle} />

                <button type="button" onClick={onManageAccessRestrictions} className="rp-card rp-nav-row" style={{ padding: 12 }}>
                  <span className="rp-role-tile" aria-hidden="true">
                    <ShieldCheck size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Manage Access Restrictions</span>
                    <span className="block text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      Limit this user to specific records
                    </span>
                  </span>
                  <ChevronRight size={16} className="rp-chev shrink-0" aria-hidden="true" style={{ color: "var(--text-secondary)" }} />
                </button>
              </div>
            )}

            {/* ── Access restrictions ─────────────────────────── */}
            {isRestrictions && (
              <ResourceRestrictionPanel
                entityStates={entityStates}
                visibleTypes={visibleEntityTypes}
                onScopeToggle={onScopeToggle}
                onRecordToggle={onRecordToggle}
                onSearch={onEntitySearch}
              />
            )}
          </>
        )}
      </main>

      {/* ── Footer actions ─────────────────────────────────── */}
      <footer
        className="flex shrink-0 items-center justify-end gap-2 px-4 py-3"
        style={{ borderTop: "1px solid var(--border-light)", background: "var(--bg-surface)" }}
      >
        {isRestrictions ? (
          <button type="button" onClick={onBackToEditUser} className="rp-btn rp-btn--primary" style={{ minWidth: 88 }}>
            Done
          </button>
        ) : (
          <>
            <button type="button" onClick={onCancel} className="rp-btn rp-btn--ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rp-btn rp-btn--primary"
              style={{ minWidth: 88 }}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Saving…
                </>
              ) : (
                "Save"
              )}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
