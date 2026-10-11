/**
 * features/students/components/StudentImportModal.jsx
 *
 * Bulk import: progress bar, drop zone, course / school-year selection,
 * template download, preview and results. State lives in useStudentImport.
 * Extracted from the former pages/Students.jsx.
 */

import { useEffect } from "react";
import {
  Upload, XCircle, FileSpreadsheet, CheckCircle2,
  AlertCircle, ChevronDown, Download,
} from "lucide-react";
import ModalAnimations from "../../../components/ui/ModalAnimations";
import { useStudentImport } from "../hooks/useStudentImport";
import { COURSES } from "../constants/studentsUi";

export default function StudentImportModal({ onClose, showToast, onImported }) {
  const {
    importFile, parsedStudentsData, importResult,
    importCourse, setCourse, importSchoolYear, setSchoolYear,
    isImporting, importProgress, importErrors,
    schoolYearChoices,
    fileInputRef,
    handleFileChange, removeFile, handleBulkImport, downloadTemplate,
    openWithDefaults, reset,
  } = useStudentImport({ showToast, onImported });

  // Seed the default school year when the modal opens (June-based rule).
  useEffect(() => { openWithDefaults(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,34,0.65)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-2xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 24px 60px rgba(0,0,0,0.28)" }}>
        {/* ── Modal Header ───────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)" }}>
              <Upload size={16} className="text-white" />
            </div>
            <h2 className="text-[17px] font-bold" style={{ color: "var(--text-primary)" }}>
              Bulk Import Students
            </h2>
          </div>
          <button
            onClick={() => { if (!isImporting) { reset(); onClose(); } }}
            disabled={isImporting}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: "var(--text-muted)" }}
          >
            <XCircle size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* ── Import Progress Bar ─────────────────────── */}
          {isImporting && (
            <div className="p-4 rounded-xl"
              style={{ background: "rgba(238,162,58,0.08)", border: "1.5px solid rgba(238,162,58,0.35)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold flex items-center gap-2"
                  style={{ color: "var(--accent-amber)" }}>
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Importing students, please wait…
                </span>
                <span className="text-[13px] font-bold" style={{ color: "var(--accent-amber)" }}>
                  {Math.round(importProgress)}%
                </span>
              </div>
              <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "rgba(238,162,58,0.2)" }}>
                <div className="h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${importProgress}%`, background: "var(--accent-amber)" }} />
              </div>
              <p className="text-[11.5px] font-medium mt-2" style={{ color: "var(--text-muted)" }}>
                ⚠ Do not close this window while import is in progress.
              </p>
            </div>
          )}

          {/* ── File Upload ─────────────────────────────── */}
          <div>
            <label className="block text-[12.5px] font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
              Upload Excel File
            </label>
            <div
              className="rounded-xl p-8 text-center transition-colors"
              style={{ border: "2px dashed var(--border)", background: "var(--bg-subtle)" }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileChange({ target: { files: [file] } });
              }}
            >
              {importFile ? (
                <div className="flex flex-col items-center gap-1">
                  <FileSpreadsheet size={36} style={{ color: "#2d7a47" }} />
                  <p className="text-[13px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                    {importFile.name}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {(importFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={removeFile}
                    className="mt-1 text-[12px] font-semibold transition-opacity hover:opacity-70"
                    style={{ color: "#dc2626" }}
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload size={32} style={{ color: "var(--text-muted)" }} />
                  <p className="text-[13px] mt-1" style={{ color: "var(--text-secondary)" }}>
                    Drag & drop Excel file here or click to browse
                  </p>
                  <label className="cursor-pointer mt-2">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      className="hidden"
                      ref={fileInputRef}
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: "var(--accent-amber)" }}>
                      Choose File
                    </span>
                  </label>
                  <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                    Supports Excel files (.xlsx, .xls)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Course Selection ────────────────────────── */}
          <div>
            <label className="block text-[12.5px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
              Course <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div className="relative">
              <select
                required
                value={importCourse}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 appearance-none"
                style={{ background: "var(--bg-input)", border: `1.5px solid ${importErrors.importCourse ? "#dc2626" : "var(--border)"}`, color: "var(--text-primary)" }}
              >
                <option value="">Select a course</option>
                {COURSES.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-muted)" }} />
            </div>
            {importErrors.importCourse && (
              <p className="text-[11.5px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: "#dc2626" }}>
                <AlertCircle size={12} /> {importErrors.importCourse}
              </p>
            )}
          </div>

          {/* ── School Year Selection ───────────────────── */}
          <div>
            <label className="block text-[12.5px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
              School Year <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div className="relative">
              <select
                required
                value={importSchoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 appearance-none"
                style={{ background: "var(--bg-input)", border: `1.5px solid ${importErrors.importSchoolYear ? "#dc2626" : "var(--border)"}`, color: "var(--text-primary)" }}
              >
                <option value="">Select school year</option>
                {schoolYearChoices.map(sy => (
                  <option key={sy} value={sy}>{sy}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-muted)" }} />
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
              All students in this import batch will be tagged with this school year.
            </p>
            {importErrors.importSchoolYear && (
              <p className="text-[11.5px] font-semibold mt-1.5 flex items-center gap-1" style={{ color: "#dc2626" }}>
                <AlertCircle size={12} /> {importErrors.importSchoolYear}
              </p>
            )}
          </div>

          {/* ── Download Template ───────────────────────── */}
          <div className="flex items-center justify-center">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2d4fa3"; e.currentTarget.style.color = "#2d4fa3"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              <Download size={14} />
              Download Sample Template
            </button>
          </div>

          {/* ── Import Results ──────────────────────────── */}
          {importResult && (
            <div className="p-4 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
              <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Import Results
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(45,122,71,0.08)", border: "1px solid rgba(45,122,71,0.2)" }}>
                  <CheckCircle2 size={14} style={{ color: "#2d7a47" }} />
                  <span className="text-[12.5px] font-medium" style={{ color: "#2d7a47" }}>
                    {importResult.successful} imported
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)" }}>
                  <XCircle size={14} style={{ color: "#dc2626" }} />
                  <span className="text-[12.5px] font-medium" style={{ color: "#dc2626" }}>
                    {importResult.failed} failed
                  </span>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-3 p-3 rounded-lg" style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.15)" }}>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#dc2626" }}>
                    Errors
                  </h4>
                  <div className="text-[12px] max-h-32 overflow-y-auto space-y-1" style={{ color: "#dc2626" }}>
                    {importResult.errors.map((error, index) => (
                      <div key={index}>
                        <strong>Row {error.index + 2}:</strong> {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Modal Footer ────────────────────────────── */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4"
          style={{ borderTop: "1px solid var(--border-light)" }}>
          {importResult && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98]"
              style={{ background: "var(--accent-amber)", boxShadow: "0 2px 8px rgba(238,162,58,.3)" }}
            >
              <Upload size={14} />
              Import Again
            </button>
          )}
          {parsedStudentsData && !importResult && (
            <button
              onClick={() => handleBulkImport(parsedStudentsData)}
              disabled={isImporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #0a0064, #0003c7)", boxShadow: "0 2px 8px rgba(45,122,71,.3)" }}
            >
              {isImporting ? (
                <>
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Importing…
                </>
              ) : "Import to Database"}
            </button>
          )}
          <button
            onClick={() => { if (!isImporting) { reset(); onClose(); } }}
            disabled={isImporting}
            className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Close
          </button>
        </div>

        {/* ── Parsed Data Preview ──────────────────────── */}
        {parsedStudentsData && !importResult && (
          <div className="mt-4 p-4 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
            <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Preview — {parsedStudentsData.length} students parsed
            </h3>
            <div className="overflow-x-auto max-h-60">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                    {["ID Number", "Name", "Year Level", "Email"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedStudentsData.slice(0, 5).map((student, index) => (
                    <tr key={index} className="hover:bg-amber-50/30 transition-colors"
                      style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td className="py-2 px-3 text-[12.5px] font-mono" style={{ color: "var(--text-secondary)" }}>{student.student_id_number}</td>
                      <td className="py-2 px-3 text-[12.5px] font-medium" style={{ color: "var(--text-primary)" }}>{student.student_name}</td>
                      <td className="py-2 px-3 text-[12.5px]" style={{ color: "var(--text-secondary)" }}>{student.student_yr_level || "—"}</td>
                      <td className="py-2 px-3 text-[12.5px]" style={{ color: "var(--text-secondary)" }}>{student.student_email || "—"}</td>
                    </tr>
                  ))}
                  {parsedStudentsData.length > 5 && (
                    <tr>
                      <td colSpan="4" className="py-2 px-3 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
                        And {parsedStudentsData.length - 5} more students…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <ModalAnimations />
    </div>
  );
}
