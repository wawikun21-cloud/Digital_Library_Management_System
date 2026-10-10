import { useState } from "react";
import UserRoleBadge from "./UserRoleBadge";
import { ROLE_LABELS } from "../../../constants/roles";
import { formatUserForDisplay } from "../validation/userValidation";
import { Edit, Trash2, UserCheck, UserX, Shield, KeyRound } from "lucide-react";

export default function UserTable({
  users,
  loading,
  onEdit,
  onRoleChange,
  onDeactivate,
  onReactivate,
  onPermissions,
  currentUserId,
}) {
  const [hoveredRow, setHoveredRow] = useState(null);

  const getStatusBadge = (isActive) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
        Inactive
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const ActionButton = ({ icon: Icon, label, onClick, color, title }) => (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-all duration-150 ${color} hover:opacity-90 hover:scale-105 active:scale-95`}
    >
      <Icon size={14} />
      <span className="sr-only">{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-t-lg"></div>
        <div className="space-y-0 divide-y divide-gray-200 dark:divide-gray-700">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <UserX size={24} className="text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No users found</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl shadow ring-1 ring-black ring-opacity-5 dark:ring-opacity-10">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800/50">
          <tr>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              User
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Role
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user) => {
            const display = formatUserForDisplay(user);
            const isSelf = user.id === currentUserId;
            const isActive = Boolean(user.is_active);

            return (
              <tr
                key={user.id}
                className="transition-colors duration-150"
                onMouseEnter={() => setHoveredRow(user.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={display.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                            {display.fullName?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      {isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 bg-green-500"></span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {display.fullName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                        <span>@{user.username}</span>
                        {isSelf && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">(you)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <UserRoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {getStatusBadge(user.is_active)}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center justify-center space-x-1.5">
                    <button
                      onClick={() => onEdit(user)}
                      title="Edit user"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-150"
                    >
                      <Edit size={14} />
                    </button>

                    {!isSelf && onPermissions && (
                      <button
                        onClick={() => onPermissions(user)}
                        title="Manage permissions"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-all duration-150"
                      >
                        <KeyRound size={14} />
                      </button>
                    )}

                    {!isSelf && onRoleChange && isActive && (
                      <button
                        onClick={() => onRoleChange(user)}
                        title="Change role"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all duration-150"
                      >
                        <Shield size={14} />
                      </button>
                    )}

                    {!isSelf && (
                      <>
                        {isActive && onDeactivate && (
                          <button
                            onClick={() => onDeactivate(user)}
                            title="Deactivate user"
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-150"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {!isActive && onReactivate && (
                          <button
                            onClick={() => onReactivate(user)}
                            title="Reactivate user"
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-150"
                          >
                            <UserCheck size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
