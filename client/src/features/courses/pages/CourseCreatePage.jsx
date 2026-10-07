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
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
          <p className="font-medium text-green-800">Course created successfully!</p>
          <p className="text-green-700 mt-1">ID: {created.id}</p>
          <button
            onClick={() => navigate(`/dashboard/courses/${created.id}`)}
            className="mt-3 rounded-lg px-4 py-2 text-sm bg-green-600 text-white"
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
