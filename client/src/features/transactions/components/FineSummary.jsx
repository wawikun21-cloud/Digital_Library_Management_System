/**
 * features/transactions/components/FineSummary.jsx
 *
 * Fine row inside the detail modal: amount, days overdue, paid state and
 * the pay-fine action. Extracted from the IIFE in the former
 * pages/Borrowed.jsx.
 */

import { DollarSign, CheckCircle2 } from "lucide-react";
import { previewFine } from "../utils/transactionDates";
import { FINE_PER_DAY } from "../constants/transactionRules";

export default function FineSummary({ txn, canPayFine, onPayFine }) {
  const fine     = previewFine(txn);
  const finePaid = !!txn.fine_paid;
  if (fine === 0) return null;

  const overdueDays = Math.round(fine / FINE_PER_DAY);

  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
      style={{ background: finePaid ? "rgba(50,127,79,0.08)" : "rgba(234,139,51,0.08)", border: `1px solid ${finePaid ? "rgba(50,127,79,0.25)" : "rgba(234,139,51,0.25)"}` }}>
      <div className="flex items-center gap-2">
        <DollarSign size={14} style={{ color: finePaid ? "#2d7a4f" : "#c05a0a" }} />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Fine</p>
          <p className="text-[14px] font-bold" style={{ color: finePaid ? "#2d7a4f" : "#c05a0a" }}>
            ₱{fine.toFixed(2)}
            <span className="text-[10px] font-normal ml-1" style={{ color: "var(--text-muted)" }}>
              ({overdueDays} day{overdueDays !== 1 ? "s" : ""} overdue)
            </span>
          </p>
        </div>
      </div>
      {!canPayFine ? null : finePaid ? (
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: "rgba(50,127,79,0.15)", color: "#2d7a4f" }}>
          ✓ Paid
        </span>
      ) : (
        <button
          onClick={() => onPayFine(txn.id)}
          className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: "rgba(50,127,79,0.15)", color: "#2d7a4f", border: "1px solid rgba(50,127,79,0.3)" }}
        >
          <CheckCircle2 size={12} /> Mark Paid
        </button>
      )}
    </div>
  );
}
