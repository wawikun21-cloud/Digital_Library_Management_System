/**
 * features/faculty/components/FacultySearchBar.jsx
 *
 * Search input with AJAX spinner, active-filter chips and results count.
 * Extracted from the former pages/Faculty.jsx.
 */

import { Search, X } from "lucide-react";

export default function FacultySearchBar({
  searchTerm, onSearchChange, debouncedSearch, isSearching,
  activeDept, onClearDept, paginatedCount, filteredCount, isLoading,
}) {
  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search input with AJAX indicator */}
        <div className="relative" style={{ minWidth: "260px" }}>
          {isSearching ? (
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-b-transparent animate-spin"
              style={{ borderColor: "#2d4fa3", borderBottomColor: "transparent" }}
            />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          )}
          <input
            type="text"
            placeholder="Search by name or department…"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 transition-colors"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-muted)" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Active filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeDept !== "All" && (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: "rgba(30,58,123,0.1)", color: "#2d4fa3", border: "1px solid rgba(30,58,123,0.2)" }}
            >
              {activeDept}
              <button onClick={onClearDept}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {debouncedSearch && (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: "rgba(238,162,58,0.1)", color: "#b87a1a", border: "1px solid rgba(238,162,58,0.25)" }}
            >
              "{debouncedSearch}"
              <button onClick={() => onSearchChange("")}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm font-medium ml-auto whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
            Showing{" "}
            <span style={{ color: "var(--text-primary)" }}>{paginatedCount}</span>
            {" "}of{" "}
            <span style={{ color: "var(--text-primary)" }}>{filteredCount}</span>
            {" "}faculty
          </p>
        )}
      </div>
    </div>
  );
}
