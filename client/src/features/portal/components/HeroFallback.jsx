import { GraduationCap } from "lucide-react";
import { heroBoxStyle, HERO_MIN_HEIGHT_CLASS } from "../constants/portalUi";

/** Shown when no hero slides are active. Shares the carousel's height contract. */
export default function HeroFallback() {
  return (
    <section
      aria-label="Welcome"
      className={`flex w-full items-center justify-center gap-4 p-6 sm:p-8 ${HERO_MIN_HEIGHT_CLASS}`}
      style={{
        ...heroBoxStyle(),
        background: "linear-gradient(120deg, rgba(238,162,58,0.16), var(--bg-surface) 70%)",
      }}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "rgba(238,162,58,0.18)", color: "var(--accent-amber)" }}
      >
        <GraduationCap size={24} />
      </span>
      <div>
        <h2 className="text-lg font-bold sm:text-xl" style={{ color: "var(--text-primary)" }}>
          Welcome to the Student Portal
        </h2>
        <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Read e-books, follow your courses and find library resources in one place.
        </p>
      </div>
    </section>
  );
}
