/**
 * features/analytics/utils/dashboardKpiCards.js
 *
 * KPI card models for the main analytics dashboard. Pure function — the page
 * and KpiStatsSection only render what it returns. Extracted from the
 * `stats` useMemo of the former pages/Dashboard.jsx.
 */

const pctOf = (n, total) => {
  if (!total) return undefined;
  return Math.max(0, Math.min(100, Math.round((n / total) * 100)));
};

/**
 * @param {object|null} kpiStats    Server-computed KPI stats (or null while loading).
 * @param {boolean}     loadingKpi  Whether the KPI request is in flight.
 * @returns {Array<{label,value,change,accent,percentage?,route?}>}
 */
export function buildKpiCardModels(kpiStats, loadingKpi) {
  if (!kpiStats) {
    return [
      { label: "SCHOOL BOOKS",  value: "—", change: loadingKpi ? "Loading…" : "—", accent: "#132F45" },
      { label: "LEXORA BOOKS",  value: "—", change: loadingKpi ? "Loading…" : "—", accent: "#32667F" },
      { label: "Out of Stock",  value: "—", change: loadingKpi ? "Loading…" : "—", accent: "#dc2626" },
      { label: "Returned",      value: "—", change: loadingKpi ? "Loading…" : "—", accent: "#32667F" },
    ];
  }

  const { nemcoTotal = 0, lexoraTotal = 0, nemcoOutOfStock = 0, returned = 0 } = kpiStats;
  return [
    { label: "SCHOOL BOOKS",  value: Number(nemcoTotal).toLocaleString(),      change: "Live", accent: "#132F45", percentage: nemcoTotal ? 100 : undefined,      route: "/dashboard/books" },
    { label: "LEXORA BOOKS",  value: Number(lexoraTotal).toLocaleString(),     change: "Live", accent: "#32667F", percentage: lexoraTotal ? 100 : undefined,     route: "/dashboard/lexora-books" },
    { label: "Out of Stock",  value: Number(nemcoOutOfStock).toLocaleString(), change: "Live", accent: "#dc2626", percentage: pctOf(nemcoOutOfStock, nemcoTotal), route: "/dashboard/books?status=OutOfStock" },
    { label: "Returned",      value: Number(returned).toLocaleString(),        change: "Live", accent: "#32667F", percentage: pctOf(returned, nemcoTotal),        route: "/dashboard/borrowed?status=Returned" },
  ];
}
