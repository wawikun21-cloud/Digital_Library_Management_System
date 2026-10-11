/**
 * features/attendance/hooks/useElapsed.js
 *
 * Elapsed seconds since a timestamp. Derives the base timestamp into a ref
 * so the interval always reads the latest parsed value without needing to
 * restart the effect when checkInTime changes after a poll refresh.
 * Extracted from the in-file hook in the former pages/KioskAttendance.jsx.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { parseTimestamp } from "../utils/kioskFormat";

export function useElapsed(checkInTime) {
  const checkInMsRef = useRef(parseTimestamp(checkInTime).getTime());

  useEffect(() => {
    checkInMsRef.current = parseTimestamp(checkInTime).getTime();
  }, [checkInTime]);

  const calcElapsed = useCallback(
    () => Math.max(0, Math.floor((Date.now() - checkInMsRef.current) / 1000)),
    []
  );

  const [elapsed, setElapsed] = useState(calcElapsed);

  useEffect(() => {
    setElapsed(calcElapsed());
    const t = setInterval(() => setElapsed(calcElapsed()), 1000);
    return () => clearInterval(t);
  }, [checkInTime, calcElapsed]);

  return elapsed;
}
