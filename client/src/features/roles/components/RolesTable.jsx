import { Search } from "lucide-react";

/**
 * Roles list with an inline search and per-row Edit / Delete actions.
 * Clicking a row opens the role permission editor.
 */
export default function RolesTable({ roles, search, onSearch, onRoleClick, onEditClick, onDeleteClick }) {
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
          className="w-full rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:ring-1"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      <div
        className="overflow-hidden rounded-lg"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--border)" }}>
              {["Role", "Users", "Permissions", "Status", "Actions"].map((heading, i) => (
                <th
                  key={heading}
                  className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider ${
                    i === 4 ? "text-right" : "text-left"
                  }`}
                  style={{ color: "var(--text-secondary)" }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    No roles match your search.
                  </p>
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr
                  key={role.name}
                  onClick={() => onRoleClick(role)}
                  className="cursor-pointer transition-colors"
                  style={{ borderTop: "1px solid var(--border-light)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td className="px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {role.display_name || "—"}
                      </p>
                      <p className="truncate text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        {role.name || "—"}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-sm" style={{ color: "var(--text-primary)" }}>
                    {role.user_count || 0}
                  </td>
                  <td className="px-3 py-2.5 text-sm" style={{ color: "var(--text-primary)" }}>
                    {role.permission_count || 0}
                  </td>
                  <td className="px-3 py-2.5 text-sm">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: role.is_active === false ? "rgba(220,38,38,0.12)" : "rgba(34,197,94,0.14)",
                        color: role.is_active === false ? "#dc2626" : "#16a34a",
                      }}
                    >
                      {role.is_active === false ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3 text-xs whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditClick(role); }}
                        className="font-medium transition-colors"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteClick(role); }}
                        className="font-medium transition-colors"
                        style={{ color: "#dc2626" }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="px-1 text-xs" style={{ color: "var(--text-secondary)" }}>
        Showing {roles.length} role{roles.length !== 1 ? "s" : ""}
      </p>
    </>
  );
}
