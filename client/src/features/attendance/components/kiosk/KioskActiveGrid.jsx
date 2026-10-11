/**
 * features/attendance/components/kiosk/KioskActiveGrid.jsx
 *
 * "Currently In Library" grid with the empty state. Extracted from the
 * former pages/KioskAttendance.jsx.
 */

import { CheckCircle2, Users } from "lucide-react";
import KioskStudentCard from "./KioskStudentCard";
import { GREEN, MUTED, MUTED_FAINT, SURFACE } from "../../constants/kioskTheme";

export default function KioskActiveGrid({ active }) {
  return (
    <main style={{
      position: "relative", zIndex: 10,
      flex: 1, display: "flex",
      overflow: "hidden",
    }}>
      <div style={{
        flex: 1, overflow: "hidden",
        display: "flex", flexDirection: "column",
        padding: "26px 32px",
        gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <CheckCircle2 size={16} color={GREEN} />
          <span style={{
            fontSize: 13, fontWeight: 700, color: MUTED,
            letterSpacing: "0.5px", textTransform: "uppercase",
          }}>
            Currently In Library
          </span>
          <span style={{
            fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
            background: "#eef6f0", color: GREEN,
          }}>
            {active.length}
          </span>
        </div>

        <div style={{
          flex: 1, overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 10,
          alignContent: "start",
          paddingBottom: 120,
        }}>
          {active.length === 0 ? (
            <div style={{
              gridColumn: "1 / -1",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 12, padding: "80px 0",
            }}>
              <div style={{
                width: 68, height: 68, borderRadius: "50%",
                background: SURFACE,
                border: "1px solid #dde8ef",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Users size={26} color="#aebfca" />
              </div>
              <p style={{ margin: 0, fontSize: 13, color: MUTED_FAINT }}>
                No students currently in library
              </p>
            </div>
          ) : (
            active.map((record, i) => (
              <KioskStudentCard key={record.id} record={record} index={i} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
