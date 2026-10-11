/**
 * features/attendance/components/SessionActions.jsx
 *
 * Per-session actions dropdown (delete) inside the history modal.
 * Extracted from the former components/AttendanceTable.jsx (was
 * `SessionActions`).
 */

import { useState, useEffect, useRef } from "react";
import { MoreVertical, Trash2 } from "lucide-react";

export default function SessionActions({ sessionId, onDelete }) {
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
        style={{ color: 'var(--text-muted)' }}
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
            className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] font-medium transition-colors"
            style={{ color: '#dc2626' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Trash2 size={12} /> Delete Session
          </button>
        </div>
      )}
    </div>
  );
}
