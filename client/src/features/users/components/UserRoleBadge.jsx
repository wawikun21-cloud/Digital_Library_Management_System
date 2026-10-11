import { ROLES, ROLE_LABELS } from "../../../constants/roles";
import "./usersUi.css";

/** Feature tint per role — unknown roles fall back to the muted badge. */
const ROLE_BADGE_CLASSES = {
  [ROLES.SUPER_ADMIN]: "us-role--super_admin",
  [ROLES.ADMIN]:       "us-role--admin",
  [ROLES.LIBRARIAN]:   "us-role--librarian",
  [ROLES.STAFF]:       "us-role--staff",
  [ROLES.STUDENT]:     "us-role--student",
};

/**
 * Role pill built on the shared .rp-badge shape (see src/styles/ui.css),
 * tinted per role from usersUi.css so light and dark themes keep their
 * contrast.
 */
export default function UserRoleBadge({ role }) {
  const label = ROLE_LABELS[role] || role;
  const tint = ROLE_BADGE_CLASSES[role];

  return (
    <span
      className={`rp-badge rp-badge--plain ${tint || "rp-badge--muted"}`}
      title={label}
    >
      {label}
    </span>
  );
}
