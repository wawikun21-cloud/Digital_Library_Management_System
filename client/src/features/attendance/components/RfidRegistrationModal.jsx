/**
 * features/attendance/components/RfidRegistrationModal.jsx
 *
 * Two-step RFID card registration (scan code → link student). Extracted
 * from the former pages/Attendance.jsx (was `RfidRegistrationModal`); the
 * student search section now lives in RfidStudentSearch.
 */

import { useState, useEffect, useRef } from "react";
import { X, CreditCard, CheckCircle2, UserPlus, Loader2, AlertTriangle, AlertCircle } from "lucide-react";
import { registerRfid } from "../../../services/api/rfidApi";
import { getFullName } from "../utils/studentName";
import RfidStudentSearch from "./RfidStudentSearch";

export default function RfidRegistrationModal({ onClose, onRegistered, onToast }) {
  const overlayRef = useRef(null);
  const [rfidCode, setRfidCode] = useState("");
  const rfidInputRef = useRef(null);
  const [studentIdInput,  setStudentIdInput]  = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [regError,    setRegError]    = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    setTimeout(() => rfidInputRef.current?.focus(), 80);
  }, []);

  const handleStudentIdChange = (value) => {
    setStudentIdInput(value);
    if (selectedStudent && value !== selectedStudent.student_id_number)
      setSelectedStudent(null);
    setRegError("");
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStudentIdInput(student.student_id_number);
    setRegError("");
  };

  const handleRegister = async () => {
    if (!rfidCode.trim()) { setRegError("Please enter or scan the RFID code."); return; }
    if (!selectedStudent) { setRegError("Please select a student from the list."); return; }
    setRegistering(true);
    setRegError("");
    try {
      const res = await registerRfid(rfidCode.trim(), selectedStudent.student_id_number);
      if (res.success) {
        const name = getFullName(selectedStudent) || selectedStudent.student_id_number;
        onToast?.(`RFID card registered to ${name}`, "success");
        setTimeout(() => onRegistered(res.data, selectedStudent), 350);
      } else {
        const msg = res.error || "Registration failed. Please try again.";
        setRegError(msg);
        onToast?.(msg, "error");
      }
    } catch {
      const msg = "Network error. Please try again.";
      setRegError(msg);
      onToast?.(msg, "error");
    } finally {
      setRegistering(false);
    }
  };

  const isReady = rfidCode.trim() && selectedStudent;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{
        background: "rgba(8,18,28,0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "overlayIn .18s ease",
      }}
    >
      <div
        className="w-full flex flex-col rounded-2xl overflow-hidden"
        style={{
          maxWidth: 520,
          maxHeight: "92vh",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "modalIn .24s cubic-bezier(.34,1.46,.64,1)",
        }}
      >
        {/* ── Header ─────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(45,122,71,0.12) 0%, rgba(238,162,58,0.08) 100%)",
            borderBottom: "1px solid var(--border-light)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(45, 53, 122, 0.2), rgba(70, 58, 238, 0.15))",
                border: "1.5px solid rgba(45, 76, 122, 0.3)",
                boxShadow: "0 2px 8px rgba(45, 76, 122, 0.15)",
              }}
            >
              <CreditCard size={18} style={{ color: "#11004e" }} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                Register RFID Card
              </h2>
              <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Link an RFID card to a student account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.08)"; e.currentTarget.style.color = "#dc2626"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable Body ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5 px-6 py-5">

            {/* Step 1 — RFID Code */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: rfidCode.trim() ? "#130b7e" : "var(--accent-amber)" }}
                >
                  {rfidCode.trim() ? <CheckCircle2 size={12} /> : "1"}
                </span>
                <label className="text-[12.5px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  Scan or Enter RFID Code
                  <span className="ml-1" style={{ color: "#dc2626" }}>*</span>
                </label>
              </div>
              <div className="relative">
                <CreditCard
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: rfidCode.trim() ? "#130b7e" : "var(--text-muted)" }}
                />
                <input
                  ref={rfidInputRef}
                  type="text"
                  value={rfidCode}
                  onChange={(e) => { setRfidCode(e.target.value); setRegError(""); }}
                  placeholder="Place card on reader or type code…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] font-mono outline-none transition-all"
                  style={{
                    background: rfidCode.trim() ? "rgba(45,122,71,0.05)" : "var(--bg-input)",
                    border: `1.5px solid ${rfidCode.trim() ? "rgba(45,122,71,0.45)" : "var(--border)"}`,
                    color: "var(--text-primary)",
                    boxShadow: rfidCode.trim() ? "0 0 0 3px rgba(45,122,71,0.08)" : "none",
                    letterSpacing: "0.5px",
                  }}
                />
                {rfidCode.trim() && (
                  <button
                    onClick={() => setRfidCode("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <X size={13} style={{ color: "var(--text-muted)" }} />
                  </button>
                )}
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                Place the card on the RFID reader — it will auto-fill, or type the code manually.
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--border-light)" }} />
              <span className="text-[10.5px] font-bold tracking-widest px-2"
                style={{ color: "var(--text-muted)" }}>
                LINK TO STUDENT
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border-light)" }} />
            </div>

            {/* Step 2 — Student Search */}
            <RfidStudentSearch
              value={studentIdInput}
              onChange={handleStudentIdChange}
              selectedStudent={selectedStudent}
              onSelectStudent={handleSelectStudent}
            />

            {/* Error */}
            {regError && (
              <div
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
                style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)" }}
              >
                <AlertTriangle size={14} style={{ color: "#dc2626", flexShrink: 0 }} />
                <p className="text-[12.5px] font-medium" style={{ color: "#dc2626" }}>{regError}</p>
              </div>
            )}

            {/* Info note */}
            <div
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
              style={{ background: "rgba(50,102,127,0.07)", border: "1px solid rgba(50,102,127,0.15)" }}
            >
              <AlertCircle size={13} style={{ color: "#32667F", flexShrink: 0, marginTop: 1 }} />
              <p className="text-[11.5px] leading-relaxed" style={{ color: "#32667F" }}>
                Once registered, tapping this card will check the student <strong>in</strong> on the first tap and <strong>out</strong> on the second tap.
              </p>
            </div>

          </div>
        </div>

        {/* ── Footer ─────────────────────────────────── */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: "1px solid var(--border-light)", background: "var(--bg-subtle)" }}
        >
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full transition-all"
              style={{ background: rfidCode.trim() ? "#1c005c" : "var(--border)" }} />
            <div className="w-2 h-2 rounded-full transition-all"
              style={{ background: selectedStudent ? "#1c005c" : "var(--border)" }} />
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80 active:scale-[.98]"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleRegister}
              disabled={!isReady || registering}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isReady
                  ? "linear-gradient(135deg, #001844, #000caf)"
                  : "var(--accent-amber)",
                boxShadow: isReady ? "0 3px 10px rgba(26, 0, 141, 0.35)" : "0 2px 8px rgba(238,162,58,.3)",
                transition: "all .2s ease",
              }}
            >
              {registering
                ? <><Loader2 size={14} className="animate-spin" /> Registering…</>
                : <><UserPlus size={14} /> Register Card</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
