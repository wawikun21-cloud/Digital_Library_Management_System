import { useRef, useState, useCallback } from "react";

/**
 * useTilt — 3D tilt + glare + press animation hook
 * Inspired by react-tilt-button (https://react-tilt-button.vercel.app/)
 */
export function useTilt({
  maxTilt = 14,
  perspective = 700,
  glareOpacity = 0.12,
  scale = 1.03,
  transitionMs = 150,
} = {}) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});
  const [glare, setGlare] = useState({ opacity: 0, x: "50%", y: "50%" });
  const [pressed, setPressed] = useState(false);
  const frameRef = useRef(null);

  const handleMouseMove = useCallback(
    (e) => {
      if (!ref.current) return;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      frameRef.current = requestAnimationFrame(() => {
        const rect = ref.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // Normalised -1 → +1
        const nx = (e.clientX - cx) / (rect.width / 2);
        const ny = (e.clientY - cy) / (rect.height / 2);

        const rotX = -ny * maxTilt;   // tilt up/down
        const rotY =  nx * maxTilt;   // tilt left/right

        // Glare position (percentage)
        const gx = `${((e.clientX - rect.left) / rect.width) * 100}%`;
        const gy = `${((e.clientY - rect.top) / rect.height) * 100}%`;

        // Dynamic shadow shifts in the opposite direction of tilt
        const sx = -nx * 8;
        const sy = -ny * 8;

        setStyle({
          transform: `perspective(${perspective}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(${scale},${scale},${scale})`,
          transition: `transform ${transitionMs}ms ease-out, box-shadow ${transitionMs}ms ease-out`,
          boxShadow: `${sx}px ${sy + 10}px 30px rgba(19,47,69,0.18), ${sx * 0.5}px ${sy * 0.5 + 4}px 12px rgba(19,47,69,0.10)`,
        });

        setGlare({ opacity: glareOpacity, x: gx, y: gy });
      });
    },
    [maxTilt, perspective, scale, glareOpacity, transitionMs]
  );

  const handleMouseLeave = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    setStyle({
      transform: "perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
      transition: "transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms ease",
      boxShadow: "var(--shadow-sm)",
    });
    setGlare({ opacity: 0, x: "50%", y: "50%" });
    setPressed(false);
  }, []);

  const handleMouseDown = useCallback(() => setPressed(true),  []);
  const handleMouseUp   = useCallback(() => setPressed(false), []);

  const pressStyle = pressed
    ? { transform: style.transform?.replace(`scale3d(${scale},${scale},${scale})`, "scale3d(0.97,0.97,0.97)") }
    : {};

  return {
    ref,
    tiltProps: {
      onMouseMove:  handleMouseMove,
      onMouseLeave: handleMouseLeave,
      onMouseDown:  handleMouseDown,
      onMouseUp:    handleMouseUp,
    },
    cardStyle:  { ...style, ...pressStyle },
    glare,
  };
}
