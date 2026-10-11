/**
 * features/attendance/components/StudentHistoryModal.jsx
 *
 * Student session-history modal (records-table variant). Extracted from the
 * former components/AttendanceTable.jsx (was `StudentHistoryModal`).
 */

import { useEffect, useRef } from "react";
import { Clock, BookOpen, Timer, CheckCircle2, AlertCircle, Download, X } from "lucide-react";
import ModalAnimations from "./ModalAnimations";
import LiveTimer from "./LiveTimer";
import AttendanceStatusPill from "./AttendanceStatusPill";
import SessionActions from "./SessionActions";
import { fmtDate, fmtDateTime, fmtDuration } from "../utils/attendanceDateTime";
import { getFullName, getInitials } from "../utils/studentName";
import { avatarColor } from "../utils/avatarColor";
import { printStudentPDF } from "../utils/attendancePdf";

export default function StudentHistoryModal({ student, onClose, onDelete }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const sessions   = student.sessions;
  const totalMins  = sessions.reduce((a, r) => a + (r.duration || 0), 0);
  const totalHours = (totalMins / 60).toFixed(1);
  const isActive   = sessions.some((s) => s.status === 'checked_in');
  const fullName   = getFullName(student);
  const [bg1, bg2] = avatarColor(fullName);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(10,22,34,0.62)',
        backdropFilter: 'blur(5px)',
        animation: 'overlayIn .18s ease',
      }}
    >
      <div
        className="flex flex-col w-full overflow-hidden"
        style={{
          maxWidth: 720,
          maxHeight: '90vh',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          boxShadow: '0 28px 70px rgba(0,0,0,0.3)',
          animation: 'modalIn .22s cubic-bezier(.34,1.56,.64,1)',
        }}
      >

        {/* ── Modal Header ──────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-bold text-white shrink-0 shadow"
              style={{ background: `linear-gradient(135deg, ${bg1} 0%, ${bg2} 100%)` }}
            >
              {getInitials(fullName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="text-[15px] font-bold leading-snug"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {fullName}
                </h2>
                {isActive && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: 'rgba(34,197,94,0.12)',
                      color: '#16a34a',
                      border: '1px solid rgba(34,197,94,0.25)',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    In Library
                  </span>
                )}
              </div>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {[student.student_id_number, student.student_course, student.student_yr_level]
                  .filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => printStudentPDF(student, sessions)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.97]"
              style={{
                background: 'var(--accent-amber)',
                boxShadow: '0 2px 8px rgba(238,162,58,0.35)',
              }}
            >
              <Download size={13} />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:opacity-60"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Stats Strip ───────────────────────────────── */}
        <div
          className="grid grid-cols-3 gap-3 px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          {[
            { icon: BookOpen,     label: 'Total Visits',       value: sessions.length,                                    color: '#32667F' },
            { icon: Timer,        label: 'Total Hours',        value: `${totalHours}h`,                                   color: '#EEA23A' },
            { icon: CheckCircle2, label: 'Completed Sessions', value: sessions.filter(s => s.status === 'checked_out').length, color: '#2d7a47' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="flex flex-col gap-1 px-4 py-3 rounded-xl"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
            >
              <div className="flex items-center gap-1.5">
                <Icon size={12} style={{ color }} />
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {label}
                </span>
              </div>
              <span className="text-[22px] font-bold leading-none" style={{ color }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Session Table ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <p
            className="text-[10.5px] font-bold uppercase tracking-widest mt-5 mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            Session History
          </p>

          {sessions.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 gap-2"
              style={{ color: 'var(--text-muted)' }}
            >
              <AlertCircle size={30} className="opacity-30" />
              <span className="text-[13px]">No sessions found.</span>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)' }}>
                    {['#', 'Date', 'Check In', 'Check Out', 'Duration', 'Status', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ background: 'var(--bg-surface)' }}>
                  {sessions.map((s, idx) => (
                    <tr
                      key={s.id}
                      className="transition-colors"
                      style={{
                        background: idx % 2 !== 0 ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                        borderBottom: '1px solid var(--border-light)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 !== 0 ? 'var(--bg-subtle)' : 'var(--bg-surface)'; }}
                    >
                      {/* # */}
                      <td className="px-4 py-3">
                        <span
                          className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold"
                          style={{ background: 'var(--border)', color: 'var(--text-muted)' }}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3 text-[12.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {fmtDate(s.check_in_time)}
                      </td>
                      {/* Check In */}
                      <td className="px-4 py-3 font-mono text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {fmtDateTime(s.check_in_time)}
                      </td>
                      {/* Check Out */}
                      <td className="px-4 py-3 font-mono text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {s.check_out_time
                          ? fmtDateTime(s.check_out_time)
                          : <span className="text-amber-600 font-semibold text-[11px]">Still Inside</span>
                        }
                      </td>
                      {/* Duration */}
                      <td className="px-4 py-3">
                        {s.status === 'checked_in'
                          ? <LiveTimer checkInTime={s.check_in_time} />
                          : <span
                              className="font-mono text-[12.5px] font-semibold"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {fmtDuration(s.duration)}
                            </span>
                        }
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <AttendanceStatusPill status={s.status} />
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <SessionActions sessionId={s.id} onDelete={onDelete} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ModalAnimations />
    </div>
  );
}
