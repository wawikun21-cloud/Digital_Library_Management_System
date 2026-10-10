function Block({ className }) {
  return <div className={`animate-pulse rounded-xl ${className}`} style={{ background: "var(--bg-hover)" }} />;
}

export function BooksSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => <Block key={i} className="aspect-[3/4]" />)}
    </div>
  );
}

export function CoursesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => <Block key={i} className="aspect-[3/4]" />)}
    </div>
  );
}

export function HeroSkeleton() {
  return <Block className="h-[calc(100dvh-58px)] min-h-[360px] !rounded-none" />;
}
