/**
 * features/faculty/components/FacultyTable.jsx
 *
 * Faculty table with loading, empty and pagination states. Extracted from
 * the former pages/Faculty.jsx.
 */

import { AlertCircle, Edit, Trash2 } from "lucide-react";
import Pagination from "../../../components/books/Pagination";
import { DEPT_COLORS, DEFAULT_COLOR, FACULTY_PER_PAGE } from "../constants/facultyUi";

export default function FacultyTable({
  paginated, filteredCount, isLoading, currentPage, totalPages,
  onPageChange, onEdit, onDelete, canEdit, canDelete, debouncedSearch, activeDept,
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
    >
      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-800" />
          <span className="ml-3 text-sm" style={{ color: "var(--text-muted)" }}>Loading faculty…</span>
        </div>
      ) : filteredCount > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                  {["#", "Faculty Member", "Department", "Actions"].map(h => (
                    <th
                      key={h}
                      className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((member, idx) => {
                  const c = DEPT_COLORS[member.department] || DEFAULT_COLOR;
                  return (
                    <tr
                      key={member.id}
                      style={{ borderBottom: "1px solid var(--border-light)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Row number */}
                      <td className="py-3.5 px-4 text-sm font-mono" style={{ color: "var(--text-muted)", width: "56px" }}>
                        {(currentPage - 1) * FACULTY_PER_PAGE + idx + 1}
                      </td>

                      {/* Faculty name with avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              background: "linear-gradient(135deg, rgba(30,58,123,0.12) 0%, rgba(45,79,163,0.15) 100%)",
                              color: "#2d4fa3",
                              border: "1px solid rgba(30,58,123,0.2)",
                            }}
                          >
                            {member.faculty_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {member.faculty_name}
                          </span>
                        </div>
                      </td>

                      {/* Department badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold"
                          style={{ background: c.bg, color: c.text, border: `1px solid ${c.badge}` }}
                        >
                          {member.department}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button
                              onClick={() => onEdit(member)}
                              className="p-1.5 rounded-lg transition-colors duration-150"
                              style={{ color: "#2d4fa3" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(30,58,123,0.1)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => onDelete(member.id)}
                              className="p-1.5 rounded-lg transition-colors duration-150"
                              style={{ color: "#dc2626" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,0.08)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
            <Pagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={onPageChange} />
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--bg-subtle)" }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {debouncedSearch || activeDept !== "All" ? "No matching faculty found" : "No faculty members yet"}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {debouncedSearch || activeDept !== "All"
              ? "Try adjusting your search or department filter"
              : "Add faculty manually or use bulk import"}
          </p>
        </div>
      )}
    </div>
  );
}
