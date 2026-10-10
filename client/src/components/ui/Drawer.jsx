import { useEffect, useRef } from "react";

/**
 * Right-side slide-over shell — the LMS-SOP pattern for nested editors.
 *
 * Generic UI: it owns positioning, the backdrop, Escape, scroll lock and
 * focus. It deliberately renders NO header — the caller owns its layout, so
 * this never competes with (or double-wraps) a header the child provides.
 * Styles live in `styles/drawer.css`.
 */
export default function Drawer({ open, onClose, children, width = 460, label = "Panel" }) {
  const panelRef = useRef(null);

  /* ── Escape to close ─────────────────────────────────── */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* ── Lock background scroll and trap focus while open ── */
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;

    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="drawer-root">
      {/* Backdrop — inert so it is never a tab stop nor announced. */}
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="drawer-panel"
        style={{ "--drawer-width": `min(${width}px, 100%)` }}
      >
        {children}
      </aside>
    </div>
  );
}
