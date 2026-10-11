/**
 * features/attendance/utils/attendanceTableData.js
 *
 * Pure derivations for the records table: grouping flat attendance records
 * by student and sorting the groups. Extracted from the component body of
 * the former components/AttendanceTable.jsx.
 */

/** Groups flat records by student; sessions sorted newest-first. */
export function groupByStudent(records) {
  const map = new Map();
  for (const r of records) {
    const key = r.student_id_number;
    if (!map.has(key)) {
      map.set(key, {
        student_id_number: r.student_id_number,
        student_name:      r.student_name,
        first_name:        r.first_name  || '',
        last_name:         r.last_name   || '',
        student_course:    r.student_course,
        student_yr_level:  r.student_yr_level,
        sessions: [],
      });
    }
    map.get(key).sessions.push(r);
  }
  for (const student of map.values()) {
    student.sessions.sort(
      (a, b) => new Date(b.check_in_time) - new Date(a.check_in_time)
    );
  }
  return [...map.values()].sort(
    (a, b) =>
      new Date(b.sessions[0].check_in_time) -
      new Date(a.sessions[0].check_in_time)
  );
}

/** Sort direction toggle used by the column headers. */
export function nextSortConfig(prev, key) {
  return {
    key,
    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
  };
}

/** Sorts grouped students by `key` ("student_name" | "visits" | "total_duration" | "latest"). */
export function sortGroups(grouped, sortConfig) {
  const arr = [...grouped];
  arr.sort((a, b) => {
    let aVal, bVal;
    switch (sortConfig.key) {
      case 'student_name':
        aVal = a.student_name?.toLowerCase() ?? '';
        bVal = b.student_name?.toLowerCase() ?? '';
        break;
      case 'visits':
        aVal = a.sessions.length;
        bVal = b.sessions.length;
        break;
      case 'total_duration':
        aVal = a.sessions.reduce((s, r) => s + (r.duration || 0), 0);
        bVal = b.sessions.reduce((s, r) => s + (r.duration || 0), 0);
        break;
      case 'latest':
      default:
        aVal = new Date(a.sessions[0]?.check_in_time ?? 0);
        bVal = new Date(b.sessions[0]?.check_in_time ?? 0);
        break;
    }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
  return arr;
}
