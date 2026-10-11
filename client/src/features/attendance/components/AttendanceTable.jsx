/**
 * features/attendance/components/AttendanceTable.jsx
 *
 * Groups records by student — one row per student. Clicking a row opens
 * StudentHistoryModal with full session history and a Download PDF button.
 *
 * Moved from components/AttendanceTable.jsx (its only consumer was the
 * attendance page) with its duplicated helpers replaced by the feature
 * utils and its modal/actions/pill split into their own files.
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Users, TrendingUp } from 'lucide-react';
import AttendanceStatusPill from './AttendanceStatusPill';
import LiveTimer from './LiveTimer';
import SessionActions from './SessionActions';
import StudentHistoryModal from './StudentHistoryModal';
import { fmtDateTime, fmtDuration } from '../utils/attendanceDateTime';
import { getFullName, getInitials } from '../utils/studentName';
import { avatarColor } from '../utils/avatarColor';
import { groupByStudent, sortGroups, nextSortConfig } from '../utils/attendanceTableData';

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

  const sortedGroups = useMemo(() => sortGroups(grouped, sortConfig), [grouped, sortConfig]);

  const handleSort = (key) => setSortConfig((prev) => nextSortConfig(prev, key));

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
          <thead style={{ background: 'var(--bg-subtle)', borderBottom: '2px solid var(--border)' }}>
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
              background: 'var(--bg-subtle)',
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
              const fullName   = getFullName(student);
              const [bg1, bg2] = avatarColor(fullName);

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
                        {getInitials(fullName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13.5px] transition-colors" style={{ color: 'var(--text-primary)' }}>
                            {fullName}
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
                    <AttendanceStatusPill status={isActive ? 'checked_in' : 'checked_out'} />
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
