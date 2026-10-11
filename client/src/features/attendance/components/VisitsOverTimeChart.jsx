/**
 * features/attendance/components/VisitsOverTimeChart.jsx
 *
 * Visits-over-time line chart with a Daily/Weekly/Monthly switcher.
 * Extracted from the former pages/AttendanceDashboard.jsx.
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SectionCard from "../../../components/ui/SectionCard";
import TabButton from "../../../components/ui/TabButton";
import ChartTip from "../../../components/ui/ChartTip";
import { C } from "../constants/attendancePalette";

export default function VisitsOverTimeChart({ visitsOverTime, visitsFilter, onFilterChange }) {
  return (
    <SectionCard title="Visits Over Time" info action={
      <div style={{ display: "flex", gap: 3 }}>
        <TabButton label="Daily"   active={visitsFilter === "Daily"}   onClick={() => onFilterChange("Daily")} />
        <TabButton label="Weekly"  active={visitsFilter === "Weekly"}  onClick={() => onFilterChange("Weekly")} />
        <TabButton label="Monthly" active={visitsFilter === "Monthly"} onClick={() => onFilterChange("Monthly")} />
      </div>
    }>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visitsOverTime} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border-light)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTip />} />
            <Line type="monotone" dataKey="visits" stroke={C.teal} strokeWidth={2.5} dot={{ fill: C.teal, r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
