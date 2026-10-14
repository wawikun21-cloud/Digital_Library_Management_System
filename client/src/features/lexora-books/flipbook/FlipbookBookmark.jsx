/**
 * Bookmark toggle for the reader header. Styled with the app's own tokens
 * (it used to inherit a white --flipbook-btn-color that only exists inside the
 * dark reader, which made it invisible on the light header).
 */
export default function FlipbookBookmark({ isBookmarked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="shell-icon-btn"
      aria-pressed={isBookmarked}
      style={{
        color: isBookmarked ? "var(--accent-amber)" : "var(--text-primary)",
        borderColor: isBookmarked ? "var(--accent-amber)" : undefined,
      }}
      title={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24"
        fill={isBookmarked ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    </button>
  )
}
