/**
 * features/transactions/components/EditTxnModal.jsx
 *
 * Edit borrower fields + dates for one transaction. Owns its own form state
 * (seeded from the txn at mount). Extracted from the former
 * pages/Borrowed.jsx.
 */

import { useState } from "react";
import ModalShell from "./ModalShell";
import ModalFooter from "./ModalFooter";
import FieldLabel from "./FieldLabel";
import DateInput from "./DateInput";
import { today, tomorrow } from "../utils/transactionDates";

const seedForm = (txn) => ({
  borrower_type:     txn.borrower_type     || "student",
  borrower_name:     txn.borrower_name     || "",
  borrower_id_number:txn.borrower_id_number|| "",
  borrower_contact:  txn.borrower_contact  || "",
  borrower_email:    txn.borrower_email    || "",
  borrower_course:   txn.borrower_course   || "",
  borrower_yr_level: txn.borrower_yr_level || "",
  borrow_date:       txn.borrow_date       || today(),
  due_date:          txn.due_date          || tomorrow(),
  books: [],  // edit doesn't change book
});

export default function EditTxnModal({ txn, onClose, onSave }) {
  const [form, setForm]     = useState(() => seedForm(txn));
  const [errors, setErrors] = useState({});

  const handleSave = async () => {
    if (!form.borrower_name.trim()) { setErrors({ borrower: "Name is required" }); return; }
    if (!form.due_date)             { setErrors({ due_date: "Due date is required" }); return; }
    const ok = await onSave(txn.id, form);
    if (ok) onClose();
  };

  return (
    <ModalShell title="Edit Transaction" onClose={onClose}>
      <div className="p-3 rounded-lg"
        style={{ background: "var(--bg-main)", border: "1px solid var(--border)" }}>
        <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{txn.book_title}</p>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {txn.book_accession && `Acc: ${txn.book_accession} · `}{txn.book_author}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel label="Borrower Name" required />
        <input
          value={form.borrower_name}
          onChange={e => setForm(f => ({ ...f, borrower_name: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-lg text-[13px] border outline-none"
          style={{ background: "var(--bg-main)", borderColor: errors.borrower ? "#EA8B33" : "var(--border)", color: "var(--text-primary)" }}
        />
        {errors.borrower && <p className="text-[11px] text-orange-500">{errors.borrower}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <FieldLabel label="ID Number" />
          <input value={form.borrower_id_number} onChange={e => setForm(f => ({ ...f, borrower_id_number: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg text-[13px] border outline-none"
            style={{ background: "var(--bg-main)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel label="Contact" />
          <input value={form.borrower_contact} onChange={e => setForm(f => ({ ...f, borrower_contact: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg text-[13px] border outline-none"
            style={{ background: "var(--bg-main)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <FieldLabel label="Date Borrowed" />
          <DateInput value={form.borrow_date} onChange={v => setForm(f => ({ ...f, borrow_date: v }))} />
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel label="Due Date" required />
          <DateInput value={form.due_date} onChange={v => setForm(f => ({ ...f, due_date: v }))} error={errors.due_date} />
          {errors.due_date && <p className="text-[11px] text-orange-500">{errors.due_date}</p>}
        </div>
      </div>

      <ModalFooter onCancel={onClose} onConfirm={handleSave} confirmLabel="Save Changes" />
    </ModalShell>
  );
}
