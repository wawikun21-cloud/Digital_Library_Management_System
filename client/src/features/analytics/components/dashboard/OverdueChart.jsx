/**
 * features/analytics/components/dashboard/OverdueChart.jsx
 *
 * Overdue books stacked bar chart widget. Extracted from the former
 * pages/Dashboard.jsx (was `OverdueBooks`).
 */

import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import ChartCard from "../chart/ChartCard";
import StatPills from "../chart/StatPills";
import ChartSkeleton from "../chart/ChartSkeleton";
import ChartError from "../chart/ChartError";
import ChartTooltip from "../chart/ChartTooltip";

// FIX F: default data=[]
const OverdueChart = memo(function OverdueChart({ data = [], loading, error }) {
  const safeData = Array.isArray(data) ? data : [];
  const totCrit  = safeData.reduce((s, r) => s + (r.critical ?? 0), 0);
  const totWarn  = safeData.reduce((s, r) => s + (r.warning  ?? 0), 0);
  const totMin   = safeData.reduce((s, r) => s + (r.minor    ?? 0), 0);

  return (
    <ChartCard title="Overdue Books" icon={AlertTriangle} iconColor="#dc2626" iconBg="rgba(220,38,38,0.12)">
      <StatPills items={[
        { value: totCrit, label: "Critical (15+ days)", color: "#dc2626", bg: "rgba(220,38,38,0.09)" },
        { value: totWarn, label: "Warning (8-14 days)", color: "#EA8B33", bg: "rgba(234,139,51,0.09)" },
        { value: totMin,  label: "Minor (1-7 days)",   color: "#EEA23A", bg: "rgba(238,162,58,0.09)" },
      ]} />
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <ChartError message={error} />
      ) : safeData.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>No overdue books</span>
        </div>
      ) : (
        <div className="py-3 pl-1 pr-3" style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeData} barCategoryGap="35%" margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="x"
                tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip content={<ChartTooltip suffix=" books" />} cursor={{ fill: "var(--bg-hover)" }} wrapperStyle={{ zIndex: 9999 }} />
              <Legend iconType="circle" iconSize={7}
                wrapperStyle={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", paddingTop: 6 }} />
              <Bar dataKey="critical" name="Critical" fill="#dc2626" radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="warning"  name="Warning"  fill="#EA8B33" radius={[3, 3, 0, 0]} stackId="a" />
              <Bar dataKey="minor"    name="Minor"    fill="#EEA23A" radius={[3, 3, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
});

export default OverdueChart;
