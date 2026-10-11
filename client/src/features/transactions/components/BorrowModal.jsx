/**
 * features/transactions/components/BorrowModal.jsx
 *
 * Full borrow flow: borrower selection, book picking with copy selection,
 * and dates. State and lookup logic live in useBorrowForm; the two sections
 * are their own panels. Extracted from the former pages/Borrowed.jsx.
 */

import { useBorrowForm } from "../hooks/useBorrowForm";
import ModalShell from "./ModalShell";
import ModalFooter from "./ModalFooter";
import FieldLabel from "./FieldLabel";
import DateInput from "./DateInput";
import BorrowerSearchPanel from "./BorrowerSearchPanel";
import BookPickerPanel from "./BookPickerPanel";

export default function BorrowModal({ onClose, onBorrow }) {
  const borrowForm = useBorrowForm({ onBorrow, onClose });
  const { form, errors, setBorrowDate, setDueDate, submit } = borrowForm;

  return (
    <ModalShell title="Borrow Book" onClose={onClose}>
      <BorrowerSearchPanel borrowForm={borrowForm} />
      <BookPickerPanel borrowForm={borrowForm} />

      {/* ── Dates ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <FieldLabel label="Date Borrowed" />
          <DateInput value={form.borrow_date} onChange={setBorrowDate} />
        </div>
        <div className="flex flex-col gap-1">
          <FieldLabel label="Due Date (1 day)" required />
          <DateInput
            value={form.due_date}
            onChange={setDueDate}
            error={errors.due_date}
          />
          {errors.due_date && <p className="text-[11px] text-orange-500">{errors.due_date}</p>}
        </div>
      </div>

      <ModalFooter onCancel={onClose} onConfirm={submit} confirmLabel="Borrow Book" />
    </ModalShell>
  );
}
