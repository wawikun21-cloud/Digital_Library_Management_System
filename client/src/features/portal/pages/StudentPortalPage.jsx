import { useStudentPortal } from "../hooks/useStudentPortal";
import { useStudentPortalHome } from "../hooks/useStudentPortalHome";
import HeroCarousel from "../components/HeroCarousel";
import HeroFallback from "../components/HeroFallback";
import PortalSection from "../components/PortalSection";
import PortalCourseCard from "../components/PortalCourseCard";
import PortalReveal from "../components/PortalReveal";
import { BooksSkeleton, CoursesSkeleton, HeroSkeleton } from "../components/PortalSkeletons";
import LexoraBookCard from "../../lexora-books/components/LexoraBookCard";
import { useAuth } from "../../../hooks/useAuth";
import "../portalAnimations.css";

function PortalLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: "var(--accent-amber)", borderTopColor: "transparent" }}
      />
      <span className="sr-only">Loading student portal</span>
    </div>
  );
}

export default function StudentPortalPage() {
  const { loading: accessLoading } = useStudentPortal();
  const home = useStudentPortalHome();
  const { hasPermission } = useAuth();

  // Hide a portal row when the viewer's resolved permissions exclude it.
  const canViewLexora = hasPermission("view_lexora_books");
  const canViewCourses = hasPermission("view_course_library");

  if (accessLoading) return <PortalLoading />;

  return (
    <div className="flex flex-col gap-10">
      {/* Hero card: sits inside the body card's own padding (no negative-margin
          bleed) and shares the sections' max width so the page has one column
          edge. overflow-hidden + radius clips the carousel, fallback and skeleton
          alike. Rises in once its real content lands. */}
      <div
        className={`mx-auto w-full max-w-7xl overflow-hidden rounded-[22px] lg:rounded-[28px] ${home.loading ? "" : "portal-hero-rise"}`}
        style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
      >
        {home.loading ? (
          <HeroSkeleton />
        ) : home.slides.length > 0 ? (
          <HeroCarousel slides={home.slides} />
        ) : (
          <HeroFallback />
        )}
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12">
        {canViewLexora && (
          <PortalSection
            title="E-Books"
            description="The latest additions to the digital library."
            browseLabel="Browse all E-Books"
            browseTo="/lexora-books"
            loading={home.loading}
            error={home.error}
            onRetry={home.retry}
            isEmpty={home.books.length === 0}
            emptyMessage="No e-books have been published yet."
            skeleton={<BooksSkeleton />}
          >
            {/* Keyed on the reload counter so a retry replays the reveal. */}
            <PortalReveal key={`books-${home.attempt}`} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {home.books.map((book) => <LexoraBookCard key={book.id} book={book} />)}
            </PortalReveal>
          </PortalSection>
        )}

        {canViewCourses && (
          <PortalSection
            title="Courses"
            description="Recently published courses you can open right away."
            browseLabel="Browse all Courses"
            browseTo="/dashboard/course-library"
            loading={home.loading}
            error={home.error}
            onRetry={home.retry}
            isEmpty={home.courses.length === 0}
            emptyMessage="No courses have been published yet."
            skeleton={<CoursesSkeleton />}
          >
            <PortalReveal key={`courses-${home.attempt}`} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {home.courses.map((course) => <PortalCourseCard key={course.id} course={course} />)}
            </PortalReveal>
          </PortalSection>
        )}
      </div>
    </div>
  );
}
