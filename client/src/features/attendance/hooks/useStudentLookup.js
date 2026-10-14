/**
 * features/attendance/hooks/useStudentLookup.js
 *
 * Debounced student-user lookup for the quick check-in panel.
 * Students are users (role='student'), so the lookup goes through the
 * students feature's public API — the endpoint is school-scoped
 * server-side, and an out-of-scope student simply never appears.
 * The exact-ID match wins over name matches so the panel shows the
 * student the operator typed.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { searchStudents } from "../../students";

export function useStudentLookup({ debounceMs = 400 } = {}) {
  const [idInput,   setIdInput]   = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [lookingUp,  setLookingUp]  = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const lookupStudentById = useCallback((idNumber) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = (idNumber || "").trim();
    if (!trimmed) {
      setLookingUp(false);
      setStudentInfo(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLookingUp(true);
      try {
        const data = await searchStudents(trimmed);
        const results = data.success ? data.data || [] : [];
        const exact = results.find((s) => String(s.student_id_number) === trimmed) || results[0] || null;
        setStudentInfo(exact);
      } catch {
        setStudentInfo(null);
      } finally {
        setLookingUp(false);
      }
    }, debounceMs);
  }, [debounceMs]);

  const clearStudent = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStudentInfo(null);
    setLookingUp(false);
  }, []);

  return { idInput, setIdInput, studentInfo, lookingUp, lookupStudentById, clearStudent };
}
