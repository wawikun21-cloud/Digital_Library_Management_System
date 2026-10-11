/**
 * features/transactions/components/DateInput.jsx
 *
 * Date field with calendar icon. Extracted from the former
 * pages/Borrowed.jsx (was the in-file `DateInput`).
 */

import { Calendar } from "lucide-react";

export default function DateInput({ value, onChange, error }) {
  return (
    <div className="relative">
      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-secondary)" }} />
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-9 pr-3 py-2.5 rounded-lg text-[13px] border outline-none"
        style={{ background: "var(--bg-main)", borderColor: error ? "#EA8B33" : "var(--border)", color: "var(--text-primary)" }}
      />
    </div>
  );
}
