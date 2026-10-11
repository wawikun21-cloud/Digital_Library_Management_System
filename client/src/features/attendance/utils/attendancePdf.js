/**
 * features/attendance/utils/attendancePdf.js
 *
 * Attendance PDF reports (print-to-window, not a file download).
 * The three report builders were previously split across
 * pages/Attendance.jsx (two) and components/AttendanceTable.jsx (one);
 * only the window boilerplate was duplicated. Templates are unchanged.
 */

import { fmtDateTime, fmtDate, fmtDuration } from "./attendanceDateTime";
import { getFullName } from "./studentName";

const escapeHtml = (v) =>
  String(v ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Shared print boilerplate (was duplicated in all three builders).
function openPrintWindow(html) {
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow pop-ups to download PDF."); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

/** Generic tabular report (general attendance list). */
export function printTableReport({ title, subtitle, columns, rows, footer }) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:32px}
.hdr{border-bottom:2px solid #EEA23A;padding-bottom:12px;margin-bottom:20px}
.hdr h1{font-size:18px;font-weight:700;color:#132F45}
.hdr p{font-size:11px;color:#666;margin-top:3px}
table{width:100%;border-collapse:collapse}
th{background:#132F45;color:#fff;padding:8px 10px;text-align:left;font-size:10px;letter-spacing:.5px;text-transform:uppercase}
td{padding:7px 10px;border-bottom:1px solid #eee;font-size:11.5px}
tr:nth-child(even) td{background:#f8f9fa}
.ftr{margin-top:16px;font-size:10px;color:#999;text-align:right}
@media print{body{padding:12px}}
</style></head><body>
<div class="hdr"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>
<table>
<thead><tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody>
</table>
<div class="ftr">${escapeHtml(footer)}</div>
</body></html>`;
  openPrintWindow(html);
}

/** Library Attendance Report (all filtered records). */
export function downloadGeneralPDF(records) {
  printTableReport({
    title: "Library Attendance Report",
    subtitle: `Generated: ${new Date().toLocaleString("en-US")} · Total records: ${records.length}`,
    columns: ["#", "Student Name", "ID Number", "Course", "Year Level", "School Year", "Check In", "Check Out", "Duration", "Status"],
    rows: records.map((r, i) => [
      i + 1, r.student_name, r.student_id_number,
      r.student_course || "—", r.student_yr_level || "—", r.school_year || "—",
      fmtDateTime(r.check_in_time),
      r.check_out_time ? fmtDateTime(r.check_out_time) : "—",
      r.status === "checked_in" ? "Still Inside" : fmtDuration(r.duration),
      r.status === "checked_in" ? "Checked In" : "Checked Out",
    ]),
    footer: `Lexora Digital Library Management System · ${new Date().toLocaleDateString()}`,
  });
}

/** Attendance History — one student (from the history modal). */
export function downloadIndividualPDF(person, history) {
  printTableReport({
    title: `Attendance History — ${person.student_name}`,
    subtitle: `ID: ${person.student_id_number} · ${[person.student_course, person.student_yr_level, person.school_year ? `SY ${person.school_year}` : ""].filter(Boolean).join(" · ")} · Visits: ${history.length}`,
    columns: ["#", "Date", "Check In", "Check Out", "Duration", "Status"],
    rows: history.map((r, i) => [
      i + 1, fmtDate(r.check_in_time),
      fmtDateTime(r.check_in_time),
      r.check_out_time ? fmtDateTime(r.check_out_time) : "—",
      r.status === "checked_in" ? "Still Inside" : fmtDuration(r.duration),
      r.status === "checked_in" ? "Checked In" : "Checked Out",
    ]),
    footer: `Lexora Digital Library Management System · ${new Date().toLocaleDateString()}`,
  });
}

/** Attendance History — one student (from the records table modal). */
export function printStudentPDF(student, sessions) {
  const fullName   = getFullName(student);
  const totalMins  = sessions.reduce((a, r) => a + (r.duration || 0), 0);
  const totalHours = (totalMins / 60).toFixed(1);

  const rows = sessions
    .map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(fmtDate(r.check_in_time))}</td>
        <td>${escapeHtml(fmtDateTime(r.check_in_time))}</td>
        <td>${r.check_out_time ? escapeHtml(fmtDateTime(r.check_out_time)) : '—'}</td>
        <td>${r.status === 'checked_in' ? 'Still Inside' : escapeHtml(fmtDuration(r.duration))}</td>
        <td>${r.status === 'checked_in' ? 'Checked In' : 'Checked Out'}</td>
      </tr>`)
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Attendance — ${escapeHtml(fullName)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:32px}
.hdr{border-bottom:3px solid #EEA23A;padding-bottom:14px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-end}
.hdr-left h1{font-size:20px;font-weight:700;color:#132F45}
.hdr-left p{font-size:11px;color:#666;margin-top:4px}
.hdr-right{text-align:right;font-size:11px;color:#888}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px}
.stat{background:#f8f9fa;border:1px solid #eee;border-radius:8px;padding:12px 16px}
.stat-val{font-size:22px;font-weight:700;color:#132F45}
.stat-lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
table{width:100%;border-collapse:collapse}
th{background:#132F45;color:#fff;padding:9px 12px;text-align:left;font-size:10px;letter-spacing:.5px;text-transform:uppercase}
td{padding:8px 12px;border-bottom:1px solid #eee;font-size:11.5px}
tr:nth-child(even) td{background:#f8f9fa}
.ftr{margin-top:18px;font-size:10px;color:#aaa;text-align:right}
@media print{body{padding:16px}}
</style></head><body>
<div class="hdr">
  <div class="hdr-left">
    <h1>Attendance History — ${escapeHtml(fullName)}</h1>
    <p>${escapeHtml(student.student_id_number)} · ${escapeHtml(student.student_course || '—')} · ${escapeHtml(student.student_yr_level || '—')}</p>
  </div>
  <div class="hdr-right">
    Generated: ${new Date().toLocaleString('en-US')}<br/>
    Lexora Library Management System
  </div>
</div>
<div class="stats">
  <div class="stat"><div class="stat-val">${sessions.length}</div><div class="stat-lbl">Total Visits</div></div>
  <div class="stat"><div class="stat-val">${totalHours}h</div><div class="stat-lbl">Total Hours</div></div>
  <div class="stat"><div class="stat-val">${sessions.filter(s => s.status === 'checked_out').length}</div><div class="stat-lbl">Completed Sessions</div></div>
</div>
<table>
  <thead><tr><th>#</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Duration</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="ftr">Lexora Digital Library Management System · ${new Date().toLocaleDateString()}</div>
</body></html>`;
  openPrintWindow(html);
}
