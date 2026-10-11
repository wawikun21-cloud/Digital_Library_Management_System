/**
 * features/attendance/components/VisitsByDayChart.jsx
 *
 * Visits by day of week; the peak day is highlighted. Extracted from the
 * former pages/AttendanceDashboard.jsx.
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import SectionCard from "../../../components/ui/SectionCard";
import ChartTip from "../../../components/ui/ChartTip";
import { C } from "../constants/attendancePalette";

export default function VisitsByDayChart({ visitsByDay }) {
  return (
    <SectionCard title="Visits by Day of Week">
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visitsByDay} barSize={32} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border-light)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(34,197,94,.07)" }} />
            <Bar dataKey="visits" fill={C.green} radius={[5, 5, 0, 0]}>
              {visitsByDay.map((d, i) => {
                const peakVal = Math.max(...visitsByDay.map(v => v.visits));
                return <Cell key={i} fill={d.visits === peakVal ? C.amber : C.green} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
