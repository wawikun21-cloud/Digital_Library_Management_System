/**
 * features/transactions/components/BorrowerSearchPanel.jsx
 *
 * Borrower-type toggle + search with results dropdown + selected-borrower
 * card. Extracted from the borrow modal of the former pages/Borrowed.jsx.
 */

import { Search, User, UserCheck, Loader2, X } from "lucide-react";
import { borrowerDisplayName, borrowerInitial, borrowerSubline } from "../utils/borrowerDisplay";
import FieldLabel from "./FieldLabel";

export default function BorrowerSearchPanel({ borrowForm }) {
  const {
    form, errors, setBorrowerType,
    borrowerQuery, setBorrowerQuery, borrowerResults, borrowerLoading, borrowerSelected,
    selectBorrower, clearBorrower,
  } = borrowForm;

  const isStudent = form.borrower_type === "student";

  return (
    <>
      {/* ── Borrower type toggle ── */}
      <div className="flex gap-2">
        {["student","faculty"].map(type => (
          <button
            key={type}
            onClick={() => setBorrowerType(type)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold border-2 transition-colors"
            style={{
              background:   form.borrower_type === type ? "rgba(238,162,58,0.12)" : "var(--bg-main)",
              borderColor:  form.borrower_type === type ? "var(--accent-amber)"   : "var(--border)",
              color:        form.borrower_type === type ? "var(--accent-amber)"   : "var(--text-secondary)",
            }}
          >
            {type === "student" ? <User size={14} /> : <UserCheck size={14} />}
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Borrower search ── */}
      <div className="flex flex-col gap-1">
        <FieldLabel label={isStudent ? "Student ID Number" : "Faculty Name"} required />
        <div className="relative">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3" style={{ color: "var(--text-muted)" }} />
            <input
              value={borrowerQuery}
              onChange={e => { setBorrowerQuery(e.target.value); setBorrowerSelected(false); }}
              placeholder={isStudent ? "Type student ID or name…" : "Type faculty name…"}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-[13px] border outline-none"
              style={{
                background:   "var(--bg-main)",
                borderColor:  errors.borrower ? "#EA8B33" : "var(--border)",
                color:        "var(--text-primary)",
              }}
            />
            {borrowerLoading && <Loader2 size={13} className="absolute right-3 animate-spin" style={{ color: "var(--text-muted)" }} />}
          </div>

          {/* ── Dropdown results ── */}
          {borrowerResults.length > 0 && !borrowerSelected && (
            <div
              className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-lg"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              {/* Header hint */}
              <div className="px-3 py-1.5 border-b" style={{ borderColor: "var(--border-light)", background: "var(--bg-main)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {borrowerResults.length} result{borrowerResults.length > 1 ? "s" : ""} — click to select
                </p>
              </div>

              {borrowerResults.map((p, i) => (
                <button
                  key={i}
                  onClick={() => selectBorrower(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                  style={{ borderBottom: i < borrowerResults.length - 1 ? "1px solid var(--border-light)" : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(238,162,58,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Avatar circle */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                    style={{ background: "rgba(50,102,127,0.12)", color: "#32667F" }}
                  >
                    {borrowerInitial(p, form.borrower_type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {borrowerDisplayName(p, form.borrower_type) || "—"}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                      {borrowerSubline(p, form.borrower_type)}
                    </p>
                  </div>

                  {/* ID badge */}
                  {isStudent && p.student_id_number && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded shrink-0"
                      style={{ background: "rgba(50,102,127,0.1)", color: "#32667F" }}
                    >
                      {p.student_id_number}
                    </span>
                  )}
                  {!isStudent && p.department && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded shrink-0"
                      style={{ background: "rgba(50,102,127,0.1)", color: "#32667F" }}
                    >
                      {p.department}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* No results hint */}
          {!borrowerLoading && borrowerQuery.trim().length >= 2 && borrowerResults.length === 0 && !borrowerSelected && (
            <div
              className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg px-3 py-3 text-center"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                No {isStudent ? "student" : "faculty"} found
              </p>
            </div>
          )}
        </div>
        {errors.borrower && <p className="text-[11px] text-orange-500">{errors.borrower}</p>}
      </div>

      {/* ── Selected borrower card ── */}
      {form.borrower_name && (
        <div className="p-3 rounded-lg flex items-center gap-3"
          style={{ background: "rgba(238,162,58,0.08)", border: "1px solid rgba(238,162,58,0.25)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(238,162,58,0.2)" }}>
            {isStudent
              ? <User size={14} style={{ color: "var(--accent-amber)" }} />
              : <UserCheck size={14} style={{ color: "var(--accent-amber)" }} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{form.borrower_name}</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {[
                form.borrower_id_number && `ID: ${form.borrower_id_number}`,
                form.borrower_course,
                form.borrower_yr_level,
              ].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            onClick={clearBorrower}
            className="ml-auto shrink-0"
            style={{ color: "var(--text-muted)" }}
            title="Clear selection"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
