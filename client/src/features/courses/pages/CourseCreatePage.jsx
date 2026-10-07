import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateCourseModal from "../components/modals/CreateCourseModal";

export default function CourseCreatePage() {
  const navigate = useNavigate();
  const [created, setCreated] = useState(null);

  const handleSuccess = (createdCourse) => {
    setCreated(createdCourse);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Create New Course</h1>
      {created ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900 dark:bg-green-950/30">
          <p className="font-medium text-green-800 dark:text-green-200">Course created successfully!</p>
          <p className="mt-1 text-green-700 dark:text-green-300">ID: {created.id}</p>
          <button
            onClick={() => navigate(`/dashboard/courses/${created.id}`)}
            className="mt-3 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
          >
            View Course
          </button>
        </div>
      ) : (
        <CreateCourseModal open={true} onClose={() => navigate("/dashboard/courses")} onSuccess={handleSuccess} />
      )}
    </div>
  );
}
