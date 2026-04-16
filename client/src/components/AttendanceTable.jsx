// ─────────────────────────────────────────────────────────
//  components/AttendanceTable.jsx
//  Groups records by student — one row per student.
//  Clicking a row opens a modal with full session history
//  and a Download PDF button.
// ─────────────────────────────────────────────────────────

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronUp, AlertCircle, MoreVertical,
  Trash2, Clock, Calendar, Timer, Download,
  X, Users, TrendingUp, BookOpen, CheckCircle2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────
const fmtDateTime = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtDate = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const fmtDuration = (mins) => {
  if (!mins && mins !== 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const getInitials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const pad = (n) => String(n).padStart(2, '0');

const AVATAR_COLORS = [
  ['#32667F', '#1a4a5e'],
  ['#b87a1a', '#8a5a10'],
  ['#2d7a47', '#1d5a32'],
  ['#7c3aed', '#5b26b8'],
  ['#c2410c', '#9a3208'],
];
const avatarColor = (name = '') =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ─────────────────────────────────────────────────────────
//  PDF Generator
// ─────────────────────────────────────────────────────────
function printStudentPDF(student, sessions) {
  const e = (v) =>
    String(v ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const totalMins  = sessions.reduce((a, r) => a + (r.duration || 0), 0);
  const totalHours = (totalMins / 60).toFixed(1);

  const rows = sessions
    .map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${e(fmtDate(r.check_in_time))}</td>
        <td>${e(fmtDateTime(r.check_in_time))}</td>
        <td>${r.check_out_time ? e(fmtDateTime(r.check_out_time)) : '—'}</td>
        <td>${r.status === 'checked_in' ? 'Still Inside' : e(fmtDuration(r.duration))}</td>
        <td>${r.status === 'checked_in' ? 'Checked In' : 'Checked Out'}</td>
      </tr>`)
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Attendance — ${e(student.student_name)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:32px}
.hdr{border-bottom:3px solid #EEA23A;padding-bottom:14px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-end}
.hdr-left h1{font-size:20px;font-weight:700;color:#132F45}
.hdr-left p{font-size:11px;color:#666;margin-top:4px}
.hdr-right{text-align:right;font-size:11px;color:#888}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px}
.stat{background:#f8f9fa;border:1px solid #eee;border-radius:8px;padding:12px 16px}
.stat-val{font-size:22px;font-weight:700;color:#132F45}
.stat-lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
table{width:100%;border-collapse:collapse}
th{background:#132F45;color:#fff;padding:9px 12px;text-align:left;font-size:10px;letter-spacing:.5px;text-transform:uppercase}
td{padding:8px 12px;border-bottom:1px solid #eee;font-size:11.5px}
tr:nth-child(even) td{background:#f8f9fa}
.ftr{margin-top:18px;font-size:10px;color:#aaa;text-align:right}
@media print{body{padding:16px}}
</style></head><body>
<div class="hdr">
  <div class="hdr-left">
    <h1>Attendance History — ${e(student.student_name)}</h1>
    <p>${e(student.student_id_number)} · ${e(student.student_course || '—')} · ${e(student.student_yr_level || '—')}</p>
  </div>
  <div class="hdr-right">
    Generated: ${new Date().toLocaleString('en-US')}<br/>
    Lexora Library Management System
  </div>
</div>
<div class="stats">
  <div class="stat"><div class="stat-val">${sessions.length}</div><div class="stat-lbl">Total Visits</div></div>
  <div class="stat"><div class="stat-val">${totalHours}h</div><div class="stat-lbl">Total Hours</div></div>
  <div class="stat"><div class="stat-val">${sessions.filter(s => s.status === 'checked_out').length}</div><div class="stat-lbl">Completed Sessions</div></div>
</div>
<table>
  <thead><tr><th>#</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Duration</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="ftr">Lexora Digital Library Management System · ${new Date().toLocaleDateString()}</div>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Please allow pop-ups to download PDF.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

// ─────────────────────────────────────────────────────────
//  Shared UI atoms
// ─────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const isIn = status === 'checked_in';
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
      style={{
        background: isIn ? 'rgba(45,122,71,0.12)' : 'rgba(238,162,58,0.14)',
        color:      isIn ? '#2d7a47'               : '#b87a1a',
        border:     `1px solid ${isIn ? 'rgba(45,122,71,0.22)' : 'rgba(238,162,58,0.28)'}`,
      }}
    >
      {isIn
        ? <><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />In Library</>
        : <><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#b87a1a' }} />Checked Out</>
      }
    </span>
  );
};

const LiveTimer = ({ checkInTime }) => {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(checkInTime).getTime()) / 1000)
  );
  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - new Date(checkInTime).getTime()) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, [checkInTime]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[12px] font-bold"
      style={{ color: 'var(--accent-amber)' }}>
      <Clock size={11} className="animate-pulse" />
      {h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`}
    </span>
  );
};

// ─────────────────────────────────────────────────────────
//  Session delete dropdown (used inside modal)
// ─────────────────────────────────────────────────────────
const SessionActions = ({ sessionId, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="p-1 rounded transition-colors hover:opacity-60"
        style={{ color: '#94a3b8' }}
      >
        <MoreVertical size={13} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-lg py-1 w-36 z-50"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.22)' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(e, sessionId); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} /> Delete Session
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
//  Student Session History Modal
// ─────────────────────────────────────────────────────────
const StudentHistoryModal = ({ student, onClose, onDelete }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const sessions   = student.sessions;
  const totalMins  = sessions.reduce((a, r) => a + (r.duration || 0), 0);
  const totalHours = (totalMins / 60).toFixed(1);
  const isActive   = sessions.some((s) => s.status === 'checked_in');
  const [bg1, bg2] = avatarColor(student.student_name);

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
              {getInitials(student.student_name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="text-[15px] font-bold leading-snug"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {student.student_name}
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
                          style={{ background: '#e2e8f0', color: '#64748b' }}
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
                        <StatusPill status={s.status} />
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

      <style>{`
        @keyframes overlayIn {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(.93) translateY(12px) }
          to   { opacity: 1; transform: scale(1)   translateY(0)    }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
//  Skeleton Row
// ─────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse" style={{ borderBottom: '1px solid var(--border-light)' }}>
    <td className="px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full" style={{ background: 'var(--border)' }} />
        <div className="space-y-1.5">
          <div className="h-3.5 rounded w-32" style={{ background: 'var(--border)' }} />
          <div className="h-2.5 rounded w-20" style={{ background: 'var(--border-light)' }} />
        </div>
      </div>
    </td>
    {[80, 96, 64, 64, 80, 80, 80].map((w, i) => (
      <td key={i} className="px-5 py-4">
        <div className="h-3 rounded" style={{ width: w, background: 'var(--border)' }} />
      </td>
    ))}
  </tr>
);

// ─────────────────────────────────────────────────────────
//  Group flat records by student
// ─────────────────────────────────────────────────────────
function groupByStudent(records) {
  const map = new Map();
  for (const r of records) {
    const key = r.student_id_number;
    if (!map.has(key)) {
      map.set(key, {
        student_id_number: r.student_id_number,
        student_name:      r.student_name,
        student_course:    r.student_course,
        student_yr_level:  r.student_yr_level,
        sessions: [],
      });
    }
    map.get(key).sessions.push(r);
  }
  for (const student of map.values()) {
    student.sessions.sort(
      (a, b) => new Date(b.check_in_time) - new Date(a.check_in_time)
    );
  }
  return [...map.values()].sort(
    (a, b) =>
      new Date(b.sessions[0].check_in_time) -
      new Date(a.sessions[0].check_in_time)
  );
}

// ─────────────────────────────────────────────────────────
//  Main Table Component
// ─────────────────────────────────────────────────────────
const AttendanceTable = React.memo(({
  data = [],
  loading = false,
  hasFilters = false,
  totalRecords,
  onClearFilters,
  onDelete,
}) => {
  const [sortConfig,      setSortConfig]      = useState({ key: 'latest', direction: 'desc' });
  const [selectedStudent, setSelectedStudent] = useState(null);

  const grouped = useMemo(() => groupByStudent(data), [data]);

  const sortedGroups = useMemo(() => {
    const arr = [...grouped];
    arr.sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case 'student_name':
          aVal = a.student_name?.toLowerCase() ?? '';
          bVal = b.student_name?.toLowerCase() ?? '';
          break;
        case 'visits':
          aVal = a.sessions.length;
          bVal = b.sessions.length;
          break;
        case 'total_duration':
          aVal = a.sessions.reduce((s, r) => s + (r.duration || 0), 0);
          bVal = b.sessions.reduce((s, r) => s + (r.duration || 0), 0);
          break;
        case 'latest':
        default:
          aVal = new Date(a.sessions[0]?.check_in_time ?? 0);
          bVal = new Date(b.sessions[0]?.check_in_time ?? 0);
          break;
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [grouped, sortConfig]);

  const handleSort = (key) =>
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));

  const SortIcon = ({ colKey }) => {
    if (sortConfig.key !== colKey)
      return <ChevronDown size={11} className="opacity-0 group-hover:opacity-40 transition-opacity" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp   size={11} style={{ color: 'var(--accent-amber)' }} />
      : <ChevronDown size={11} style={{ color: 'var(--accent-amber)' }} />;
  };

  const headers = [
    { key: 'student_name',   label: 'Student',      sortable: true  },
    { key: null,             label: 'ID Number',    sortable: false },
    { key: null,             label: 'Course',       sortable: false },
    { key: null,             label: 'Year Level',   sortable: false },
    { key: 'visits',         label: 'Total Visits', sortable: true  },
    { key: 'total_duration', label: 'Total Time',   sortable: true  },
    { key: 'latest',         label: 'Last Visit',   sortable: true  },
    { key: null,             label: 'Status',       sortable: false },
  ];

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full" style={{ background: 'var(--bg-surface)' }}>
          <thead style={{ background: 'var(--bg-topbar)', borderBottom: '2px solid var(--border)' }}>
            <tr>
              {headers.map((h) => (
                <th
                  key={h.label}
                  className="px-5 py-3.5 text-left text-[10.5px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array(5).fill(null).map((_, i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {/* ── Table ───────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>

          {/* Header */}
          <thead
            className="sticky top-0 z-10"
            style={{
              background: 'var(--bg-topbar)',
              backdropFilter: 'blur(8px)',
              borderBottom: '2px solid var(--border)',
            }}
          >
            <tr>
              {headers.map((h) => (
                <th
                  key={h.label}
                  scope="col"
                  className="px-5 py-3.5 text-left group"
                  style={{ borderBottom: '2px solid var(--border)' }}
                >
                  <div
                    className={`flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider select-none
                      ${h.sortable ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => h.sortable && handleSort(h.key)}
                  >
                    {h.label}
                    {h.sortable && <SortIcon colKey={h.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody style={{ background: 'var(--bg-surface)' }}>
            {sortedGroups.map((student) => {
              const key        = student.student_id_number;
              const latest     = student.sessions[0];
              const isActive   = student.sessions.some((s) => s.status === 'checked_in');
              const totalMins  = student.sessions.reduce((s, r) => s + (r.duration || 0), 0);
              const [bg1, bg2] = avatarColor(student.student_name);

              return (
                <tr
                  key={key}
                  className="group transition-all duration-150 cursor-pointer"
                  style={{ borderLeft: '3px solid transparent', borderBottom: '1px solid var(--border-light)' }}
                  onClick={() => setSelectedStudent(student)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      'linear-gradient(90deg, rgba(50,102,127,0.04) 0%, transparent 100%)';
                    e.currentTarget.style.borderLeftColor = 'var(--accent-amber)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedStudent(student)}
                  title="Click to view session history"
                >
                  {/* Student */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${bg1} 0%, ${bg2} 100%)` }}
                      >
                        {getInitials(student.student_name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13.5px] transition-colors" style={{ color: 'var(--text-primary)' }}>
                            {student.student_name}
                          </span>
                          {isActive && (
                            <span
                              className="w-2 h-2 rounded-full animate-pulse"
                              style={{
                                background: '#22c55e',
                                boxShadow: '0 0 0 3px rgba(34,197,94,0.2)',
                              }}
                              title="Currently in library"
                            />
                          )}
                        </div>
                        <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          {student.student_id_number}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* ID */}
                  <td className="px-5 py-3.5 font-mono text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                    {student.student_id_number}
                  </td>

                  {/* Course */}
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: 'rgba(50,102,127,0.1)', color: '#32667F' }}
                    >
                      {student.student_course || '—'}
                    </span>
                  </td>

                  {/* Year Level */}
                  <td className="px-5 py-3.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                    {student.student_yr_level || '—'}
                  </td>

                  {/* Total Visits */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold"
                        style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                      >
                        {student.sessions.length}
                      </div>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        visit{student.sessions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </td>

                  {/* Total Time */}
                  <td className="px-5 py-3.5">
                    {isActive
                      ? <LiveTimer
                          checkInTime={
                            student.sessions.find((s) => s.status === 'checked_in')?.check_in_time
                          }
                        />
                      : <span
                          className="font-mono text-[12.5px] font-semibold"
                          style={{ color: 'var(--accent-amber)' }}
                        >
                          {fmtDuration(totalMins)}
                        </span>
                    }
                  </td>

                  {/* Last Visit */}
                  <td className="px-5 py-3.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {fmtDateTime(latest?.check_in_time)}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <StatusPill status={isActive ? 'checked_in' : 'checked_out'} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Empty State ─────────────────────────────────── */}
      {sortedGroups.length === 0 && (
        <div className="text-center py-16 px-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          >
            <Users size={28} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          </div>
          <p className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {hasFilters ? 'No records match your filters' : 'No attendance records yet'}
          </p>
          <p className="text-[12.5px] mb-5" style={{ color: 'var(--text-muted)' }}>
            {hasFilters
              ? 'Try adjusting your search or filters'
              : 'Check in a student to get started'}
          </p>
          {hasFilters && (
            <button
              onClick={onClearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'var(--accent-amber)' }}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────── */}
      {sortedGroups.length > 0 && (
        <div
          className="px-5 py-3 flex items-center justify-between text-[11.5px]"
          style={{
            background: 'var(--bg-subtle)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-4" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1.5">
              <Users size={12} style={{ color: 'var(--accent-amber)' }} />
              <strong className="font-bold" style={{ color: 'var(--text-primary)' }}>{sortedGroups.length}</strong>
              &nbsp;unique student{sortedGroups.length !== 1 ? 's' : ''}
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-blue-400" />
              <strong className="font-bold" style={{ color: 'var(--text-primary)' }}>{totalRecords ?? data.length}</strong>
              &nbsp;total sessions
            </span>
          </div>
          <span className="font-medium" style={{ color: 'var(--text-muted)' }}>
            Click a row to view session history
          </span>
        </div>
      )}

      {/* ── Session History Modal ────────────────────────── */}
      {selectedStudent && (
        <StudentHistoryModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onDelete={onDelete}
        />
      )}
    </>
  );
});

AttendanceTable.displayName = 'AttendanceTable';
export default AttendanceTable;