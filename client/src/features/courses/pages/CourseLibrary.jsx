import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Search, X } from "lucide-react";
import Pagination from "../../../components/books/Pagination";
import coursesApi from "../api/coursesApi";
import RichTextContent from "../components/RichTextContent";

const PAGE_SIZE = 12;

function CourseCard({ course }) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  return (
    <article
      className="group relative overflow-hidden rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
      onMouseEnter={(event) => { event.currentTarget.style.borderColor = "var(--accent-amber)"; }}
      onMouseLeave={(event) => { event.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <Link to={`/dashboard/courses/${course.id}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl" style={{ background: "var(--bg-primary)" }}>
          {course.thumbnail_url && !thumbnailFailed ? (
            <img
              src={course.thumbnail_url}
              alt={`${course.title} course thumbnail`}
              onError={() => setThumbnailFailed(true)}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <BookOpen size={32} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            </div>
          )}
          <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
            <span className="inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: "rgba(34,197,94,0.9)", color: "#fff" }}>Published</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-2.5 pb-2.5 pt-2">
          <h2 className="line-clamp-1 text-[12px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{course.title}</h2>
          {course.instructor_name && (
            <p className="truncate text-[10px]" style={{ color: "var(--text-muted)" }}>By {course.instructor_name}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {course.category && (
              <span className="rounded px-1.5 py-0.5 text-[9px]" style={{ background: "rgba(238,162,58,0.12)", color: "var(--accent-amber)" }}>{course.category}</span>
            )}
            <span className="rounded px-1.5 py-0.5 text-[9px] capitalize" style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}>{course.difficulty?.replace(/_/g, " ") || "All levels"}</span>
            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{course.module_count ?? 0} {(course.module_count ?? 0) === 1 ? "module" : "modules"}</span>
          </div>
          {course.description && (
            <RichTextContent
              value={course.description}
              className="mt-1 line-clamp-3 text-[10px] leading-relaxed text-[color:var(--text-secondary)]"
            />
          )}
        </div>
      </Link>
    </article>
  );
}

export default function CourseLibrary() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      setLoading(true);
      setError("");
      try {
        const result = await coursesApi.getCourseLibrary({
          search: search.trim(),
          difficulty,
          page: currentPage,
          limit: PAGE_SIZE,
          sort: "title",
          order: "asc",
        });
        if (!result?.success) {
          throw new Error(result?.error || "Could not load the course library.");
        }
        if (!cancelled) {
          setCourses(Array.isArray(result.data) ? result.data : []);
          setTotalPages(Math.max(1, result.pagination?.totalPages || 1));
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Could not load the course library.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCourses();
    return () => { cancelled = true; };
  }, [search, difficulty, currentPage, retryCount]);

  const clearFilters = () => {
    setSearch("");
    setDifficulty("");
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-md flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search courses..."
            className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        <label className="min-w-[160px]">
          <span className="sr-only">Filter courses by difficulty</span>
          <select
            value={difficulty}
            onChange={(event) => {
              setDifficulty(event.target.value);
              setCurrentPage(1);
            }}
            className="w-full cursor-pointer rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            <option value="">All difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="all_levels">All levels</option>
          </select>
        </label>
        {(search || difficulty) && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium"
            style={{ color: "var(--accent-amber)" }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <div role="status" className="flex items-center justify-center py-20">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading courses…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border p-4 text-sm" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <p role="alert" className="text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => setRetryCount((current) => current + 1)}
            className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
            style={{ background: "var(--accent-amber)" }}
          >
            Retry
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20"
          style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <BookOpen size={48} className="mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            No published courses available.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {courses.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
          {totalPages > 1 && (
            <Pagination
              currentPage={Math.min(currentPage, totalPages)}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          )}
        </>
      )}
    </div>
  );
}
