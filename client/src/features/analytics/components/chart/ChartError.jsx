/**
 * features/analytics/components/chart/ChartError.jsx
 *
 * Inline error state for chart widgets. Extracted from the former
 * pages/Dashboard.jsx (was `ChartError`).
 */

import { AlertTriangle } from "lucide-react";

export default function ChartError({ message }) {
  return (
    <div className="flex items-center justify-center gap-2 m-4 p-3 rounded-xl"
      style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.18)" }}>
      <AlertTriangle size={14} color="#dc2626" />
      <span className="text-[11px]" style={{ color: "#dc2626" }}>
        {message || "Failed to load data"}
      </span>
    </div>
  );
}
