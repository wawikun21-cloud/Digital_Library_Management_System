import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import authApi from "../../../services/api/authApi";
import { useStudentPortal } from "../hooks/useStudentPortal";
import { studentPortalCards } from "../utils/studentPortalCards";

function StudentPortalSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading student portal...</p>
      </div>
    </div>
  );
}

function StudentHeader({ displayName, role }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            <span className="text-xl font-medium text-gray-500 dark:text-gray-400">
              {displayName.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{displayName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{role}</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await authApi.logout();
            localStorage.removeItem("lexora_user");
            sessionStorage.removeItem("lexora_user");
          }}
          className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function PortalCard({ card }) {
  const Icon = card.icon;
  return (
    <Link
      to={card.to}
      className="block bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow group"
    >
      <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
        <Icon size={24} className="text-white" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{card.title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{card.description}</p>
    </Link>
  );
}

export default function StudentPortalPage() {
  const { role, loading, displayName } = useStudentPortal();

  if (loading) {
    return <StudentPortalSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StudentHeader displayName={displayName} role={role} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Student Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Welcome back, {displayName.split(" ")[0]}. Here are your available resources.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {studentPortalCards.map((card) => (
            <PortalCard key={card.id} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}
