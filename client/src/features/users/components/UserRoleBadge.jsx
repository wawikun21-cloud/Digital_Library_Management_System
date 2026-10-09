import { ROLES, ROLE_LABELS } from "../../../constants/roles";

const ROLE_STYLES = {
  [ROLES.SUPER_ADMIN]: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  [ROLES.ADMIN]:       "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  [ROLES.LIBRARIAN]:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  [ROLES.STAFF]:       "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  [ROLES.STUDENT]:     "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
};

export default function UserRoleBadge({ role, size = "md" }) {
  const label = ROLE_LABELS[role] || role;
  const styleClass = ROLE_STYLES[role] || "bg-gray-100 text-gray-800";
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${styleClass} ${sizeClass}`}
      title={label}
    >
      {label}
    </span>
  );
}
