import { useLocalStorage } from "../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../constants";
import { ROLES } from "../constants/roles";

export function useAuth() {
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);
  const role = user?.role ?? null;

  const hasRole = (...allowedRoles) => allowedRoles.includes(role);

  return {
    user,
    isAuthenticated: !!user,
    role,
    isSuperAdmin: role === ROLES.SUPER_ADMIN,
    isAdmin: role === ROLES.ADMIN,
    isLibrarian: role === ROLES.LIBRARIAN,
    isStaff: role === ROLES.STAFF,
    isStudent: role === ROLES.STUDENT,
    hasRole,
  };
}
