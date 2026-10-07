export default function FlipbookLoading() {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-white/10" />
        <svg
          className="relative h-10 w-10 animate-pulse"
          style={{ color: "rgba(255,255,255,0.6)" }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      </div>
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading flipbook…</p>
    </div>
  )
}
