import { Search, X } from "lucide-react";
import { ROLE_LABELS } from "../../../constants/roles";

/**
 * Search + role filter toolbar for the users list.
 *
 * Mirrors the RolesTable toolbar: icon-led search with a clear button, a
 * filter select, and a live result count. Search and filter are lifted to
 * UsersPage because they drive the server query — this component only
 * renders their current value.
 */
export default function UsersToolbar({
  search,
  onSearch,
  roleFilter,
  onRoleFilter,
  roleOptions = [],
  total = 0,
}) {
  const isSearching = Boolean(search && search.trim());

  return (
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
          placeholder="Search by username, name, or email…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search users"
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
        <span className="sr-only">Filter users by role</span>
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilter(e.target.value)}
          className="rp-filter-select"
        >
          <option value="">All roles</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
          ))}
        </select>
      </label>

      <span className="ml-auto text-[12px]" style={{ color: "var(--text-muted)" }} aria-live="polite">
        {total} user{total !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
