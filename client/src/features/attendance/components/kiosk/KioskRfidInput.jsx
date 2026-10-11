/**
 * features/attendance/components/kiosk/KioskRfidInput.jsx
 *
 * Hidden always-focused input that captures hardware RFID scanner keystrokes.
 * Extracted from the former pages/KioskAttendance.jsx.
 */

export default function KioskRfidInput({ inputRef, onKeyDown }) {
  return (
    <input
      ref={inputRef}
      onKeyDown={onKeyDown}
      onChange={() => {}}
      value=""
      readOnly
      tabIndex={0}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: -9999,
        left: -9999,
        opacity: 0,
        width: 1,
        height: 1,
        pointerEvents: "none",
      }}
    />
  );
}
