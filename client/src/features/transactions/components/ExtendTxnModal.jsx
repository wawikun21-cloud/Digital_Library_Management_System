/**
 * features/transactions/components/ExtendTxnModal.jsx
 *
 * Renew due date by N days. Owns its stepper state. Extracted from the
 * former pages/Borrowed.jsx.
 */

import { useState } from "react";
import ModalShell from "./ModalShell";
import ModalFooter from "./ModalFooter";
import FieldLabel from "./FieldLabel";
import { addDays } from "../utils/transactionDates";

export default function ExtendTxnModal({ txn, onClose, onExtend }) {
  const [extendDays, setExtendDays] = useState(1);

  const handleExtend = async () => {
    const ok = await onExtend(txn.id, extendDays);
    if (ok) onClose();
  };

  return (
    <ModalShell title="Renew Due Date" onClose={onClose}>
      <div className="p-3 rounded-lg"
        style={{ background: "var(--bg-main)", border: "1px solid var(--border)" }}>
        <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{txn.book_title}</p>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Current due date: <strong>{txn.due_date}</strong>
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel label="Renew by (days)" required />
        <div className="flex items-center gap-3">
          <button onClick={() => setExtendDays(d => Math.max(1, d - 1))}
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg border"
            style={{ background: "var(--bg-main)", borderColor: "var(--border)", color: "var(--text-primary)" }}>−</button>
          <span className="flex-1 text-center text-xl font-bold" style={{ color: "var(--text-primary)" }}>{extendDays}</span>
          <button onClick={() => setExtendDays(d => d + 1)}
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg border"
            style={{ background: "var(--bg-main)", borderColor: "var(--border)", color: "var(--text-primary)" }}>+</button>
        </div>
        <p className="text-[11px] text-center mt-1" style={{ color: "var(--text-muted)" }}>
          New due date: <strong>{addDays(txn.due_date, extendDays)}</strong>
        </p>
      </div>

      <ModalFooter onCancel={onClose} onConfirm={handleExtend} confirmLabel={`Renew ${extendDays} Day${extendDays > 1 ? "s" : ""}`} />
    </ModalShell>
  );
}
