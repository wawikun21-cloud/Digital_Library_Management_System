/**
 * features/attendance/hooks/useStudentLookup.js
 *
 * Debounced student lookup for the check-in input. Extracted from the
 * component body of the former pages/Attendance.jsx.
 */

import { useState, useEffect, useCallback } from "react";
import useDebounce from "../../../hooks/useDebounce";
import { getStudentByStudentIdNumber } from "../../../services/api/studentsApi";

export function useStudentLookup() {
  const [idInput, setIdInput]         = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [lookingUp, setLookingUp]     = useState(false);

  const debouncedId = useDebounce(idInput, 400);

  useEffect(() => {
    if (!debouncedId?.trim()) { setStudentInfo(null); return; }
    let cancelled = false;
    setLookingUp(true);
    getStudentByStudentIdNumber(debouncedId.trim())
      .then((res) => { if (!cancelled) setStudentInfo(res.success ? res.data : null); })
      .catch(() => { if (!cancelled) setStudentInfo(null); })
      .finally(() => { if (!cancelled) setLookingUp(false); });
    return () => { cancelled = true; };
  }, [debouncedId]);

  const clearStudent = useCallback(() => setStudentInfo(null), []);

  return { idInput, setIdInput, studentInfo, lookingUp, clearStudent };
}
