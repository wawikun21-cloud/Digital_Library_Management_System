/**
 * features/attendance/components/TapResult.jsx
 *
 * Tap-result feedback card (auto-dismisses after 4s). Extracted from the
 * former pages/Attendance.jsx (was `TapResult`).
 */

import { useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { getFullName } from "../utils/studentName";

export default function TapResult({ result, onDismiss }) {
  const isIn = result.action === "checked_in";

  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-xl"
      style={{
        background: isIn ? "rgba(45,122,71,0.08)" : "rgba(238,162,58,0.10)",
        border: `1px solid ${isIn ? "rgba(45,122,71,0.3)" : "rgba(238,162,58,0.4)"}`,
        animation: "modalIn .22s cubic-bezier(.34,1.56,.64,1)",
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: isIn ? "rgba(45,122,71,0.15)" : "rgba(238,162,58,0.2)" }}
      >
        {isIn ? <CheckCircle2 size={20} style={{ color: "#2d7a47" }} /> : <XCircle size={20} style={{ color: "#b87a1a" }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold truncate" style={{ color: isIn ? "#2d7a47" : "#b87a1a" }}>
          {isIn ? "Checked In" : "Checked Out"} — {getFullName(result.data || {}) || result.data?.student_name}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {result.data?.student_course && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(50,102,127,.12)", color: "#32667F" }}>
              {result.data.student_course}
            </span>
          )}
          {result.data?.student_yr_level && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(124,58,237,.1)", color: "#7c3aed" }}>
              {result.data.student_yr_level}
            </span>
          )}
          {result.data?.school_year && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(16,185,129,.1)", color: "#059669" }}>
              SY {result.data.school_year}
            </span>
          )}
        </div>
      </div>
      <button onClick={onDismiss} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
        <X size={14} style={{ color: "var(--text-secondary)" }} />
      </button>
    </div>
  );
}
