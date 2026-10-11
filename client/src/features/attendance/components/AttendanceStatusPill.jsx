/**
 * features/attendance/components/AttendanceStatusPill.jsx
 *
 * In Library / Checked Out pill (records-table variant). Extracted from the
 * former components/AttendanceTable.jsx (was its `StatusPill`). The
 * history-modal pill is the distinct StatusPill component.
 */

export default function AttendanceStatusPill({ status }) {
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
}
