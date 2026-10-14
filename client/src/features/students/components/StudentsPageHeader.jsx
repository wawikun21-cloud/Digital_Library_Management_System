/**
 * features/students/components/StudentsPageHeader.jsx
 *
 * Page header with refresh / bulk import / add actions. Extracted from the
 * former pages/Students.jsx.
 */

import { RefreshCw, Upload, Plus } from "lucide-react";

export default function StudentsPageHeader({
  canImport, canCreate, onRefresh, onImportClick, onAddClick,
}) {
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
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[.98]"
          style={{
            background: "rgba(100,116,139,0.1)",
            border: "1.5px solid rgba(100,116,139,0.2)",
            color: "var(--text-primary)",
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>

        {canImport && (
          <button
            onClick={onImportClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[.98]"
            style={{
              background: "rgba(45,122,71,0.1)",
              border: "1.5px solid rgba(45, 63, 122, 0.35)",
              color: "var(--text-primary)",
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
            style={{ background: "var(--accent-amber)", boxShadow: "0 2px 8px rgba(238,162,58,.3)" }}
          >
            <Plus size={14} /> Add Student
          </button>
        )}
      </div>
    </div>
  );
}
