/**
 * features/attendance/hooks/useLiveClock.js
 *
 * Ticking `Date` for clock displays. Extracted from the in-file hook in the
 * former pages/KioskAttendance.jsx.
 */

import { useState, useEffect } from "react";

export function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
