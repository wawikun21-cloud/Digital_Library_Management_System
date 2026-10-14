/**
 * features/faculty/components/FacultyPageHeader.jsx
 *
 * Page header with Bulk Import / Add Faculty actions. Extracted from the
 * former pages/Faculty.jsx.
 */

import { Upload, Plus } from "lucide-react";

export default function FacultyPageHeader({ canImport, canCreate, onImportClick, onAddClick }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="flex items-center gap-2.5 text-[22px] font-bold"
          style={{ color: "var(--text-primary)" }}>
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {canImport && (
          <button
            onClick={onImportClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[.98]"
            style={{
              background: "rgba(45,122,71,0.1)",
              border: "1.5px solid rgba(45,122,71,0.35)",
              color: "#2d7a47",
            }}
          >
            <Upload size={14} />
            Bulk Import
          </button>
        )}

        {canCreate && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors"
            style={{
              background: "var(--accent-amber)",
              boxShadow: "0 2px 8px rgba(238,162,58,.3)"
            }}
          >
            <Plus size={14} /> Add Faculty
          </button>
        )}
      </div>
    </div>
  );
}
