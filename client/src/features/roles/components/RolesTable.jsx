import { Search, X, Pencil, Trash2, Users, KeyRound, ChevronRight, ShieldCheck, SearchX } from "lucide-react";
import "./rolesUi.css";

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

/**
 * Roles list with an inline search and status filter, plus per-row Edit /
 * Delete actions. Clicking a row (or pressing Enter on it) opens the role
 * permission editor.
 *
 * `roles` arrives already narrowed by `useRolesManager`; the status filter only
 * drives the select's value and the empty-state wording, so the filter logic
 * has one implementation.
 *
 * Actions are passed as `undefined` rather than hidden when the caller has no
 * permission, matching how UsersTable and LexoraBookAdminTable gate theirs.
 */
export default function RolesTable({
  roles,
  search,
  onSearch,
  statusFilter = "",
  onStatusFilter,
  onRoleClick,
  onEditClick,
  onDeleteClick,
}) {
  const isSearching = Boolean(search && search.trim());
  const isFiltered = isSearching || Boolean(statusFilter);

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search roles by name or display name…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            aria-label="Search roles"
            className="rp-field py-2 pl-9 pr-9 text-sm"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Clear search"
              className="rp-icon-btn absolute right-1 top-1/2 -translate-y-1/2"
              style={{ height: 28, width: 28 }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <label>
          <span className="sr-only">Filter roles by status</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilter?.(e.target.value)}
            className="rp-filter-select"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <span className="ml-auto text-[12px]" style={{ color: "var(--text-muted)" }} aria-live="polite">
          {roles.length} role{roles.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── List ────────────────────────────────────────── */}
      {roles.length === 0 ? (
        <div className="rp-empty">
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
          >
            {isFiltered ? <SearchX size={24} aria-hidden="true" /> : <ShieldCheck size={24} aria-hidden="true" />}
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {isSearching ? `No roles match “${search.trim()}”` : isFiltered ? "No roles with that status" : "No roles yet"}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            {isSearching
              ? "Check the spelling or try a shorter search."
              : isFiltered
                ? "Switch the status filter to see the rest."
                : "Add a role to start assigning permissions."}
          </p>
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-xl border shadow-sm"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
        >
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-subtle, var(--bg-hover))", borderBottom: "1px solid var(--border)" }}>
                {["Role", "Users", "Permissions", "Status", "Actions"].map((heading, i) => (
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
              {roles.map((role) => (
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
                        <p className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
                          {role.display_name || "—"}
                        </p>
                        <p className="truncate font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
                          {role.name || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "var(--text-primary)" }}>
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={13} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
                      {role.user_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: "var(--text-primary)" }}>
                    <span className="inline-flex items-center gap-1.5">
                      <KeyRound size={13} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
                      {role.permission_count || 0}
                      <ChevronRight size={13} className="rp-chev" aria-hidden="true" style={{ color: "var(--text-muted)" }} />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rp-badge ${role.is_active === false ? "rp-badge--off" : "rp-badge--ok"}`}>
                      {role.is_active === false ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {onEditClick && (
                        <button
                          type="button"
                          onClick={() => onEditClick(role)}
                          className="rp-icon-btn"
                          aria-label={`Edit ${role.display_name || role.name}`}
                          title="Edit details"
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                      )}
                      {onDeleteClick && (
                        <button
                          type="button"
                          onClick={() => onDeleteClick(role)}
                          className="rp-icon-btn rp-icon-btn--danger"
                          aria-label={`Delete ${role.display_name || role.name}`}
                          title="Delete role"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
