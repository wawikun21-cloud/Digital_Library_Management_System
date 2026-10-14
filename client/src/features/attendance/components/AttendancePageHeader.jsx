/**
 * features/attendance/components/AttendancePageHeader.jsx
 *
 * Page header with the Register RFID / Kiosk View / Download PDF actions.
 * Extracted from the former pages/Attendance.jsx.
 */

import { CreditCard, Monitor, Download } from "lucide-react";

export default function AttendancePageHeader({ onRegisterRfid, onKioskView, onDownloadPdf }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="flex items-center gap-2.5 text-[22px] font-bold"
          style={{ color: "var(--text-primary)" }}>
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">

        {/* Register RFID Button */}
        <button
          onClick={onRegisterRfid}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[.98]"
          style={{
            background: "rgba(45,122,71,0.1)",
            border: "1.5px solid rgba(45, 53, 122, 0.35)",
            color: "var(--text-primary)",
          }}
        >
          <CreditCard size={14} />
          Register RFID
        </button>

        {/* Kiosk View */}
        <button
          onClick={onKioskView}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors"
          style={{
            background: "var(--bg-surface)",
            border: "1.5px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <Monitor size={14} style={{ color: "var(--accent-amber)" }} />
          Kiosk View
        </button>

        {/* Download PDF */}
        <button
          onClick={onDownloadPdf}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors"
          style={{ background: "var(--accent-amber)", boxShadow: "0 2px 8px rgba(238,162,58,.3)" }}
        >
          <Download size={14} /> Download PDF
        </button>
      </div>
    </div>
  );
}
