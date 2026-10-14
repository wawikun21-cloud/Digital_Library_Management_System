/**
 * features/attendance/pages/AttendancePage.jsx
 *
 * Attendance Management — composition only.
 *
 * Data lives in useAttendanceRecords (records, stats, real-time sync,
 * mutations) and useStudentLookup (debounced ID lookup); filters live in
 * useAttendanceFilters; this page holds only the tap-result state and which
 * modal is open. Replaces the former pages/Attendance.jsx.
 */

import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, X } from "lucide-react";
import Pagination from "../../../components/books/Pagination";
import Toast from "../../../components/Toast";
import { useAttendanceRecords } from "../hooks/useAttendanceRecords";
import { useStudentLookup } from "../hooks/useStudentLookup";
import { useAttendanceFilters } from "../hooks/useAttendanceFilters";
import { downloadGeneralPDF } from "../utils/attendancePdf";
import ModalAnimations from "../../../components/ui/ModalAnimations";
import AttendancePageHeader from "../components/AttendancePageHeader";
import AttendanceStatsCards from "../components/AttendanceStatsCards";
import CheckInPanel from "../components/CheckInPanel";
import ActiveStudentsTable from "../components/ActiveStudentsTable";
import AttendanceFilters from "../components/AttendanceFilters";
import AttendanceTable from "../components/AttendanceTable";
import StudentNotFoundModal from "../components/StudentNotFoundModal";
import RfidRegistrationModal from "../components/RfidRegistrationModal";

export default function AttendancePage() {
  const navigate = useNavigate();

  const {
    records, active, stats, isLoading, tapping,
    toast, showToast, hideToast,
    fetchData, tap, checkOutStudent, removeRecord,
  } = useAttendanceRecords();
  const { idInput, setIdInput, studentInfo, lookingUp, lookupStudentById, clearStudent } = useStudentLookup();
  const filters = useAttendanceFilters(records);

  // Debounced lookup as the operator types (out-of-scope students are
  // invisible server-side, so a miss is simply "not found").
  const handleIdChange = useCallback((value) => {
    setIdInput(value);
    lookupStudentById(value);
  }, [setIdInput, lookupStudentById]);

  const [tapResult,            setTapResult]            = useState(null);
  const [notFoundStudentId,    setNotFoundStudentId]    = useState(null);
  const [showRfidRegistration, setShowRfidRegistration] = useState(false);
  const inputRef = useRef(null);

  const handleTap = useCallback(async (e) => {
    e?.preventDefault();
    const id = idInput.trim();
    if (!id) return;
    const res = await tap(id);
    if (res.success) {
      setTapResult(res);
      setIdInput("");
      clearStudent();
      fetchData();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (res.error?.toLowerCase().includes("not found")) {
      setNotFoundStudentId(id);
      setIdInput("");
    } else {
      showToast(res.error || "Action failed", "error");
    }
  }, [idInput, tap, fetchData, clearStudent, showToast]);

  const handleRfidRegistered = useCallback(() => {
    setShowRfidRegistration(false);
  }, []);

  return (
    <div className="flex flex-col gap-5">

      <AttendancePageHeader
        onRegisterRfid={() => setShowRfidRegistration(true)}
        onKioskView={() => navigate("/dashboard/attendance/kiosk")}
        onDownloadPdf={() => downloadGeneralPDF(filters.filtered)}
      />

      {/* ── Stats Cards ──────────────────────────────── */}
      <AttendanceStatsCards stats={stats} />

      {/* ── Check-In / Tap Form ──────────────────────── */}
      <CheckInPanel
        idInput={idInput}
        onIdChange={handleIdChange}
        onSubmit={handleTap}
        tapping={tapping}
        lookingUp={lookingUp}
        studentInfo={studentInfo}
        tapResult={tapResult}
        onDismissTap={() => setTapResult(null)}
        inputRef={inputRef}
      />

      {/* ── Currently Active Students ────────────────── */}
      <ActiveStudentsTable active={active} onCheckOut={checkOutStudent} />

      {/* ── Attendance History ────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
          style={{ borderBottom: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: "var(--accent-amber)" }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Attendance History
            </span>
            {filters.hasFilters && (
              <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                — {filters.filtered.length} of {records.length} records
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {filters.hasFilters && (
              <button
                onClick={filters.clearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >
                <X size={12} /> Clear Filters
              </button>
            )}
          </div>
        </div>

        <AttendanceFilters
          search={filters.search}
          onSearch={filters.onSearch}
          courses={filters.courses}
          course={filters.course}
          onCourse={filters.onCourse}
          date={filters.date}
          onDate={filters.onDate}
          status={filters.status}
          onStatus={filters.onStatus}
        />

        <AttendanceTable
          data={filters.paginated}
          loading={isLoading}
          hasFilters={filters.hasFilters}
          totalRecords={records.length}
          onClearFilters={filters.clearFilters}
          onDelete={removeRecord}
        />
        {(filters.hasFilters || filters.filtered.length > filters.pageSize) && (
          <div className="flex justify-end mt-4">
            <Pagination
              currentPage={filters.currentPage}
              totalPages={Math.max(1, Math.ceil(filters.filtered.length / filters.pageSize))}
              setCurrentPage={filters.setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────── */}
      {notFoundStudentId && (
        <StudentNotFoundModal
          studentId={notFoundStudentId}
          onClose={() => {
            setNotFoundStudentId(null);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        />
      )}

      {showRfidRegistration && (
        <RfidRegistrationModal
          onClose={() => setShowRfidRegistration(false)}
          onRegistered={handleRfidRegistered}
          onToast={showToast}
        />
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.show}
          onClose={hideToast}
        />
      )}

      <ModalAnimations />
    </div>
  );
}
