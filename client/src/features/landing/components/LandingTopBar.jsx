/**
 * features/landing/components/LandingTopBar.jsx
 *
 * Fixed top bar with brand and login link. Extracted from the former
 * landing/landingpage.jsx.
 */

export default function LandingTopBar() {
  return (
    <nav className="topbar">
      <a href="/" className="topbar-brand">
        <img src="/Landing-page-logo.png" alt="NEMCO Library" className="topbar-brand-icon" />
      </a>
      <div className="topbar-nav">
        <a href="/login" className="login-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Login
        </a>
      </div>
    </nav>
  );
}
