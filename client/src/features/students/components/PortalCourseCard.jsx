import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

export default function PortalCourseCard({ course }) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const modules = course.module_count ?? 0;

  return (
    <article
      className="group overflow-hidden rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--accent-amber)] hover:shadow-md"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <Link to={`/dashboard/courses/${course.id}`} className="flex w-full flex-col gap-2 text-left">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl" style={{ background: "var(--bg-primary)" }}>
          {course.thumbnail_url && !thumbnailFailed ? (
            <img
              src={course.thumbnail_url}
              alt=""
              loading="lazy"
              onError={() => setThumbnailFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen size={32} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-0.5 px-2.5 pb-2.5">
          <h3 className="line-clamp-1 text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{course.title}</h3>
          {course.instructor_name && (
            <p className="truncate text-[10px]" style={{ color: "var(--text-muted)" }}>By {course.instructor_name}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {course.category && (
              <span className="rounded px-1.5 py-0.5 text-[9px]" style={{ background: "rgba(238,162,58,0.12)", color: "var(--accent-amber)" }}>{course.category}</span>
            )}
            <span className="rounded px-1.5 py-0.5 text-[9px] capitalize" style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}>{course.difficulty?.replace(/_/g, " ") || "All levels"}</span>
            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{modules} {modules === 1 ? "module" : "modules"}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
