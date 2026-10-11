/**
 * features/analytics/components/dashboard/AttendanceChart.jsx
 *
 * Library attendance area chart widget. Extracted from the former
 * pages/Dashboard.jsx (was `AttendanceCount`).
 */

import { memo } from "react";
import { Users } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import ChartCard from "../chart/ChartCard";
import StatPills from "../chart/StatPills";
import ChartSkeleton from "../chart/ChartSkeleton";
import ChartError from "../chart/ChartError";
import ChartTooltip from "../chart/ChartTooltip";

// FIX F: default data=[] — AttendanceCount called data.reduce() before
// the loading check, crashing when data was undefined
const AttendanceChart = memo(function AttendanceChart({ data = [], loading, error }) {
  const safeData = Array.isArray(data) ? data : [];
  const total    = safeData.reduce((s, r) => s + (r.visits ?? 0), 0);
  const peak     = safeData.reduce((mx, r) => (r.visits ?? 0) > mx.visits ? r : mx, { visits: 0, x: "—" });

  return (
    <ChartCard title="Library Attendance" icon={Users} iconColor="#32667F" iconBg="rgba(50,102,127,0.15)">
      <StatPills items={[
        { value: total.toLocaleString(), label: "Total Visits", color: "#32667F", bg: "rgba(50,102,127,0.1)" },
        { value: peak.x,                label: "Peak Period",  color: "#EEA23A", bg: "rgba(238,162,58,0.1)"  },
      ]} />
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <ChartError message={error} />
      ) : (
        <div className="py-3 pl-1 pr-3" style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={safeData} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#32667F" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#32667F" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="x"
                tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip content={<ChartTooltip suffix=" visits" />} wrapperStyle={{ zIndex: 9999 }} />
              <Area dataKey="visits" name="Visits" type="monotone"
                stroke="#32667F" strokeWidth={2} fill="url(#attGrad)" dot={{ r: 3, fill: "#32667F" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
});

export default AttendanceChart;
