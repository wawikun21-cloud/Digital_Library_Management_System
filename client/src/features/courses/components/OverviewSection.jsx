export default function OverviewSection({ title, icon: Icon, children, className, divider = false }) {
  return (
    <section
      className={`rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm dark:shadow-none ${className || ""}`}
    >
      {title && (
        <h2 className="mb-3.5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {Icon && <Icon size={15} className="text-[var(--color-primary)] dark:text-[var(--color-primary)]" />}
          {title}
        </h2>
      )}
      {divider && <div className="mb-4 h-px bg-neutral-100 dark:bg-neutral-800" />}
      {children}
    </section>
  );
}
