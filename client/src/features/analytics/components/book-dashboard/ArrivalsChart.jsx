/**
 * features/analytics/components/book-dashboard/ArrivalsChart.jsx
 *
 * New-arrivals line chart with a Daily/Weekly/Monthly period switcher.
 * Extracted from the former pages/BookDashboard.jsx.
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SectionCard from "../../../../components/ui/SectionCard";
import TabButton from "../../../../components/ui/TabButton";
import ChartTip from "../../../../components/ui/ChartTip";
import { C } from "../../constants/bookDashboardPalette";

const PERIODS = ["Daily", "Weekly", "Monthly"];

export default function ArrivalsChart({ arrivalsData, dataKey, period, onPeriodChange }) {
  return (
    <SectionCard title="New Arrivals Over Time" action={
      <div style={{ display: "flex", gap: 3 }}>
        {PERIODS.map(p => (
          <TabButton key={p} label={p} active={period === p} onClick={() => onPeriodChange(p)} />
        ))}
      </div>
    } info>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* key={period} forces a remount so the axis rebinds to the new dataKey */}
          <LineChart key={period} data={arrivalsData} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
            <XAxis dataKey={dataKey} tick={{ fontSize: 11 }} style={{ color: "var(--text-muted)" }} />
            <YAxis tick={{ fontSize: 11 }} style={{ color: "var(--text-muted)" }} />
            <Tooltip content={<ChartTip />} />
            <Line type="linear" dataKey="arrivals" stroke={C.amber} strokeWidth={4} dot={{ fill: C.teal, r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
