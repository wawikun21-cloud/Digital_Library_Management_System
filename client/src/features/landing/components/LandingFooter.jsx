/**
 * features/landing/components/LandingFooter.jsx
 *
 * Page footer. Extracted from the former landing/landingpage.jsx.
 */

export default function LandingFooter() {
  return (
    <footer className="footer">
      © {new Date().getFullYear()} <strong>Lexora</strong> — Library Management System
    </footer>
  );
}
