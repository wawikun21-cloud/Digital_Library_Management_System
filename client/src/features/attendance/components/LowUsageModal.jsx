/**
 * features/attendance/components/LowUsageModal.jsx
 *
 * Full low/no-usage student list with a status filter and PDF export.
 * Extracted from the former pages/AttendanceDashboard.jsx (was
 * `LowUsageModal`).
 */

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { getAllLowUsageStudents } from "../../../services/api/attendanceApi";
import { C } from "../constants/attendancePalette";
import { exportTablePdf } from "../utils/pdfExport";
import ProgramBadge from "./ProgramBadge";

export default function LowUsageModal({ onClose }) {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterProgram,  setFilterProgram]  = useState("All");
  const [filterYrLevel,  setFilterYrLevel]  = useState("All");
  const [filterSemester, setFilterSemester] = useState("All");

  useEffect(() => {
    getAllLowUsageStudents().then(res => {
      if (res.success) setAllStudents(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleBackdrop = e => { if (e.target === e.currentTarget) onClose(); };

  const downloadPDF = () => {
    const headers = [["#", "Student Name", "Program", "Year Level", "Semester", "Visits", "Total Hours", "Last Visit"]];
    const data = filtered.map((s, i) => [i + 1, s.name, s.program, s.yrLevel, s.semester, s.visits, s.hours, s.last]);

    exportTablePdf({
      title: "Low / No Usage Students",
      headers,
      rows: data,
      fileName: `low-usage-students-${new Date().toISOString().split("T")[0]}.pdf`,
      columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 40 }, 2: { cellWidth: 30 }, 3: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 20 }, 6: { cellWidth: 25 }, 7: { cellWidth: 25 } },
    });
  };

  const programs  = ["All", ...Array.from(new Set(allStudents.map(s => s.program).filter(p => p !== "—"))).sort()];
  const yrLevels  = ["All", ...Array.from(new Set(allStudents.map(s => s.yrLevel).filter(y => y !== "—"))).sort()];
  const semesters = ["All", ...Array.from(new Set(allStudents.map(s => s.semester).filter(x => x !== "—"))).sort()];

  const filtered = allStudents.filter(s => {
    if (filterProgram  !== "All" && s.program  !== filterProgram)  return false;
    if (filterYrLevel  !== "All" && s.yrLevel  !== filterYrLevel)  return false;
    if (filterSemester !== "All" && s.semester !== filterSemester) return false;
    return true;
  });

  const selStyle = { fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 6, cursor: "pointer", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" };

  return (
    <div onClick={handleBackdrop} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg-surface)", borderRadius: 14, border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", width: "100%", maxWidth: 820, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Low / No Usage Students</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{filtered.length} student{filtered.length !== 1 ? "s" : ""} matching filters</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={downloadPDF} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 8, cursor: "pointer", background: C.rose, border: "none", color: "#fff" }}>
              <Download size={13} /> Download PDF
            </button>
            <button onClick={onClose} style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 7px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={14} color="var(--text-secondary)" />
            </button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderBottom: "1px solid var(--border-light)", flexShrink: 0, flexWrap: "wrap" }}>
          {[
            { label: "Program",  value: filterProgram,  onChange: setFilterProgram,  options: programs },
            { label: "Year",     value: filterYrLevel,  onChange: setFilterYrLevel,  options: yrLevels },
            { label: "Semester", value: filterSemester, onChange: setFilterSemester, options: semesters },
          ].map(({ label, value, onChange, options }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</span>
              <select value={value} onChange={e => onChange(e.target.value)} style={selStyle}>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          {(filterProgram !== "All" || filterYrLevel !== "All" || filterSemester !== "All") && (
            <button onClick={() => { setFilterProgram("All"); setFilterYrLevel("All"); setFilterSemester("All"); }}
              style={{ alignSelf: "flex-end", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid rgba(239,68,68,.25)", background: "rgba(239,68,68,.06)", color: "#ef4444" }}>
              Reset
            </button>
          )}
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No students match the selected filters.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 1 }}>
                <tr>
                  {["#", "Student Name", "Course / Program", "Year Level", "Semester", "Visits", "Total Hours", "Last Visit"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px", padding: "10px 10px 10px 0", paddingLeft: h === "#" ? 20 : 0, borderBottom: "1px solid var(--border-light)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "9px 10px 9px 20px", color: "var(--text-muted)", fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: "9px 10px 9px 0", fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                    <td style={{ padding: "9px 10px 9px 0" }}><ProgramBadge prog={s.program} /></td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)", fontSize: 12 }}>{s.yrLevel}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)", fontSize: 12 }}>{s.semester}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: s.visits === 0 ? C.rose : "var(--text-secondary)", fontWeight: 700 }}>{s.visits}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)" }}>{s.hours}</td>
                    <td style={{ padding: "9px 0", color: "var(--text-muted)", fontSize: 11 }}>{s.last}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
