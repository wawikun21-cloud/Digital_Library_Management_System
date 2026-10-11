/**
 * features/attendance/components/KpiRow.jsx
 *
 * Six KPI cards for the attendance dashboard. Values come from the pure
 * utils/attendanceKpi helpers. Extracted from the KPI JSX of the former
 * pages/AttendanceDashboard.jsx.
 */

import { Users, Clock, Timer, TrendingUp, GraduationCap, UserCheck } from "lucide-react";
import KpiCard from "../../../components/ui/KpiCard";
import { C } from "../constants/attendancePalette";
import { formatKpiValues, countFilteredActive, buildOccupancy } from "../utils/attendanceKpi";

export default function KpiRow({ kpi, activeAttendance, globalFilter }) {
  const values = formatKpiValues(kpi);
  const { occupancyValue, occupancySub } = buildOccupancy(countFilteredActive(activeAttendance, globalFilter));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
      <KpiCard icon={Users}       iconBg="rgba(50,102,127,.13)"  iconColor={C.teal}   label="Total Visits"        value={values.totalVisits} />
      <KpiCard icon={Clock}       iconBg="rgba(99,102,241,.13)"  iconColor={C.indigo} label="Total Hours Logged"   value={values.totalHours} />
      <KpiCard icon={Timer}       iconBg="rgba(238,162,58,.13)"  iconColor={C.amber}  label="Avg Session Duration" value={values.avgDuration} />
      <KpiCard icon={TrendingUp}  iconBg="rgba(34,197,94,.13)"   iconColor={C.green}  label="Peak Hour"            value={values.peakHourLabel} sub={values.peakHourSub} />
      <KpiCard icon={GraduationCap} iconBg="rgba(168,85,247,.13)" iconColor={C.purple} label="Most Active Program" value={values.mostActiveProgram} sub={values.mostActiveSub} />
      <KpiCard icon={UserCheck}   iconBg="rgba(45,212,191,.13)"  iconColor={C.mint}   label="Current Occupancy"   value={occupancyValue}       sub={occupancySub} />
    </div>
  );
}
