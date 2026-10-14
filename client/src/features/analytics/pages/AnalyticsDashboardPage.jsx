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
import { useWebSocket } from "../../../hooks/useWebsocket";
import { useDashboard } from "../hooks/useDashboard";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { SCHOOL_YEARS } from "../constants/schoolCalendar";
import DashboardHeroCard from "../components/dashboard/DashboardHeroCard";
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
    <section className="flex flex-col gap-4 lg:gap-5" aria-label="Library Analytics Dashboard">

      <DashboardHeroCard
        kpiStats={kpiStats}
        loading={loading.kpiStats}
        error={errors.kpiStats}
        onRefresh={refresh}
      />

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
    </section>
  );
}
