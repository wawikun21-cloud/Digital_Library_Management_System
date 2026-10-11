/**
 * features/analytics/components/book-dashboard/CollectionChart.jsx
 *
 * Books-by-collection horizontal bar chart. Extracted from the former
 * pages/BookDashboard.jsx.
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SectionCard from "../../../../components/ui/SectionCard";
import ChartTip from "../../../../components/ui/ChartTip";
import { C } from "../../constants/bookDashboardPalette";

export default function CollectionChart({ collectionData }) {
  return (
    <SectionCard title="Books by Collection">
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={collectionData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal stroke="var(--border-light)" vertical={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} style={{ color: "var(--text-muted)" }} />
            <YAxis
              dataKey="collection" type="category" width={100} tick={{ fontSize: 11 }}
              style={{ color: "var(--text-secondary)" }}
              tickFormatter={v => (typeof v === "string" && v.trim()) ? v.trim() : "Unknown"}
            />
            <Tooltip content={<ChartTip />} />
            <Bar dataKey="count" fill={C.mint} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
