/**
 * features/attendance/pages/AttendanceDashboardPage.jsx
 *
 * Library Attendance Dashboard — composition only.
 *
 * All data and fetch logic lives in useAttendanceDashboard (including the
 * WebSocket subscription); this page holds only the filter selection, the
 * tab state, and which modal is open. Replaces the former
 * pages/AttendanceDashboard.jsx.
 */

import { useState } from "react";
import { Users } from "lucide-react";
import { useAttendanceDashboard } from "../hooks/useAttendanceDashboard";
import { C } from "../constants/attendancePalette";
import AttendanceFilterBar from "../components/AttendanceFilterBar";
import KpiRow from "../components/KpiRow";
import TopStudentsCard from "../components/TopStudentsCard";
import ProgramUsageChart from "../components/ProgramUsageChart";
import VisitsOverTimeChart from "../components/VisitsOverTimeChart";
import PeakHoursChart from "../components/PeakHoursChart";
import VisitsByDayChart from "../components/VisitsByDayChart";
import LowUsageCard from "../components/LowUsageCard";
import SessionDistributionCard from "../components/SessionDistributionCard";
import OtherInsightsCard from "../components/OtherInsightsCard";
import TopStudentsModal from "../components/TopStudentsModal";
import LowUsageModal from "../components/LowUsageModal";

const EMPTY_FILTER = { program: "All", yrLevel: "All", schoolYear: "All", dateFrom: "", dateTo: "" };

export default function AttendanceDashboardPage() {
  const [programTab, setProgramTab]             = useState("By Visits");
  const [visitsFilter, setVisitsFilter]         = useState("Daily");
  const [showLowUsageModal, setShowLowUsageModal]       = useState(false);
  const [showTopStudentsModal, setShowTopStudentsModal] = useState(false);

  const [globalFilter, setGlobalFilter] = useState({
    program: "All", yrLevel: "All", schoolYear: "All", dateFrom: "", dateTo: "",
  });

  const {
    kpi, topStudents, programData, visitsOverTime, peakHours, visitsByDay,
    lowUsage, sessionDist, sessionTotal, otherInsights, activeAttendance,
    availableYears, programOptions,
  } = useAttendanceDashboard({
    globalFilter,
    visitsFilter,
    onSchoolYearChange: year => setGlobalFilter(f => ({ ...f, schoolYear: year })),
  });

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {showLowUsageModal    && <LowUsageModal    onClose={() => setShowLowUsageModal(false)} />}
      {showTopStudentsModal && <TopStudentsModal  onClose={() => setShowTopStudentsModal(false)} />}

      {/* ── Page Header + Inline Filters ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 7 }}>
            <Users size={17} color={C.amber} /> Library Attendance Dashboard
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
            Monitor student library usage, visits, and engagement
          </p>
        </div>

        <AttendanceFilterBar
          globalFilter={globalFilter}
          onChange={patch => setGlobalFilter(f => ({ ...f, ...patch }))}
          onClear={() => setGlobalFilter(EMPTY_FILTER)}
          programOptions={programOptions}
          schoolYearOptions={availableYears}
        />
      </div>

      {/* ── KPI Row ── */}
      <KpiRow kpi={kpi} activeAttendance={activeAttendance} globalFilter={globalFilter} />

      {/* ── Row 2: Top Students table + Program Usage chart ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: 14 }}>
        <TopStudentsCard topStudents={topStudents} onViewAll={() => setShowTopStudentsModal(true)} />
        <ProgramUsageChart programData={programData} programTab={programTab} onTabChange={setProgramTab} />
      </div>

      {/* ── Row 3: Visits Over Time + Peak Hours + Visits by Day ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr", gap: 14 }}>
        <VisitsOverTimeChart visitsOverTime={visitsOverTime} visitsFilter={visitsFilter} onFilterChange={setVisitsFilter} />
        <PeakHoursChart peakHours={peakHours} />
        <VisitsByDayChart visitsByDay={visitsByDay} />
      </div>

      {/* ── Row 4: Low Usage + Session Distribution + Other Insights ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <LowUsageCard lowUsage={lowUsage} onViewAll={() => setShowLowUsageModal(true)} />
        <SessionDistributionCard sessionDist={sessionDist} sessionTotal={sessionTotal} />
        <OtherInsightsCard otherInsights={otherInsights} />
      </div>
    </main>
  );
}
