/**
 * features/transactions/components/ModalShell.jsx
 *
 * Standard modal shell (overlay, header, scrollable body). Extracted from
 * the former pages/Borrowed.jsx (was the in-file `ModalShell`).
 */

import { BookOpen, X } from "lucide-react";

export default function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(10,22,34,0.6)", backdropFilter: "blur(3px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[520px] max-h-[92vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-2">
            <BookOpen size={18} style={{ color: "var(--accent-amber)" }} />
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
