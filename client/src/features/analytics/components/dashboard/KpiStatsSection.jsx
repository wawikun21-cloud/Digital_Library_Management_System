/**
 * features/analytics/components/dashboard/KpiStatsSection.jsx
 *
 * KPI card row plus the kpiStats failure banner. Models come from
 * utils/dashboardKpiCards (pure); this component only renders them and
 * maps card routes onto navigation. Extracted from the `stats` useMemo and
 * KPI JSX of the former pages/Dashboard.jsx.
 */

import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import StatsCard from "../../../../components/StatsCard";
import { buildKpiCardModels } from "../../utils/dashboardKpiCards";

export default function KpiStatsSection({ kpiStats, loading, error }) {
  const navigate = useNavigate();
  const cards    = buildKpiCardModels(kpiStats, loading);

  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {cards.map(card => (
          <StatsCard key={card.label} label={card.label} value={card.value}
            change={card.change} accent={card.accent} percentage={card.percentage}
            onClick={card.route ? () => navigate(card.route) : undefined} />
        ))}
      </section>

      {error && (
        <div className="rounded-xl p-3 flex items-center gap-2"
          style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.18)" }}>
          <AlertTriangle size={14} color="#dc2626" />
          <span className="text-[11px]" style={{ color: "#dc2626" }}>
            Stats unavailable: {error}
          </span>
        </div>
      )}
    </>
  );
}
