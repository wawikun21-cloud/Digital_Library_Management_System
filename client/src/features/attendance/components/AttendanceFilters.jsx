/**
 * features/attendance/components/AttendanceFilters.jsx
 *
 * History filter row (search / course / date / status). Extracted from the
 * former pages/Attendance.jsx (the `FilterField` wrapper and its four
 * inputs now live here as one controlled component).
 */

import { User, GraduationCap, Calendar, Filter, ChevronDown } from "lucide-react";

const filterInputCls = "pl-8 pr-3 py-2 rounded-lg text-[12.5px] border outline-none transition-all focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400";
const filterInputStyle = {
  background: "var(--bg-input)",
  borderColor: "var(--border)",
  color: "var(--text-primary)",
};

function FilterField({ icon: Icon, children }) {
  return (
    <div className="relative flex items-center">
      <Icon size={13} className="absolute left-2.5 z-10 pointer-events-none"
        style={{ color: "var(--text-muted)" }} />
      {children}
    </div>
  );
}

export default function AttendanceFilters({
  search, onSearch, courses, course, onCourse, date, onDate, status, onStatus,
}) {
  return (
    <div className="flex flex-wrap gap-2.5 p-5"
      style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-subtle)" }}>
      <FilterField icon={User}>
        <input
          type="text" placeholder="Search Name or ID…" value={search}
          onChange={(e) => onSearch(e.target.value)}
          className={`${filterInputCls} pr-8`}
          style={{ ...filterInputStyle, minWidth: 220 }}
        />
      </FilterField>
      <FilterField icon={GraduationCap}>
        <select
          value={course} onChange={(e) => onCourse(e.target.value)}
          className={filterInputCls + " pr-7 appearance-none cursor-pointer"}
          style={{ ...filterInputStyle, minWidth: 150 }}
        >
          <option value="">All Courses</option>
          {courses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-2.5 pointer-events-none"
          style={{ color: "var(--text-muted)" }} />
      </FilterField>
      <FilterField icon={Calendar}>
        <input
          type="date" value={date}
          onChange={(e) => onDate(e.target.value)}
          className={filterInputCls + " cursor-pointer"}
          style={{ ...filterInputStyle, minWidth: 160 }}
        />
      </FilterField>
      <FilterField icon={Filter}>
        <select
          value={status} onChange={(e) => onStatus(e.target.value)}
          className={filterInputCls + " pr-7 appearance-none cursor-pointer"}
          style={{ ...filterInputStyle, minWidth: 140 }}
        >
          <option value="all">All Status</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
        </select>
        <ChevronDown size={12} className="absolute right-2.5 pointer-events-none"
          style={{ color: "var(--text-muted)" }} />
      </FilterField>
    </div>
  );
}
