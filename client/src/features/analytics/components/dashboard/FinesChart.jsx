/**
 * features/analytics/components/dashboard/FinesChart.jsx
 *
 * Fines overview bar chart widget. Extracted from the former
 * pages/Dashboard.jsx (was `TotalFinesCollected`).
 */

import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { fmtPeso } from "../../constants/dashboardPalette";
import ChartCard from "../chart/ChartCard";
import StatPills from "../chart/StatPills";
import ChartSkeleton from "../chart/ChartSkeleton";
import ChartError from "../chart/ChartError";
import ChartTooltip from "../chart/ChartTooltip";

// FIX F: default data=[]
const FinesChart = memo(function FinesChart({ data = [], loading, error }) {
  const safeData       = Array.isArray(data) ? data : [];
  const totCollected   = safeData.reduce((s, r) => s + (r.collected   ?? 0), 0);
  const totUncollected = safeData.reduce((s, r) => s + (r.uncollected ?? 0), 0);

  return (
    <ChartCard title="Fines Overview" icon={AlertTriangle} iconColor="#EA8B33" iconBg="rgba(234,139,51,0.15)">
      <StatPills items={[
        { value: fmtPeso(totCollected),   label: "Collected",   color: "#32667F", bg: "rgba(50,102,127,0.1)"  },
        { value: fmtPeso(totUncollected), label: "Uncollected", color: "#c05a0a", bg: "rgba(234,139,51,0.1)"  },
      ]} />
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <ChartError message={error} />
      ) : (
        <div className="py-3 pl-1 pr-3" style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeData} barCategoryGap="35%" margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="x"
                tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} width={36}
                tickFormatter={v => `₱${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
              <Tooltip content={<ChartTooltip prefix="₱" />} cursor={{ fill: "var(--bg-hover)" }} wrapperStyle={{ zIndex: 9999 }} />
              <Legend iconType="circle" iconSize={7}
                wrapperStyle={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", paddingTop: 6 }} />
              <Bar dataKey="collected"   name="Collected"   fill="#32667F" radius={[3, 3, 0, 0]} />
              <Bar dataKey="uncollected" name="Uncollected" fill="#EA8B33" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
});

export default FinesChart;
