import { SearchX, Users } from "lucide-react";

/**
 * Empty-state panel for the users list, shared by the desktop table and
 * the mobile card list so both breakpoints read the same. Matches the
 * dashed rp-empty pattern used across the app's management pages.
 */
export default function UsersEmptyState({ hasFilters = false }) {
  return (
    <div className="rp-empty">
      <div
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
      >
        {hasFilters ? <SearchX size={24} aria-hidden="true" /> : <Users size={24} aria-hidden="true" />}
      </div>
      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {hasFilters ? "No users match your filters" : "No users yet"}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
        {hasFilters
          ? "Try a different search term or role."
          : "Create a user to get started."}
      </p>
    </div>
  );
}
