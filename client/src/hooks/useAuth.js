import { useLocalStorage } from "../hooks/useLocalStorage"
import { STORAGE_KEYS } from "../constants"

export function useAuth() {
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null)
  return { user, isAuthenticated: !!user }
}
