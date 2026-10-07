export default function FlipbookError({ message = "This book could not be loaded. Please try again later." }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <svg
        className="h-10 w-10"
        style={{ color: "rgba(255,255,255,0.2)" }}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <line x1="10" y1="8" x2="16" y2="16" />
        <line x1="16" y1="8" x2="10" y2="16" />
      </svg>
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{message}</p>
    </div>
  )
}
