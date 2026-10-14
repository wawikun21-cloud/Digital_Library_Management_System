/**
 * features/students/components/StudentsTable.jsx
 *
 * Students table with loading, empty and pagination states. Extracted from
 * the former pages/Students.jsx.
 */

import { AlertCircle, User, Edit, Trash2 } from "lucide-react";
import Pagination from "../../../components/books/Pagination";

export default function StudentsTable({
  paginatedStudents, filteredCount, isLoading,
  currentPage, totalPages, onPageChange,
  onEdit, onDelete, canEdit, canDelete, searchTerm,
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <svg className="animate-spin" style={{ width: 18, height: 18, color: "var(--accent-amber)" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="ml-3 text-[13px]" style={{ color: "var(--text-muted)" }}>Loading students...</span>
        </div>
      ) : filteredCount > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-light)" }}>
                  {["Student", "School", "Status", "ID Number", "Course", "Year Level", "Email", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.map((student) => (
                  <tr
                    key={student.id}
                    style={{ borderBottom: "1px solid var(--border-light)" }}
                    className="hover:bg-amber-50/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-[13px]">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                          style={{ background: "rgba(30,58,123,0.12)", color: "#2d4fa3", border: "1px solid rgba(30,58,123,0.2)" }}
                        >
                          {student.student_name?.charAt(0)?.toUpperCase() || <User size={13} />}
                        </div>
                        <span className="font-semibold text-slate-900" style={{ color: "var(--text-primary)" }}>
                          {student.student_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[13px]">
                      {student.school_name ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(30,58,123,.1)", color: "#2d4fa3" }}>
                          {student.school_name}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[13px]">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${student.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {student.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[13px] font-mono" style={{ color: "var(--text-secondary)" }}>
                      {student.student_id_number}
                    </td>
                    <td className="py-3 px-4 text-[13px]">
                      {student.student_course ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(50,102,127,.12)", color: "#32667F" }}>
                          {student.student_course}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                      {student.student_yr_level ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(124,58,237,.1)", color: "#7c3aed" }}>
                          {student.student_yr_level}
                        </span>
                      ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td className="py-3 px-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                      {student.student_email || <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button
                            onClick={() => onEdit(student)}
                            className="p-1.5 rounded-lg transition-colors duration-150"
                            style={{ color: "#2d4fa3" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(30,58,123,0.1)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => onDelete(student.id)}
                            className="p-1.5 rounded-lg transition-colors duration-150"
                            style={{ color: "#dc2626" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,0.08)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ─────────────────────────────── */}
          <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={onPageChange}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <AlertCircle size={28} style={{ color: "var(--text-muted)" }} />
          <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
            {searchTerm ? "No matching students found" : "No students available"}
          </p>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {searchTerm ? "Try adjusting your search or filters" : "Add students manually or use bulk import"}
          </p>
        </div>
      )}
    </div>
  );
}
