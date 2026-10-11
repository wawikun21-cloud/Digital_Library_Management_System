/**
 * features/landing/components/CopyStatusPill.jsx
 *
 * Status pill for physical copies. Extracted from the in-file `StatusPill`
 * of the former landing/landingpage.jsx.
 */

import { COPY_STATUS_CONFIG } from "../utils/bookDisplay";

export default function CopyStatusPill({ status }) {
  const c = COPY_STATUS_CONFIG[status] || COPY_STATUS_CONFIG.Available;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
          style={{ background: c.bg, color: c.color, border: `1px solid ${c.dot}40` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {status || "Available"}
    </span>
  );
}
