export default function ExpiryBadge({ secondsLeft }) {
  const days = Math.floor(secondsLeft / 86400);

  if (days > 7)
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
        style={{ background: "rgba(21,128,61,0.1)", color: "#15803d" }}>
        {days}d left
      </span>
    );

  if (days > 2)
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
        style={{ background: "rgba(234,139,51,0.1)", color: "#c05a0a" }}>
        {days}d left
      </span>
    );

  const hours = Math.floor(secondsLeft / 3600);
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
      style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
      {days > 0 ? `${days}d` : `${hours}h`} left
    </span>
  );
}
