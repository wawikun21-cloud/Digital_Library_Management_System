import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

const AUTOPLAY_MS = 6000;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
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

function ControlButton({ label, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${className}`}
    >
      {children}
    </button>
  );
}

export default function HeroCarousel({ slides }) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const count = slides.length;
  const multiple = count > 1;

  const go = useCallback((next) => setIndex((next + count) % count), [count]);

  // Keep the index valid if the slide list shrinks.
  useEffect(() => { if (index >= count) setIndex(0); }, [count, index]);

  const playing = multiple && !reducedMotion && !userPaused && !hovering;
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [playing, count]);

  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") go(index - 1);
    if (event.key === "ArrowRight") go(index + 1);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured announcements"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      onKeyDown={onKeyDown}
      className="relative h-[56vh] min-h-[320px] overflow-hidden"
      style={{ background: "var(--bg-surface)" }}
    >
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <article
            key={slide.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={!active}
            className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <img
              src={slide.image_url}
              alt=""
              className="h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent sm:bg-gradient-to-r sm:from-black/75 sm:via-black/35 sm:to-transparent" />
          </article>
        );
      })}

      {multiple && (
        <>
          <ControlButton label="Previous slide" onClick={() => go(index - 1)} className="absolute left-3 top-1/2 -translate-y-1/2">
            <ChevronLeft size={18} />
          </ControlButton>
          <ControlButton label="Next slide" onClick={() => go(index + 1)} className="absolute right-3 top-1/2 -translate-y-1/2">
            <ChevronRight size={18} />
          </ControlButton>

          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
            {!reducedMotion && (
              <ControlButton
                label={userPaused ? "Play slideshow" : "Pause slideshow"}
                onClick={() => setUserPaused((paused) => !paused)}
                className="!h-7 !w-7"
              >
                {userPaused ? <Play size={12} /> : <Pause size={12} />}
              </ControlButton>
            )}
            <div className="flex items-center gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index}
                  className={`h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
