export default function FlipbookBookmark({ isBookmarked, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
        isBookmarked ? "bg-white/15" : ""
      }`}
      style={{ color: "var(--flipbook-btn-color, #fff)" }}
      title={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
        fill={isBookmarked ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    </button>
  )
}
