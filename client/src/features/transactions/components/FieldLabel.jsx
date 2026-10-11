/**
 * features/transactions/components/FieldLabel.jsx
 *
 * Uppercase form label. Extracted from the former pages/Borrowed.jsx
 * (was the in-file `FieldLabel`).
 */

export default function FieldLabel({ label, required }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
      {label}{required && <span className="text-orange-500 ml-0.5">*</span>}
    </label>
  );
}
