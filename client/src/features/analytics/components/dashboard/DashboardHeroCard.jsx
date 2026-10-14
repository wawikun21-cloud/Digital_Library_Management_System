/**
 * features/analytics/components/dashboard/DashboardHeroCard.jsx
 *
 * The big card at the top of the analytics dashboard: greeting + headline,
 * one primary call-to-action, and a frosted-glass KPI strip along the bottom.
 * It replaces the separate "page title + Refresh button" row and the plain
 * KpiStatsSection row — the KPI models still come from buildKpiCardModels,
 * so the numbers, routes and percentages are unchanged.
 *
 * Styles live in styles/shell.css (`.hero-*`).
 */

import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, RefreshCw } from "lucide-react";
import { buildKpiCardModels } from "../../utils/dashboardKpiCards";
import { useLocalStorage } from "../../../../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../../../../constants/index.js";
import { hasPermission } from "../../../../utils/permissionUtils";

// The KPI models carry dark brand accents meant for white cards; on the dark
// hero they would vanish, so the strip uses its own bright dot/bar colours.
const HERO_ACCENTS = ["#f3b940", "#7cc4e0", "#ff7a6b", "#6fd9a3"];

// First target the user is allowed to open wins — never offer a link that
// PermissionRoute would bounce straight back to the dashboard.
const CTA_TARGETS = [
  { to: "/dashboard/borrowed", label: "Review borrowed books", permission: "manage_transactions" },
  { to: "/dashboard/books",    label: "Manage the catalog",    permission: "manage_books" },
];

function capitalize(name) {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
}

export default function DashboardHeroCard({ kpiStats, loading, error, onRefresh }) {
  const navigate = useNavigate();
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);

  const cards = buildKpiCardModels(kpiStats, loading);
  const cta   = CTA_TARGETS.find((t) => hasPermission(user, t.permission));
  const name  = capitalize(user?.username);

  return (
    <>
      <section className="hero-card" aria-label="Library overview">
        {/* Decorative background — hidden from assistive tech */}
        <svg className="hero-rings" viewBox="0 0 520 520" fill="none" aria-hidden="true">
          <circle cx="260" cy="260" r="250" stroke="rgba(255,255,255,0.10)" />
          <circle cx="260" cy="260" r="190" stroke="rgba(255,255,255,0.12)" />
          <circle cx="260" cy="260" r="130" stroke="rgba(255,255,255,0.14)" />
          <circle cx="260" cy="260" r="70" fill="rgba(243,185,64,0.16)" stroke="rgba(243,185,64,0.45)" />
        </svg>

        <svg
          className="hidden lg:block absolute pointer-events-none"
          style={{ right: 64, top: 44, width: 270, zIndex: -1 }}
          viewBox="0 0 260 200"
          fill="none"
          aria-hidden="true"
        >
          <ellipse cx="130" cy="182" rx="112" ry="12" fill="rgba(0,0,0,0.28)" />
          <rect x="24" y="140" width="208" height="38" rx="8" fill="#f3b940" />
          <rect x="34" y="150" width="188" height="18" rx="4" fill="#fff7e0" />
          <rect x="44" y="100" width="180" height="36" rx="8" fill="#7cc4e0" />
          <rect x="54" y="109" width="160" height="18" rx="4" fill="#eaf7fc" />
          <g transform="rotate(-8 130 70)">
            <rect x="60" y="58" width="170" height="34" rx="8" fill="#ff7a6b" />
            <rect x="70" y="66" width="150" height="18" rx="4" fill="#ffeceb" />
          </g>
        </svg>

        <button type="button" className="hero-refresh" onClick={onRefresh} aria-label="Refresh dashboard data">
          <RefreshCw size={13} /> <span className="hidden sm:inline">Refresh</span>
        </button>

        <span className="hero-eyebrow">Library overview</span>
        <h2 className="hero-title">
          {name ? `Welcome back, ${name}` : "Welcome back"}
        </h2>
        <p className="hero-sub">
          Real-time statistics, charts and actionable insights across your
          school and Lexora collections.
        </p>

        {cta && (
          <button type="button" className="hero-cta" onClick={() => navigate(cta.to)}>
            {cta.label} <ArrowRight size={16} />
          </button>
        )}

        {/* ── Frosted KPI strip ── */}
        <div className="hero-stats">
          {cards.map((card, i) => {
            const accent = HERO_ACCENTS[i % HERO_ACCENTS.length];
            const clickable = Boolean(card.route);
            const Tag = clickable ? "button" : "div";
            const props = clickable
              ? { type: "button", onClick: () => navigate(card.route) }
              : {};
            return (
              <Tag key={card.label} className="hero-stat" data-clickable={clickable} {...props}>
                <span className="hero-stat-value">{card.value}</span>
                <span className="hero-stat-label">
                  <span className="hero-stat-dot" style={{ background: accent }} />
                  {card.label}
                </span>
                <span className="hero-stat-bar" aria-hidden="true">
                  <span style={{ width: `${card.percentage ?? 0}%`, background: accent }} />
                </span>
              </Tag>
            );
          })}
        </div>
      </section>

      {error && (
        <div
          className="rounded-xl p-3 flex items-center gap-2"
          style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.18)" }}
        >
          <AlertTriangle size={14} color="#dc2626" />
          <span className="text-[11px]" style={{ color: "#dc2626" }}>
            Stats unavailable: {error}
          </span>
        </div>
      )}
    </>
  );
}
