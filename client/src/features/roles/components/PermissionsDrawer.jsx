import { Loader2, ChevronLeft } from "lucide-react";
import PermissionGrid from "./PermissionGrid";
import ResourceRestrictionPanel from "./ResourceRestrictionPanel";
import { getInitials, getAvatarColor } from "../utils/roleUtils";

const linkClass = "text-xs font-medium transition-colors";

function headerTitle(drawerMode, editRole, editUser) {
  if (drawerMode === "editRole") return `Edit: ${editRole?.display_name || editRole?.name || ""}`;
  if (drawerMode === "editUser") return `Edit User: ${editUser?.full_name || editUser?.email || ""}`;
  if (drawerMode === "accessRestrictions") return `Access Restrictions for ${editUser?.full_name || editUser?.email || ""}`;
  return "";
}

/**
 * The three-mode permission editor (LMS-SOP parity).
 *
 *  editRole            → action grid + the users holding this role
 *  editUser            → role picker, Grant all / Reset to role defaults,
 *                        action grid, and a link into Access Restrictions
 *  accessRestrictions  → per-entity-type scope control
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
  const links = [{ label: "Manage Access Restrictions →", onClick: onManageAccessRestrictions }];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="flex shrink-0 items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {drawerMode === "accessRestrictions" && (
            <button
              onClick={onBackToEditUser}
              aria-label="Back to user permissions"
              className="shrink-0 rounded-lg p-1"
              style={{ color: "var(--text-secondary)" }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <h3 className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {headerTitle(drawerMode, editRole, editUser)}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-xs">
          {drawerMode === "accessRestrictions" ? (
            <button onClick={onBackToEditUser} className={linkClass} style={{ color: "var(--text-secondary)" }}>
              Done
            </button>
          ) : (
            <>
              <button onClick={onCancel} className={linkClass} style={{ color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="rounded-lg px-3 py-1.5 font-semibold text-white transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: "#EEA23A" }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────── */}
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {drawerLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-secondary)" }} />
          </div>
        ) : (
          <>
            {/* ── Role editor ────────────────────────────────── */}
            {drawerMode === "editRole" && (
              <div className="space-y-4">
                <PermissionGrid
                  permStates={rolePermStates}
                  onToggleAction={onRoleActionToggle}
                  links={[
                    { label: "Reset to role defaults →", onClick: onResetDefaults },
                  ]}
                />

                <div className="pt-4" style={{ borderTop: "1px solid var(--border-light)" }}>
                  <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Users with this Role ({editRoleUsers.length})
                  </h4>

                  {editRoleUsers.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      No users assigned to this role
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {editRoleUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => onOpenUserEditor(u)}
                          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors"
                          style={{ color: "var(--text-primary)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{ background: getAvatarColor(u.full_name || u.email) }}
                          >
                            {getInitials(u.full_name || u.email)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{u.full_name || "—"}</span>
                            <span className="block truncate text-[11px]" style={{ color: "var(--text-secondary)" }}>
                              {u.email || "—"}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── User editor ────────────────────────────────── */}
            {drawerMode === "editUser" && (
              <div className="space-y-4">
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
                    className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {(roles || []).filter((r) => r.is_active !== false).map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.display_name || r.name}
                      </option>
                    ))}
                  </select>
                  {editUserNewRoleName !== editUserOriginalRole && (
                    <p className="mt-1 text-[11px]" style={{ color: "#b87a1a" }}>
                      Role will change on save. Existing overrides are kept only where the new role grants them.
                    </p>
                  )}
                </div>

                <div className="flex gap-4 text-xs">
                  <button onClick={onGrantAll} className={linkClass} style={{ color: "var(--text-secondary)" }}>
                    Grant all
                  </button>
                  <button onClick={onResetDefaults} className={linkClass} style={{ color: "var(--text-secondary)" }}>
                    Reset to role defaults
                  </button>
                </div>

                <PermissionGrid permStates={userPermStates} onToggleAction={onUserActionToggle} />

                <button
                  onClick={onManageAccessRestrictions}
                  className="pt-2 text-xs font-medium"
                  style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border-light)", width: "100%", textAlign: "left" }}
                >
                  Manage Access Restrictions →
                </button>
              </div>
            )}

            {/* ── Access restrictions ─────────────────────────── */}
            {drawerMode === "accessRestrictions" && (
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
    </div>
  );
}
