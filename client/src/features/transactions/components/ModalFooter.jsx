/**
 * features/transactions/components/ModalFooter.jsx
 *
 * Cancel / confirm footer. Extracted from the former pages/Borrowed.jsx
 * (was the in-file `ModalFooter`).
 */

export default function ModalFooter({ onCancel, onConfirm, confirmLabel }) {
  return (
    <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--border-light)" }}>
      <button onClick={onCancel}
        className="px-4 py-2.5 rounded-lg text-[13px] font-semibold"
        style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1.5px solid var(--border)" }}>
        Cancel
      </button>
      <button onClick={onConfirm}
        className="px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white"
        style={{ background: "var(--accent-amber)" }}>
        {confirmLabel}
      </button>
    </div>
  );
}
