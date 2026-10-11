/**
 * features/attendance/hooks/useAttendanceRecords.js
 *
 * Records + stats + real-time sync for the attendance management page.
 * Extracted from the component body of the former pages/Attendance.jsx:
 * fetchData, the Socket.io sync handlers, and the tap / check-out / delete
 * mutations. The page keeps only the interaction glue (input value, which
 * modal is open, tap-result state).
 */

import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "../../../hooks/useWebsocket";
import {
  getAllAttendance,
  getActiveAttendance,
  getAttendanceStats,
  tapAttendance,
  checkOut,
  deleteAttendance,
} from "../../../services/api/attendanceApi";

export function useAttendanceRecords() {
  const [records, setRecords]     = useState([]);
  const [active, setActive]       = useState([]);
  const [stats, setStats]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tapping, setTapping]     = useState(false);

  // Toast state stays local (no auto-dismiss), matching the original page.
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
  }, []);
  const hideToast = useCallback(() => {
    setToast((p) => ({ ...p, show: false }));
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recRes, actRes, stRes] = await Promise.all([
        getAllAttendance(), getActiveAttendance(), getAttendanceStats(),
      ]);
      if (recRes.success) setRecords(recRes.data || []);
      if (actRes.success) setActive(actRes.data || []);
      if (stRes.success)  setStats(stRes.data);
    } catch {
      showToast("Failed to fetch attendance data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Real-time attendance sync via Socket.io ───────────
  //
  // The server broadcasts "attendance:update" on every tap / check-in /
  // check-out so any open Attendance tab reflects the current state
  // without a manual refresh.
  //
  // Strategy:
  //   checked_in  — prepend to records, prepend to active list.
  //   checked_out — update the matching record in-place (add check_out_time),
  //                 remove from the active list.
  //   deleted     — remove the record by id.
  //
  // Duplicate guard: if the local handler (tap / checkOut) already mutated
  // state optimistically, the WS event carries the same id — the map/filter
  // no-ops harmlessly.
  useWebSocket({
    isAdmin: true,

    onAttendanceUpdate: ({ action, data }) => {
      if (!data?.id) return;

      if (action === "checked_in") {
        setRecords(prev => {
          if (prev.some(r => r.id === data.id)) return prev;
          return [data, ...prev];
        });
        setActive(prev => {
          if (prev.some(r => r.id === data.id)) return prev;
          return [data, ...prev];
        });
        // Bump stats counter live
        setStats(prev => prev ? { ...prev, active: (prev.active || 0) + 1, total: (prev.total || 0) + 1 } : prev);
      }

      if (action === "checked_out") {
        setRecords(prev => prev.map(r => r.id === data.id ? { ...r, ...data } : r));
        setActive(prev => prev.filter(r => r.id !== data.id));
        setStats(prev => prev ? {
          ...prev,
          active:       Math.max(0, (prev.active || 0) - 1),
          checkedOut:   (prev.checkedOut || 0) + 1,
        } : prev);
      }
    },

    onAttendanceDeleted: ({ id }) => {
      if (!id) return;
      setRecords(prev => prev.filter(r => r.id !== id));
      setActive(prev => prev.filter(r => r.id !== id));
    },
  });

  /** Tap a student ID (check in / check out). Returns the API result. */
  const tap = useCallback(async (id) => {
    setTapping(true);
    try {
      return await tapAttendance(id);
    } catch {
      return { success: false, error: "Network error — please try again" };
    } finally {
      setTapping(false);
    }
  }, []);

  const checkOutStudent = useCallback(async (idNumber) => {
    try {
      const res = await checkOut(idNumber);
      if (res.success) { showToast("Student checked out successfully"); fetchData(); }
      else showToast(res.error || "Check-out failed", "error");
    } catch { showToast("Failed to check out student", "error"); }
  }, [showToast, fetchData]);

  const removeRecord = useCallback(async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this attendance record?")) return;
    try {
      const res = await deleteAttendance(id);
      if (res.success) { showToast("Record deleted"); fetchData(); }
      else showToast(res.error || "Failed to delete", "error");
    } catch { showToast("Failed to delete record", "error"); }
  }, [showToast, fetchData]);

  return {
    records, active, stats, isLoading, tapping,
    toast, showToast, hideToast,
    fetchData, tap, checkOutStudent, removeRecord,
  };
}
