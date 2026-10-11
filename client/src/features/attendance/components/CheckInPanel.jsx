/**
 * features/attendance/components/CheckInPanel.jsx
 *
 * Check-in / check-out input panel with student lookup feedback and the
 * tap-result card. Extracted from the former pages/Attendance.jsx.
 */

import { Search, LogIn, ArrowRight } from "lucide-react";
import Spinner from "./Spinner";
import Avatar from "./Avatar";
import TapResult from "./TapResult";
import { getFullName } from "../utils/studentName";

export default function CheckInPanel({
  idInput, onIdChange, onSubmit, tapping, lookingUp, studentInfo, tapResult, onDismissTap, inputRef,
}) {
  return (
    <div className="rounded-xl px-5 py-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <p className="flex items-center gap-2 text-[13px] font-semibold mb-3"
        style={{ color: "var(--text-primary)" }}>
        <LogIn size={14} style={{ color: "var(--accent-amber)" }} />
        Input Student ID to Check In / Out
      </p>
      <p className="text-[11.5px] mb-3" style={{ color: "var(--text-muted)" }}>
        Enter a student ID. First Enter checks in, second Enter checks out automatically.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="flex-1 w-full">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-muted)" }} />
            <input
              ref={inputRef}
              type="text"
              value={idInput}
              onChange={(e) => onIdChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSubmit(e); }}
              placeholder="Enter or scan Student ID…"
              disabled={tapping}
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-[13px] outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 disabled:opacity-60"
              style={{
                background: "var(--bg-input)", border: "1.5px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            {tapping && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner size={15} /></div>
            )}
          </div>

          {lookingUp && (
            <div className="flex items-center gap-2 mt-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
              <Spinner size={13} /> Looking up student…
            </div>
          )}

          {studentInfo && !lookingUp && (
            <div className="flex items-center gap-3 mt-2 px-3 py-2 rounded-lg"
              style={{ background: "rgba(45,122,71,0.08)", border: "1px solid rgba(45,122,71,0.25)" }}>
              <Avatar name={getFullName(studentInfo)} size={28} />
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "#2d7a47" }}>
                  {getFullName(studentInfo)}
                </p>
                <div className="flex gap-1.5 flex-wrap mt-0.5">
                  {studentInfo.student_course && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(50,102,127,.12)", color: "#32667F" }}>
                      {studentInfo.student_course}
                    </span>
                  )}
                  {studentInfo.student_yr_level && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(124,58,237,.1)", color: "#7c3aed" }}>
                      {studentInfo.student_yr_level}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {!studentInfo && !lookingUp && idInput.trim() !== "" && !tapping && (
            <p className="mt-1.5 text-[12px] font-medium" style={{ color: "#dc2626" }}>
              Student not found in the system.
            </p>
          )}

          {tapResult && (
            <div className="mt-2">
              <TapResult result={tapResult} onDismiss={onDismissTap} />
            </div>
          )}
        </div>

        <button
          onClick={onSubmit}
          disabled={!idInput.trim() || tapping}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "var(--accent-amber)",
            boxShadow: idInput.trim() ? "0 2px 6px rgba(238,162,58,.3)" : "none",
          }}
        >
          <ArrowRight size={15} /> Check In
        </button>
      </div>
    </div>
  );
}
