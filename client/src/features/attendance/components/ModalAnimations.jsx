/**
 * features/attendance/components/ModalAnimations.jsx
 *
 * Shared overlay/modal keyframes. Previously injected separately by the
 * attendance page and the records table modal (with slightly different
 * values); now a single source. Extracted from pages/Attendance.jsx.
 */

export default function ModalAnimations() {
  return (
    <style>{`
      @keyframes overlayIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes modalIn   { from { opacity: 0; transform: scale(.94) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
    `}</style>
  );
}
