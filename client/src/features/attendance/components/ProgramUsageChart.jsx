/**
 * features/attendance/components/ProgramUsageChart.jsx
 *
 * Library usage by program, switchable between visits and hours.
 * Extracted from the former pages/AttendanceDashboard.jsx.
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SectionCard from "../../../components/ui/SectionCard";
import TabButton from "../../../components/ui/TabButton";
import ChartTip from "../../../components/ui/ChartTip";
import { C } from "../constants/attendancePalette";

export default function ProgramUsageChart({ programData, programTab, onTabChange }) {
  return (
    <SectionCard title="Library Usage by Program" action={
      <div style={{ display: "flex", gap: 3 }}>
        <TabButton label="By Visits" active={programTab === "By Visits"} onClick={() => onTabChange("By Visits")} />
        <TabButton label="By Hours"  active={programTab === "By Hours"}  onClick={() => onTabChange("By Hours")} />
      </div>
    }>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={programData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal stroke="var(--border-light)" vertical={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="program" type="category" width={60} tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTip />} />
            <Bar dataKey={programTab === "By Visits" ? "visits" : "totalHours"} fill={C.teal} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
