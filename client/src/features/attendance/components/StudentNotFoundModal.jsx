/**
 * features/attendance/components/StudentNotFoundModal.jsx
 *
 * "Student ID not found" alert. Extracted from the former
 * pages/Attendance.jsx (was `StudentNotFoundModal`).
 */

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

export default function StudentNotFoundModal({ studentId, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,34,0.65)", backdropFilter: "blur(4px)", animation: "overlayIn .18s ease" }}
    >
      <div
        className="w-full flex flex-col items-center text-center gap-5 p-8 rounded-2xl"
        style={{
          maxWidth: 400,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
          animation: "modalIn .22s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "rgba(220,38,38,0.1)", border: "1.5px solid rgba(220,38,38,0.25)" }}>
          <AlertTriangle size={30} style={{ color: "#dc2626" }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[17px] font-bold" style={{ color: "var(--text-primary)" }}>
            Student ID Not Found
          </h2>
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            The ID{" "}
            <span className="font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}>
              {studentId}
            </span>{" "}
            does not match any registered student in the system.
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
            Please verify the ID and try again, or contact the librarian.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98]"
          style={{ background: "#dc2626", boxShadow: "0 2px 8px rgba(220,38,38,0.3)" }}
        >
          OK, Try Again
        </button>
      </div>
    </div>
  );
}
