import { Search, X, Pencil, Trash2, Users, KeyRound, ChevronRight, ShieldCheck, SearchX } from "lucide-react";
import "./rolesUi.css";

/**
 * Roles list with an inline search and per-row Edit / Delete actions.
 * Clicking a row (or pressing Enter on it) opens the role permission editor.
 */
export default function RolesTable({ roles, search, onSearch, onRoleClick, onEditClick, onDeleteClick }) {
  const isSearching = Boolean(search && search.trim());

  return (
    <>
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-secondary)" }}
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Search roles by name or display name…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search roles"
          className="rp-field py-2.5 pl-9 pr-9 text-sm"
        />
        {isSearching && (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label="Clear search"
            className="rp-icon-btn absolute right-1 top-1/2 -translate-y-1/2"
            style={{ height: 26, width: 26 }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="rp-card overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--border)" }}>
                {["Role", "Users", "Permissions", "Status", "Actions"].map((heading, i) => (
                  <th
                    key={heading}
                    scope="col"
                    className={`px-4 py-2.5 text-xs font-semibold ${i === 4 ? "text-right" : "text-left"}`}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {i === 4 ? <span className="sr-only">{heading}</span> : heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center">
                    <div
                      className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                    >
                      {isSearching ? <SearchX size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
                    </div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {isSearching ? `No roles match “${search.trim()}”` : "No roles yet"}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {isSearching ? "Check the spelling or try a shorter search." : "Add a role to start assigning permissions."}
                    </p>
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr
                    key={role.name}
                    onClick={() => onRoleClick(role)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRoleClick(role);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Edit permissions for ${role.display_name || role.name}`}
                    className="rp-tr"
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="rp-role-tile" aria-hidden="true">
                          <ShieldCheck size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {role.display_name || "—"}
                          </p>
                          <p className="truncate font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
                            {role.name || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={13} aria-hidden="true" style={{ color: "var(--text-secondary)" }} />
                        {role.user_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                      <span className="inline-flex items-center gap-1.5">
                        <KeyRound size={13} aria-hidden="true" style={{ color: "var(--text-secondary)" }} />
                        {role.permission_count || 0}
                        <ChevronRight size={13} className="rp-chev" aria-hidden="true" style={{ color: "var(--text-secondary)" }} />
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rp-badge ${role.is_active === false ? "rp-badge--off" : "rp-badge--ok"}`}>
                        {role.is_active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEditClick(role); }}
                          className="rp-icon-btn"
                          aria-label={`Edit ${role.display_name || role.name}`}
                          title="Edit details"
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDeleteClick(role); }}
                          className="rp-icon-btn rp-icon-btn--danger"
                          aria-label={`Delete ${role.display_name || role.name}`}
                          title="Delete role"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="px-1 text-xs" style={{ color: "var(--text-secondary)" }} aria-live="polite">
        Showing {roles.length} role{roles.length !== 1 ? "s" : ""}
      </p>
    </>
  );
}
