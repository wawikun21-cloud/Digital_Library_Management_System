import { FileSpreadsheet, Upload, Download, AlertCircle, FileText } from "lucide-react";

export default function BookAddImport({
  sampleData = [],
  onFileSelect,
  onStartImport,
  importStatus
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Info banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: "rgba(184, 122, 0, 0.08)", border: "1.5px solid rgba(184, 122, 0, 0.2)" }}
      >
        <FileSpreadsheet size={18} style={{ color: "var(--accent-amber)", flexShrink: 0, marginTop: 1 }} />
        <div>
          <p className="text-[13px] font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
            Bulk Import from Excel
          </p>
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            Upload an Excel file (.xlsx or .xls) containing book data. Each row should represent a book with columns: Title, Author, ISBN, Genre, Quantity, etc.
          </p>
        </div>
      </div>

      {/* Dropzone */}
      <div
        className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer hover:border-amber-400"
        style={{
          background: "var(--bg-subtle)",
          borderColor: "var(--border)"
        }}
        onClick={() => onFileSelect && onFileSelect()}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "rgba(184, 122, 0, 0.1)" }}
        >
          <Upload size={28} style={{ color: "var(--accent-amber)" }} />
        </div>
        <div className="text-center">
          <p className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Drop your Excel file here
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-secondary)" }}>
            or click to browse
          </p>
        </div>
        <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
          Supported formats: .xlsx, .xls
        </p>
      </div>

      {/* Template download */}
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: "var(--bg-surface)", border: "1.5px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(45, 122, 71, 0.1)" }}
          >
            <FileText size={20} style={{ color: "#2d7a47" }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Need a template?
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Download our Excel template to get started
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150"
          style={{
            background: "var(--bg-subtle)",
            color: "var(--text-secondary)",
            border: "1.5px solid var(--border)"
          }}
          onClick={() => {}}
        >
          <Download size={14} />
          Download Template
        </button>
      </div>

      {/* Preview table (sample data) */}
      <div className="flex flex-col gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Preview (Sample Data)
        </p>
        <div className="rounded-xl overflow-hidden border border-border" style={{ background: "var(--bg-surface)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: "var(--bg-subtle)", borderBottom: "1.5px solid var(--border)" }}>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>Title</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>Author</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>ISBN</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>Genre</th>
                  <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--text-secondary)" }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {sampleData && sampleData.length > 0 ? (
                  sampleData.map((book, index) => (
                    <tr
                      key={index}
                      className="border-t border-border transition-colors duration-100 hover:bg-amber-50/30"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{book.title}</td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{book.author}</td>
                      <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>{book.isbn}</td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{ background: "rgba(45, 122, 71, 0.1)", color: "#2d7a47" }}
                        >
                          {book.genre}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" style={{ color: "var(--text-primary)" }}>{book.quantity}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
                      No sample data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Showing sample data. Upload a file to see your actual data.
        </p>
      </div>

      {/* Status message */}
      {importStatus === "idle" && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-[12px]"
          style={{
            background: "rgba(50, 102, 127, 0.08)",
            border: "1.5px solid rgba(50, 102, 127, 0.2)",
            color: "#32667F"
          }}
        >
          <AlertCircle size={16} />
          <span>Upload an Excel file to preview and import book data.</span>
        </div>
      )}

      {/* Import button (disabled) */}
      <div className="flex items-center justify-between pt-2 border-t border-border-light">
        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          No file selected
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 cursor-not-allowed opacity-50"
          style={{
            background: "var(--bg-subtle)",
            color: "var(--text-muted)"
          }}
        >
          <FileSpreadsheet size={16} />
          Start Import
        </button>
      </div>

      {/* Note about functionality */}
      <p className="text-[10px] text-center italic" style={{ color: "var(--text-muted)" }}>
        Note: Import functionality is not yet implemented. This is the UI design only.
      </p>
    </div>
  );
}

