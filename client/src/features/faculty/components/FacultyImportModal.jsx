/**
 * features/faculty/components/FacultyImportModal.jsx
 *
 * Bulk Excel import: drop zone, template download, preview and results.
 * Owns its state via useFacultyImport. Extracted from the former
 * pages/Faculty.jsx.
 */

import { Upload, XCircle, CheckCircle2, Download } from "lucide-react";
import { useFacultyImport } from "../hooks/useFacultyImport";
import { DEPT_COLORS, DEFAULT_COLOR } from "../constants/facultyUi";

export default function FacultyImportModal({ onClose, showToast, onImported }) {
  const {
    importFile, parsedData, importResult, fileInputRef,
    handleFileChange, removeFile, downloadTemplate, handleBulkImport,
  } = useFacultyImport({ showToast, onImported });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)" }}
            >
              <Upload className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Bulk Import Faculty
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Drop zone */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Upload Excel File
            </label>
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
              style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFileChange({ target: { files: [f] } });
              }}
            >
              {importFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(50,127,79,0.12)" }}>
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{importFile.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{(importFile.size / 1024).toFixed(1)} KB</p>
                  <button
                    onClick={removeFile}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "var(--bg-input)" }}>
                    <Upload className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Drag & drop or click to browse</p>
                  <label className="cursor-pointer">
                    <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                    <span
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white inline-block"
                      style={{ background: "linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)" }}
                    >
                      Choose File
                    </span>
                  </label>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Supports .xlsx and .xls</p>
                </div>
              )}
            </div>
          </div>

          {/* Download template */}
          <div className="flex justify-center">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#2d4fa3"; e.currentTarget.style.color = "#2d4fa3"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>

          {/* Import result */}
          {importResult && (
            <div className="p-4 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Import Results</h3>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(50,127,79,0.12)" }}>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {importResult.successful} imported
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(220,38,38,0.08)" }}>
                    <XCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {importResult.failed} failed
                  </span>
                </div>
              </div>
              {importResult.errors?.length > 0 && (
                <div className="mt-3 p-3 rounded-lg max-h-28 overflow-y-auto" style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)" }}>
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400">
                      Row {err.index + 2}: {err.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {parsedData && !importResult && (
            <div className="p-4 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Preview — <span style={{ color: "#2d4fa3" }}>{parsedData.length} records</span>
              </h3>
              <div className="overflow-x-auto max-h-44 rounded-lg" style={{ border: "1px solid var(--border)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
                      <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Faculty Name</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td className="py-2 px-3 text-sm" style={{ color: "var(--text-primary)" }}>{r.faculty_name}</td>
                        <td className="py-2 px-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                            style={{ background: (DEPT_COLORS[r.department] || DEFAULT_COLOR).bg, color: (DEPT_COLORS[r.department] || DEFAULT_COLOR).text }}>
                            {r.department}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {parsedData.length > 5 && (
                      <tr>
                        <td colSpan={2} className="py-2 px-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                          …and {parsedData.length - 5} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          {parsedData && !importResult && (
            <button
              onClick={handleBulkImport}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #1e5e38 0%, #2d7a47 100%)",
                boxShadow: "0 2px 6px rgba(45,122,71,0.3)",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Import to Database
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
