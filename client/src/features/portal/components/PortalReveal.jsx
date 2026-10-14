import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import "../portalAnimations.css";

/**
 * Reveals its children when they scroll into view (once). Children fade up
 * with a small stagger — see portalAnimations.css.
 *
 * Falls back to "already visible" when IntersectionObserver is unavailable
 * or the user prefers reduced motion, so content is never hidden.
 */
export default function PortalReveal({ children, className = "" }) {
  const reducedMotion = useReducedMotion();
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setVisible(true);
      return undefined;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div ref={ref} className={`portal-reveal ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </div>
  );
}
