import { X } from "lucide-react";

export default function FilterBadge({ label, onClear, placeholder = "" }) {
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-semibold"
      style={{ background: "rgba(238,162,58,0.12)", color: "var(--accent-amber)", border: "1px solid rgba(238,162,58,0.3)" }}>
      {label}
      <button onClick={onClear} aria-label={`Clear ${placeholder || label} filter`}>
        <X size={11} />
      </button>
    </span>
  );
}
