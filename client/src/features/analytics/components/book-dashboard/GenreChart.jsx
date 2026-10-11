/**
 * features/analytics/components/book-dashboard/GenreChart.jsx
 *
 * Books-by-genre horizontal bar chart. Extracted from the former
 * pages/BookDashboard.jsx.
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SectionCard from "../../../../components/ui/SectionCard";
import ChartTip from "../../../../components/ui/ChartTip";
import { C } from "../../constants/bookDashboardPalette";

export default function GenreChart({ genreData }) {
  return (
    <SectionCard title="Books by Genre">
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={genreData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal stroke="var(--border-light)" vertical={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} style={{ color: "var(--text-muted)" }} />
            <YAxis dataKey="genre" type="category" width={75} tick={{ fontSize: 11 }} style={{ color: "var(--text-secondary)" }} />
            <Tooltip content={<ChartTip />} />
            <Bar dataKey="count" fill={C.teal} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
