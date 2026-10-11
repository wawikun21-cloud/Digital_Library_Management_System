/**
 * features/analytics/pages/AnalyticsDashboardPage.jsx
 *
 * Library Analytics Dashboard — composition only.
 *
 * Data lives in useDashboard; UI-level state is limited to the filter
 * selection and the admin flag (useIsAdmin). Every widget is its own
 * component; KPI card models come from utils/dashboardKpiCards.
 * Replaces the former pages/Dashboard.jsx.
 */

import { useCallback, useState } from "react";
import { Library, RefreshCw } from "lucide-react";
import { useWebSocket } from "../../../hooks/useWebsocket";
import { useDashboard } from "../hooks/useDashboard";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { SCHOOL_YEARS } from "../constants/schoolCalendar";
import KpiStatsSection from "../components/dashboard/KpiStatsSection";
import DashboardFilterBar from "../components/dashboard/DashboardFilterBar";
import MostBorrowedBooks from "../components/dashboard/MostBorrowedBooks";
import AttendanceChart from "../components/dashboard/AttendanceChart";
import FinesChart from "../components/dashboard/FinesChart";
import OverdueChart from "../components/dashboard/OverdueChart";
import HoldingsBreakdown from "../components/dashboard/HoldingsBreakdown";

export default function AnalyticsDashboardPage() {
  const isAdmin = useIsAdmin();

  const [schoolYear, setSchoolYear] = useState(SCHOOL_YEARS[0]);
  const [semester,   setSemester]   = useState("2nd Sem");
  const [month,      setMonth]      = useState("All");

  const {
    kpiStats, mostBorrowed, attendance, fines, overdue,
    holdingsBreakdown,
    loading, errors,
    refresh, updateKpiStats,
  } = useDashboard({ schoolYear, semester, month });

  const handleStatsUpdate = useCallback((newStats) => {
    updateKpiStats(newStats);
  }, [updateKpiStats]);

  useWebSocket({ isAdmin, onStatsUpdate: handleStatsUpdate });

  return (
    <main className="flex flex-col gap-4 lg:gap-5" aria-label="Library Analytics Dashboard">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
           <h1 className="flex items-center gap-2.5 text-[18px] font-bold" style={{ color: "var(--text-primary)" }}>
            <Library size={22} style={{ color: "var(--accent-amber)" }} />
            Library Analytics Dashboard
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Real-time statistics, charts, and actionable library insights
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={refresh}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98]"
            style={{ background: "var(--accent-amber)", boxShadow: "0 2px 8px rgba(238,162,58,.3)" }}>
            <RefreshCw size={14} /> Refresh All
          </button>
        </div>
      </div>

      <KpiStatsSection kpiStats={kpiStats} loading={loading.kpiStats} error={errors.kpiStats} />

      <DashboardFilterBar
        schoolYear={schoolYear} onSchoolYear={sy => { setSchoolYear(sy); setMonth("All"); }}
        semester={semester}     onSemester={s  => { setSemester(s);   setMonth("All"); }}
        month={month}           onMonth={setMonth}
        onRefresh={refresh}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-start-1 lg:col-span-2 lg:row-start-1 lg:row-span-2">
          <MostBorrowedBooks data={mostBorrowed} loading={loading.charts} error={errors.mostBorrowed} />
        </div>
        <div className="lg:col-start-3 lg:col-span-3 lg:row-start-1">
          <AttendanceChart data={attendance} loading={loading.charts} error={errors.attendance} />
        </div>
        <div className="lg:col-start-3 lg:col-span-3 lg:row-start-2">
          <FinesChart data={fines} loading={loading.charts} error={errors.fines} />
        </div>
        <div className="lg:col-start-1 lg:col-span-5 lg:row-start-3">
          <OverdueChart data={overdue} loading={loading.charts} error={errors.overdue} />
        </div>
      </div>

      <HoldingsBreakdown
        data={holdingsBreakdown.data}
        loading={loading.holdingsBreakdown}
        error={errors.holdingsBreakdown}
      />
    </main>
  );
}
