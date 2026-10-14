/**
 * features/attendance/components/RfidStudentSearch.jsx
 *
 * Step 2 of the RFID registration modal: debounced student search with a
 * results dropdown and a selected-student card. Owns its own student list
 * fetch, search state and outside-click handling. Extracted from the
 * former pages/Attendance.jsx (RfidRegistrationModal's search section).
 */

import { useState, useEffect, useRef } from "react";
import { Search, X, CheckCircle2, Loader2 } from "lucide-react";
import useDebounce from "../../../hooks/useDebounce";
import { getAllStudents } from "../../students";
import Avatar from "./Avatar";
import { getFullName } from "../utils/studentName";

export default function RfidStudentSearch({ value, onChange, selectedStudent, onSelectStudent }) {
  const [allStudents,     setAllStudents]     = useState([]);
  const [searchResults,   setSearchResults]   = useState([]);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const searchRef   = useRef(null);
  const dropdownRef = useRef(null);
  const debouncedStudentId = useDebounce(value, 250);

  useEffect(() => {
    setLoadingStudents(true);
    getAllStudents()
      .then((res) => { if (res.success) setAllStudents(res.data || []); })
      .finally(() => setLoadingStudents(false));
  }, []);

  useEffect(() => {
    if (!debouncedStudentId.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const q = debouncedStudentId.toLowerCase();
    const results = allStudents.filter((s) =>
      s.student_id_number?.toLowerCase().includes(q) ||
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q) ||
      s.student_name?.toLowerCase().includes(q)
    ).slice(0, 8);
    setSearchResults(results);
    setShowDropdown(results.length > 0);
  }, [debouncedStudentId, allStudents]);

  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        searchRef.current && !searchRef.current.contains(e.target)
      ) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fullName = selectedStudent
    ? (selectedStudent.display_name ||
       [selectedStudent.first_name, selectedStudent.last_name].filter(Boolean).join(" ") ||
       selectedStudent.student_name || "")
    : "";

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ background: selectedStudent ? "#130b7e" : "var(--accent-amber)" }}
        >
          {selectedStudent ? <CheckCircle2 size={12} /> : "2"}
        </span>
        <label className="text-[12.5px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Search Student
          <span className="ml-1" style={{ color: "#dc2626" }}>*</span>
        </label>
        {loadingStudents && (
          <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={11} className="animate-spin" /> Loading…
          </span>
        )}
      </div>

      <div className="relative" ref={searchRef}>
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{ color: selectedStudent ? "#2d7a47" : "var(--text-muted)" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
          placeholder="Type Student ID or name to search…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none transition-all"
          style={{
            background: selectedStudent ? "rgba(45,122,71,0.05)" : "var(--bg-input)",
            border: `1.5px solid ${selectedStudent ? "rgba(45,122,71,0.45)" : "var(--border)"}`,
            color: "var(--text-primary)",
            boxShadow: selectedStudent ? "0 0 0 3px rgba(45,122,71,0.08)" : "none",
          }}
        />

        {/* Dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-1.5 rounded-xl overflow-hidden z-50"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {searchResults.map((student, idx) => {
              const name = student.display_name ||
                [student.first_name, student.last_name].filter(Boolean).join(" ") ||
                student.student_name || student.full_name;
              return (
                <button
                  key={student.student_id_number || student.id}
                  onClick={() => onSelectStudent(student)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  style={{
                    borderBottom: idx < searchResults.length - 1 ? "1px solid var(--border-light)" : "none",
                  }}
                >
                  <Avatar name={name} size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {name}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {student.student_id_number}
                      </span>
                      {student.student_course && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(50,102,127,.1)", color: "#32667F" }}>
                          {student.student_course}
                        </span>
                      )}
                      {student.student_yr_level && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(124,58,237,.1)", color: "#7c3aed" }}>
                          {student.student_yr_level}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Student Card */}
      {selectedStudent && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: "1.5px solid rgba(45,122,71,0.3)",
            background: "linear-gradient(135deg, rgba(45,122,71,0.05), rgba(45,122,71,0.02))",
            animation: "modalIn .18s ease",
          }}
        >
          <div className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: "1px solid rgba(45,122,71,0.12)" }}>
            <Avatar name={fullName} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold truncate" style={{ color: "var(--text-primary)" }}>
                {fullName}
              </p>
              <p className="font-mono text-[12px] mt-0.5" style={{ color: "var(--text-primary)" }}>
                {selectedStudent.student_id_number}
              </p>
            </div>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(45,122,71,0.15)" }}
            >
              <CheckCircle2 size={15} style={{ color: "var(--text-primary)" }} />
            </div>
          </div>
          <div className="grid grid-cols-2"
            style={{ background: "rgba(45,122,71,0.03)" }}>
            {[
              { label: "First Name",  value: selectedStudent.first_name || fullName.split(" ")[0] || "—" },
              { label: "Last Name",   value: selectedStudent.last_name || fullName.split(" ").slice(1).join(" ") || "—" },
              { label: "Course",      value: selectedStudent.student_course    || "—" },
              { label: "Year Level",  value: selectedStudent.student_yr_level  || "—" },
            ].map(({ label, value }, i) => (
              <div
                key={label}
                className="px-4 py-2.5"
                style={{
                  borderRight: i % 2 === 0 ? "1px solid rgba(45,122,71,0.1)" : "none",
                  borderBottom: i < 2 ? "1px solid rgba(45,122,71,0.1)" : "none",
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5"
                  style={{ color: "var(--text-primary)" }}>
                  {label}
                </p>
                <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
