/**
 * features/transactions/components/TransactionDetailModal.jsx
 *
 * Row-click detail card: book/borrower info, status, dates, fine and the
 * permission-gated actions. Extracted from the former pages/Borrowed.jsx
 * (the status-pill, date-format and fine IIFEs became displayStatus,
 * formatShortDate and FineSummary).
 */

import { BookOpen, X, CheckCircle2, RefreshCw, Edit2, Trash2 } from "lucide-react";
import { isOverdue, formatShortDate, displayStatus } from "../utils/transactionDates";
import FineSummary from "./FineSummary";

export default function TransactionDetailModal({
  txn, onClose, onReturn, onRenew, onEdit, onDelete, onPayFine,
  canReturn, canExtend, canEdit, canDelete, canPayFine,
}) {
  const { label: statusLabel, style: statusStyle } = displayStatus(txn);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(10,22,34,0.6)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xl)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-2">
            <BookOpen size={18} style={{ color: "var(--accent-amber)" }} />
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Transaction Details</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">

          {/* Book info */}
          <div className="p-3 rounded-lg" style={{ background: "var(--bg-main)", border: "1px solid var(--border)" }}>
            <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{txn.book_title}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {txn.book_accession && `Acc: ${txn.book_accession} · `}{txn.book_author}
            </p>
          </div>

          {/* Borrower info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Borrower</p>
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{txn.borrower_name}</p>
              {txn.borrower_id_number && (
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>ID: {txn.borrower_id_number}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Contact</p>
              <p className="text-[12px]" style={{ color: "var(--text-primary)" }}>{txn.borrower_contact || "—"}</p>
            </div>
            {txn.borrower_course && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                  {txn.borrower_type === "faculty" ? "Department" : "Course"}
                </p>
                <p className="text-[12px]" style={{ color: "var(--text-primary)" }}>
                  {txn.borrower_type === "faculty"
                    ? `${txn.borrower_course} — Faculty`
                    : `${txn.borrower_course}${txn.borrower_yr_level ? ` · ${txn.borrower_yr_level}` : ""}`}
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Status</p>
              <span className="text-[11px] font-semibold px-2 py-1 rounded" style={statusStyle}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Borrow Date",  value: txn.borrow_date },
              { label: "Due Date",     value: txn.due_date,    warn: isOverdue(txn.due_date, txn.status) },
              { label: "Return Date",  value: txn.return_date },
            ].map(({ label, value, warn }) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
                <p className="text-[12px] font-medium" style={{ color: warn ? "#EA8B33" : value ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {value ? formatShortDate(value) : "—"}
                </p>
              </div>
            ))}
          </div>

          {/* Fines */}
          <FineSummary txn={txn} canPayFine={canPayFine} onPayFine={onPayFine} />

          {/* Actions */}
          <div className="flex gap-2 pt-1" style={{ borderTop: "1px solid var(--border-light)" }}>
            {txn.status !== "Returned" && canReturn && (
              <button
                onClick={() => { onReturn(txn.id); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors"
                style={{ background: "rgba(50,127,79,0.08)", borderColor: "rgba(50,127,79,0.3)", color: "#2d7a4f" }}
              >
                <CheckCircle2 size={13} /> Return
              </button>
            )}
            {txn.status !== "Returned" && canExtend && (
              <button
                onClick={() => { onClose(); onRenew(txn); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors"
                style={{ background: "rgba(238,162,58,0.08)", borderColor: "rgba(238,162,58,0.3)", color: "#EEA23A" }}
              >
                <RefreshCw size={13} /> Renew
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => { onClose(); onEdit(txn); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors"
                style={{ background: "rgba(50,102,127,0.08)", borderColor: "rgba(50,102,127,0.3)", color: "#32667F" }}
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => { onClose(); onDelete(txn); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors"
                style={{ background: "rgba(234,139,51,0.08)", borderColor: "rgba(234,139,51,0.3)", color: "#c05a0a" }}
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
