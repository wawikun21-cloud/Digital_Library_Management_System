/**
 * features/attendance/components/LiveTimer.jsx
 *
 * Ticking elapsed-time display for checked-in students. Unified from the
 * two previous in-file copies (page `LiveDuration` and table `LiveTimer`);
 * uses the page's parseAsUTC + non-negative guard, which is the more
 * correct of the two.
 */

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { pad, parseAsUTC } from "../utils/attendanceDateTime";

export default function LiveTimer({ checkInTime }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - parseAsUTC(checkInTime).getTime()) / 1000))
  );
  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - parseAsUTC(checkInTime).getTime()) / 1000))),
      1000
    );
    return () => clearInterval(t);
  }, [checkInTime]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[13px] font-semibold"
      style={{ color: "var(--accent-amber)" }}>
      <Clock size={13} className="animate-pulse" />
      {h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`}
    </span>
  );
}
