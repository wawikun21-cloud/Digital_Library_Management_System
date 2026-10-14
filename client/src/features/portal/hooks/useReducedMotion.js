import { useEffect, useState } from "react";

/**
 * Live `prefers-reduced-motion` flag. Animations must be skipped, not just
 * shortened, when the user asks for reduced motion — so every animated
 * surface reads this instead of duplicating the media-query plumbing.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    const onChange = (event) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export default useReducedMotion;
