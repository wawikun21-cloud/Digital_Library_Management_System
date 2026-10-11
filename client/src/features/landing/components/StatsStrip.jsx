/**
 * features/landing/components/StatsStrip.jsx
 *
 * Marketing stats strip (hidden once a search has run). Extracted from the
 * former landing/landingpage.jsx.
 */

const STATS = [["10,000+", "Books"], ["500+", "Authors"], ["24/7", "Access"], ["100%", "Free"]];

export default function StatsStrip() {
  return (
    <div className="stats-strip">
      {STATS.map(([n, l]) => (
        <div className="stat-item" key={l}>
          <div className="stat-num">{n}</div>
          <div className="stat-label">{l}</div>
        </div>
      ))}
    </div>
  );
}
