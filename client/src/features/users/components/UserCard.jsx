import UserRoleBadge from "./UserRoleBadge";
import { formatUserForDisplay } from "../validation/userValidation";
export default function UserCard({ user, onEdit, onDeactivate, onReactivate, onRoleChange, currentUserId }) {
  const display = formatUserForDisplay(user);
  const isSelf = user.id === currentUserId;
  const isActive = Boolean(user.is_active);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={display.fullName} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {display.fullName?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{display.fullName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</div>
          </div>
        </div>
        <UserRoleBadge role={user.role} size="sm" />
      </div>

      {user.email && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 break-all">{user.email}</p>}

      <div className="mt-3 flex items-center justify-between">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          isActive
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
        }`}>
          {isActive ? "Active" : "Inactive"}
        </span>

        <div className="flex space-x-1 text-xs">
          <button
            onClick={() => onEdit(user)}
            className="px-2 py-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Edit
          </button>
          {!isSelf && (
            <>
              {onRoleChange && (
                <button
                  onClick={() => onRoleChange(user)}
                  className="px-2 py-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  Role
                </button>
              )}
              {isActive ? (
                <button
                  onClick={() => onDeactivate(user)}
                  className="px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Deactivate
                </button>
              ) : (
                <button
                  onClick={() => onReactivate(user)}
                  className="px-2 py-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                >
                  Reactivate
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
