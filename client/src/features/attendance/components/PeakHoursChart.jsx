/**
 * features/attendance/components/PeakHoursChart.jsx
 *
 * Average occupancy by hour; the peak bar is highlighted. Extracted from the
 * former pages/AttendanceDashboard.jsx.
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import SectionCard from "../../../components/ui/SectionCard";
import ChartTip from "../../../components/ui/ChartTip";
import { C } from "../constants/attendancePalette";

export default function PeakHoursChart({ peakHours }) {
  return (
    <SectionCard title="Peak Hours">
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={peakHours} barSize={18} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border-light)" />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(238,162,58,.07)" }} />
            <Bar dataKey="avg" fill={C.amber} radius={[5, 5, 0, 0]}>
              {peakHours.map((d, i) => {
                const peakVal = Math.max(...peakHours.map(v => v.avg));
                return <Cell key={i} fill={d.avg === peakVal ? C.teal : C.amber} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
