/**
 * features/students/components/StudentsFilterBar.jsx
 *
 * Search + course + year-level filters and the results count. Extracted
 * from the former pages/Students.jsx.
 */

import { Search, Building2, GraduationCap, ChevronDown } from "lucide-react";

export default function StudentsFilterBar({
  searchTerm, onSearchChange,
  filters, onFiltersChange,
  courses, yearLevels,
  paginatedCount, filteredCount, isLoading,
}) {
  const selectStyle = {
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
  };

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 transition-colors"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                minWidth: "220px",
              }}
            />
          </div>

          {/* Course Filter */}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <select
              value={filters.course}
              onChange={(e) => onFiltersChange({ ...filters, course: e.target.value })}
              className="pl-10 pr-10 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 appearance-none transition-colors"
              style={selectStyle}
            >
              <option value="All">All Courses</option>
              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
          </div>

          {/* Year Level Filter */}
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <select
              value={filters.yearLevel}
              onChange={(e) => onFiltersChange({ ...filters, yearLevel: e.target.value })}
              className="pl-10 pr-10 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 appearance-none transition-colors"
              style={selectStyle}
            >
              <option value="All">All Year Levels</option>
              {yearLevels.map((yearLevel) => (
                <option key={yearLevel} value={yearLevel}>
                  {yearLevel}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
          </div>
        </div>

        {/* ── Results count ─────────────────────────── */}
        {!isLoading && (
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Showing <span style={{ color: "var(--text-primary)" }}>{paginatedCount}</span> of <span style={{ color: "var(--text-primary)" }}>{filteredCount}</span> student{filteredCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
