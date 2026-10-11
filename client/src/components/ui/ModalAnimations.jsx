/**
 * components/ui/ModalAnimations.jsx
 *
 * Shared overlay/modal keyframes. Previously duplicated in the attendance
 * feature and inline in the students page; now a single source. Renders a
 * `<style>` tag with the two keyframes both modals rely on.
 */

export default function ModalAnimations() {
  return (
    <style>{`
      @keyframes overlayIn { from { opacity: 0 } to { opacity: 1 } }
      @keyframes modalIn   { from { opacity: 0; transform: scale(.94) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
    `}</style>
  );
}
