import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export default function LandingPage() {
  const [title, setTitle]               = useState("");
  const [author, setAuthor]             = useState("");
  const [results, setResults]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [searched, setSearched]         = useState(false);
  const [scrolled, setScrolled]         = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!title.trim() && !author.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (title.trim())  params.append("title",  title.trim());
      if (author.trim()) params.append("author", author.trim());
      const res    = await fetch(`${API_BASE}/books/public-search?${params}`);
      const data   = await res.json();
      const fetched = data.data || [];
      setResults(fetched);
      setSelectedBook(fetched[0] || null);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  };

  const handleClear = () => {
    setTitle(""); setAuthor("");
    setResults([]); setSearched(false); setSelectedBook(null);
  };

  const formatYear = (v) => {
    if (!v) return null;
    if (typeof v === "string" && v.includes("-")) return v.slice(0, 4);
    return String(v);
  };

  const statusMeta = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "available")  return { bg: "#e8f5e9", text: "#2e7d32", dot: "#4caf50", label: "Available" };
    if (s === "borrowed")   return { bg: "#fff3e0", text: "#e65100", dot: "#ff9800", label: "Borrowed" };
    if (s === "outofstock") return { bg: "#fce4ec", text: "#c62828", dot: "#ef5350", label: "Out of Stock" };
    return { bg: "#f3e5f5", text: "#6a1b9a", dot: "#ab47bc", label: status || "Available" };
  };

  // Render one detail field — always shown, null → "—"
  const Field = ({ label, value, full = false, isLink = false }) => {
    const empty = value === null || value === undefined || String(value).trim() === "";
    return (
      <div style={{ gridColumn: full ? "1 / -1" : undefined, display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: "0.63rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "#9e9189" }}>
          {label}
        </div>
        {isLink && !empty
          ? <a href={value} target="_blank" rel="noopener noreferrer"
               style={{ fontSize: "0.83rem", color: "#c9a84c", wordBreak: "break-all", textDecoration: "none" }}>
              {value}
            </a>
          : <div style={{ fontSize: "0.85rem", fontWeight: 500, color: empty ? "#c5bab0" : "#1a1410",
                          fontStyle: empty ? "italic" : "normal", lineHeight: 1.5, wordBreak: "break-word" }}>
              {empty ? "—" : String(value)}
            </div>
        }
      </div>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --ink:#1a1410; --parchment:#faf7f2; --cream:#f3ede3;
          --gold:#c9a84c; --gold-light:#e8d5a3; --rust:#8b3a2a;
          --sage:#5a6e5c; --warm-gray:#9e9189; --white:#ffffff;
          --shadow:0 4px 24px rgba(26,20,16,0.10);
          --shadow-lg:0 12px 48px rgba(26,20,16,0.16);
        }
        body { font-family:'DM Sans',sans-serif; background:var(--parchment); color:var(--ink); }

        /* TOPBAR */
        .lp-topbar { position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 2.5rem;height:80px;transition:all 0.35s ease; }
        .lp-brand { display:flex;align-items:center;gap:0.6rem;text-decoration:none; }
        .lp-brand-icon { width:180px;height:180px;border-radius:32px;display:block;object-fit:contain;background:transparent; }
        .lp-login { display:flex;align-items:center;gap:0.5rem;padding:0.5rem 1.25rem;background:var(--ink);color:var(--parchment);border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:0.85rem;font-weight:500;cursor:pointer;text-decoration:none;transition:all 0.2s; }
        .lp-login:hover { background:var(--rust);transform:translateY(-1px);box-shadow:0 4px 12px rgba(139,58,42,0.3); }
        .lp-login svg { width:15px;height:15px; }

        /* HERO */
        .lp-hero { min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8rem 1.5rem 4rem;position:relative;overflow:hidden;background:var(--parchment); }
        .lp-hero-bg { position:absolute;inset:0;pointer-events:none;overflow:hidden; }
        .lp-circle { position:absolute;border-radius:50%;opacity:0.07; }
        .lp-circle:nth-child(1) { width:700px;height:700px;top:-200px;right:-150px;background:radial-gradient(circle,var(--gold) 0%,transparent 70%);animation:lp-f1 8s ease-in-out infinite; }
        .lp-circle:nth-child(2) { width:500px;height:500px;bottom:-100px;left:-100px;background:radial-gradient(circle,var(--rust) 0%,transparent 70%);animation:lp-f2 10s ease-in-out infinite; }
        @keyframes lp-f1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,20px)} }
        @keyframes lp-f2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-15px)} }
        .lp-hero-content { position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;max-width:720px;animation:lp-up 0.8s ease both; }
        @keyframes lp-up { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        .lp-hero-title { font-family:'Playfair Display',serif;font-size:clamp(2.8rem,6vw,4.5rem);font-weight:700;line-height:1.1;color:var(--ink);margin-bottom:1.2rem;letter-spacing:-0.02em; }
        .lp-hero-title em { font-style:italic;color:var(--rust); }
        .lp-hero-sub { font-size:1.05rem;color:var(--warm-gray);font-weight:300;line-height:1.7;max-width:520px;margin-bottom:3rem; }

        /* SEARCH CARD */
        .lp-card { width:100%;max-width:640px;background:var(--white);border-radius:20px;padding:2rem 2rem 1.75rem;box-shadow:var(--shadow-lg);border:1px solid rgba(201,168,76,0.15);animation:lp-up 0.8s 0.2s ease both; }
        .lp-card-lbl { font-size:0.7rem;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:var(--warm-gray);margin-bottom:1rem; }
        .lp-fields { display:flex;flex-direction:column;gap:0.85rem;margin-bottom:1.25rem; }
        .lp-fw { position:relative; }
        .lp-fi { position:absolute;left:1rem;top:50%;transform:translateY(-50%);color:var(--warm-gray);pointer-events:none;display:flex;align-items:center; }
        .lp-fi svg { width:16px;height:16px; }
        .lp-badge { position:absolute;right:0.85rem;top:50%;transform:translateY(-50%);font-size:0.65rem;font-weight:500;color:var(--warm-gray);background:var(--cream);padding:0.2rem 0.5rem;border-radius:4px; }
        .lp-input { width:100%;padding:0.85rem 1rem 0.85rem 2.7rem;border:1.5px solid #e8e0d5;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:0.95rem;color:var(--ink);background:var(--parchment);outline:none;transition:all 0.2s; }
        .lp-input::placeholder { color:#c5bab0; }
        .lp-input:focus { border-color:var(--gold);background:var(--white);box-shadow:0 0 0 3px rgba(201,168,76,0.12); }
        .lp-actions { display:flex;gap:0.75rem; }
        .lp-btn-search { flex:1;display:flex;align-items:center;justify-content:center;gap:0.5rem;padding:0.85rem 1.5rem;background:var(--ink);color:var(--parchment);border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:0.9rem;font-weight:500;cursor:pointer;transition:all 0.2s; }
        .lp-btn-search:hover { background:var(--rust);transform:translateY(-1px);box-shadow:0 6px 20px rgba(139,58,42,0.25); }
        .lp-btn-search:disabled { opacity:0.6;cursor:not-allowed;transform:none; }
        .lp-btn-search svg { width:16px;height:16px; }
        .lp-btn-clear { padding:0.85rem 1rem;background:transparent;color:var(--warm-gray);border:1.5px solid #e8e0d5;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:0.85rem;cursor:pointer;transition:all 0.2s; }
        .lp-btn-clear:hover { border-color:var(--rust);color:var(--rust);background:rgba(139,58,42,0.04); }

        /* RESULTS */
        .lp-results { width:100%;max-width:1200px;margin:0 auto;padding:0 1.5rem 5rem;animation:lp-up 0.5s ease both; }
        .lp-results-hdr { display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid #e8e0d5; }
        .lp-count { font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:600;color:var(--ink); }
        .lp-count span { color:var(--rust); }
        .lp-split { display:grid;grid-template-columns:300px 1fr;gap:1.25rem;align-items:start; }

        /* LEFT LIST */
        .lp-list { display:flex;flex-direction:column;border:1px solid #e8e0d5;border-radius:14px;overflow:hidden;background:var(--white);max-height:75vh;overflow-y:auto; }
        .lp-row { display:flex;align-items:flex-start;gap:0.85rem;padding:1rem 1.1rem;border-bottom:1px solid #f0e9e0;cursor:pointer;transition:background 0.15s; }
        .lp-row:last-child { border-bottom:none; }
        .lp-row:hover { background:#faf7f2; }
        .lp-row.active { background:linear-gradient(90deg,rgba(201,168,76,0.09),rgba(139,58,42,0.04));border-left:3px solid var(--gold); }
        .lp-row.active .lp-row-title { color:var(--rust); }
        .lp-row-icon { flex-shrink:0;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:var(--cream);color:var(--warm-gray);margin-top:1px; }
        .lp-row-icon svg { width:16px;height:16px; }
        .lp-row.active .lp-row-icon { background:rgba(201,168,76,0.15);color:var(--gold); }
        .lp-row-body { flex:1;min-width:0; }
        .lp-row-title { font-family:'Playfair Display',serif;font-size:0.85rem;font-weight:600;color:var(--ink);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:0.2rem; }
        .lp-row-author { font-size:0.73rem;color:var(--warm-gray);font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:0.3rem; }
        .lp-row-badges { display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap; }
        .lp-src-dot { display:inline-block;width:6px;height:6px;border-radius:50%; }
        .lp-src-dot.nemco { background:#132F45; }
        .lp-src-dot.lexora { background:var(--gold); }
        .lp-src-lbl { font-size:0.63rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase; }
        .lp-src-lbl.nemco { color:#132F45; }
        .lp-src-lbl.lexora { color:#8a6010; }
        .lp-status-pill { font-size:0.62rem;font-weight:500;padding:0.1rem 0.45rem;border-radius:100px; }

        /* RIGHT DETAIL PANEL */
        .lp-detail { background:var(--white);border:1px solid #e8e0d5;border-radius:14px;overflow:hidden;position:sticky;top:100px;max-height:75vh;overflow-y:auto; }
        .lp-empty { display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;color:var(--warm-gray);text-align:center;gap:0.75rem;padding:2rem; }
        .lp-empty svg { width:40px;height:40px;opacity:0.25; }
        .lp-empty p { font-size:0.85rem; }

        /* Detail head */
        .lp-dh { padding:1.5rem 1.75rem 1.25rem;border-bottom:1px solid #f0e9e0;background:linear-gradient(135deg,#fefcf8 0%,#faf7f2 100%); }
        .lp-src-badge { display:inline-flex;align-items:center;gap:0.35rem;padding:0.22rem 0.7rem;border-radius:100px;font-size:0.68rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:1rem; }
        .lp-src-badge.nemco { background:rgba(19,47,69,0.07);color:#132F45;border:1px solid rgba(19,47,69,0.14); }
        .lp-src-badge.lexora { background:rgba(201,168,76,0.1);color:#8a6010;border:1px solid rgba(201,168,76,0.22); }
        .lp-src-badge svg { width:11px;height:11px; }
        .lp-dtitle { font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;color:var(--ink);line-height:1.25;margin-bottom:0.25rem; }
        .lp-dsub { font-size:0.88rem;color:var(--warm-gray);font-style:italic;margin-bottom:0.25rem; }
        .lp-dauthor { font-size:0.88rem;color:var(--warm-gray);margin-bottom:0.9rem; }
        .lp-dauthor strong { color:var(--ink); }
        .lp-status-row { display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem; }
        .lp-spill { display:inline-flex;align-items:center;gap:0.35rem;padding:0.28rem 0.8rem;border-radius:100px;font-size:0.77rem;font-weight:500; }
        .lp-sdot { width:7px;height:7px;border-radius:50%;display:inline-block; }
        .lp-shelf { display:inline-flex;align-items:center;gap:0.4rem;padding:0.28rem 0.75rem;border-radius:8px;background:rgba(90,110,92,0.09);color:#5a6e5c;font-size:0.77rem;font-weight:600;border:1px solid rgba(90,110,92,0.18); }
        .lp-shelf svg { width:13px;height:13px; }
        .lp-subloc { display:inline-flex;align-items:center;gap:0.4rem;padding:0.28rem 0.75rem;border-radius:8px;background:rgba(201,168,76,0.1);color:#8a6010;font-size:0.77rem;font-weight:600;border:1px solid rgba(201,168,76,0.22); }
        .lp-subloc svg { width:13px;height:13px; }
        .lp-copies { font-size:0.79rem;color:var(--warm-gray);margin-top:0.35rem; }
        .lp-copies strong { color:#2e7d32;font-size:0.93rem; }

        /* Detail body */
        .lp-db { padding:1.5rem 1.75rem;display:flex;flex-direction:column;gap:1.5rem; }
        .lp-sec-title { font-size:0.66rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:0.85rem;display:flex;align-items:center;gap:0.6rem; }
        .lp-sec-title::after { content:'';flex:1;height:1px;background:#ede6da; }
        .lp-grid { display:grid;grid-template-columns:1fr 1fr;gap:0.9rem 2rem; }

        /* CTA */
        .lp-cta { display:inline-flex;align-items:center;gap:0.5rem;padding:0.7rem 1.4rem;border-radius:10px;background:var(--gold);color:#fff;font-size:0.88rem;font-weight:600;text-decoration:none;transition:all 0.2s;align-self:flex-start; }
        .lp-cta:hover { background:var(--rust);transform:translateY(-1px);box-shadow:0 6px 18px rgba(139,58,42,0.25); }
        .lp-cta svg { width:15px;height:15px; }

        /* Empty/loading states */
        .lp-state { display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;color:var(--warm-gray);grid-column:1/-1; }
        .lp-state-icon { font-size:3rem;margin-bottom:1rem;opacity:0.4; }
        .lp-state-title { font-family:'Playfair Display',serif;font-size:1.1rem;color:var(--ink);margin-bottom:0.4rem; }
        .lp-state-txt { font-size:0.85rem; }
        .lp-spinner { width:36px;height:36px;border:3px solid var(--cream);border-top-color:var(--gold);border-radius:50%;animation:lp-spin 0.7s linear infinite;margin-bottom:1rem; }
        @keyframes lp-spin { to{transform:rotate(360deg)} }

        /* Stats + footer */
        .lp-stats { display:flex;justify-content:center;gap:3rem;padding:0 1.5rem 4rem;animation:lp-up 0.8s 0.4s ease both; }
        .lp-stat { text-align:center; }
        .lp-stat-n { font-family:'Playfair Display',serif;font-size:2rem;font-weight:700;color:var(--ink); }
        .lp-stat-l { font-size:0.75rem;color:var(--warm-gray);text-transform:uppercase;letter-spacing:0.08em; }
        .lp-footer { text-align:center;padding:2rem 1.5rem;border-top:1px solid #e8e0d5;font-size:0.8rem;color:var(--warm-gray); }
        .lp-footer strong { color:var(--ink);font-family:'Playfair Display',serif; }

        /* Responsive */
        @media (max-width:900px) { .lp-split{grid-template-columns:1fr} .lp-detail{position:static;max-height:none} }
        @media (max-width:600px) {
          .lp-topbar{padding:0 1.2rem} .lp-card{padding:1.5rem}
          .lp-stats{gap:1.5rem} .lp-grid{grid-template-columns:1fr}
          .lp-dh,.lp-db{padding:1.25rem}
        }
      `}</style>

      {/* ── TOPBAR ── */}
      <nav className="lp-topbar" style={{
        background:     scrolled ? "rgba(250,247,242,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom:   scrolled ? "1px solid rgba(201,168,76,0.2)" : "none",
      }}>
        <a href="/" className="lp-brand">
          <img src="/sidebar-logo.png" alt="NEMCO Library" className="lp-brand-icon" />
        </a>
        <a href="/login" className="lp-login">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Admin Login
        </a>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          <div className="lp-circle" />
          <div className="lp-circle" />
        </div>
        <div className="lp-hero-content">
          <h1 className="lp-hero-title">Find Any Book,<br /><em>Instantly.</em></h1>
          <p className="lp-hero-sub">
            Search our entire library collection by title or author.
            Discover availability, shelf location, and more — all in one place.
          </p>
          <form className="lp-card" onSubmit={handleSearch}>
            <div className="lp-card-lbl">Search the Collection</div>
            <div className="lp-fields">
              <div className="lp-fw">
                <span className="lp-fi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </span>
                <input className="lp-input" type="text" placeholder="Book title…"
                  value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div className="lp-fw">
                <span className="lp-fi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input className="lp-input" type="text" placeholder="Author name…"
                  value={author} onChange={e => setAuthor(e.target.value)} />
                <span className="lp-badge">Optional</span>
              </div>
            </div>
            <div className="lp-actions">
              <button className="lp-btn-search" type="submit" disabled={loading}>
                {loading ? "Searching…" : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    Search Library
                  </>
                )}
              </button>
              {searched && (
                <button className="lp-btn-clear" type="button" onClick={handleClear}>Clear</button>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* ── RESULTS ── */}
      {searched && (
        <section className="lp-results" ref={resultsRef}>
          <div className="lp-results-hdr">
            <div className="lp-count">
              {loading
                ? "Searching…"
                : <><span>{results.length}</span> result{results.length !== 1 ? "s" : ""} found</>
              }
            </div>
          </div>

          {loading ? (
            <div className="lp-state">
              <div className="lp-spinner" />
              <div className="lp-state-title">Searching the collection…</div>
            </div>
          ) : results.length === 0 ? (
            <div className="lp-state">
              <div className="lp-state-icon">🔍</div>
              <div className="lp-state-title">No results found</div>
              <div className="lp-state-txt">Try a different title or author name.</div>
            </div>
          ) : (
            <div className="lp-split">

              {/* ── LEFT: scrollable list ── */}
              <div className="lp-list">
                {results.map((book, i) => {
                  const sc       = statusMeta(book.status);
                  const isLexora = book.source === "lexora";
                  const isActive = selectedBook?.id === book.id && selectedBook?.source === book.source;
                  return (
                    <div key={`${book.source}-${book.id ?? i}`}
                         className={`lp-row${isActive ? " active" : ""}`}
                         onClick={() => setSelectedBook(book)}>
                      <div className="lp-row-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                      </div>
                      <div className="lp-row-body">
                        <div className="lp-row-title">{book.title}</div>
                        {book.author && <div className="lp-row-author">{book.author}</div>}
                        <div className="lp-row-badges">
                          <span className={`lp-src-dot ${isLexora ? "lexora" : "nemco"}`} />
                          <span className={`lp-src-lbl ${isLexora ? "lexora" : "nemco"}`}>
                            {isLexora ? "Lexora" : "NEMCO"}
                          </span>
                          {!isLexora && (
                            <span className="lp-status-pill"
                              style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── RIGHT: detail panel ── */}
              <div className="lp-detail">
                {!selectedBook ? (
                  <div className="lp-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    <p>Select a book from the list to view details</p>
                  </div>
                ) : (() => {
                  const b        = selectedBook;
                  const sc       = statusMeta(b.status);
                  const isLexora = b.source === "lexora";
                  const isNemco  = b.source === "nemco";

                  // Shorthand field renderer — always shows, null → "—"
                  const F = ({ label, value, full = false, isLink = false }) => {
                    const empty = value === null || value === undefined || String(value).trim() === "";
                    return (
                      <div style={{ gridColumn: full ? "1 / -1" : undefined, display:"flex", flexDirection:"column", gap:3 }}>
                        <div style={{ fontSize:"0.63rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:"#9e9189" }}>
                          {label}
                        </div>
                        {isLink && !empty
                          ? <a href={String(value)} target="_blank" rel="noopener noreferrer"
                               style={{ fontSize:"0.83rem", color:"#c9a84c", wordBreak:"break-all", textDecoration:"none" }}>
                              {String(value)}
                            </a>
                          : <div style={{ fontSize:"0.85rem", fontWeight:500, lineHeight:1.5, wordBreak:"break-word",
                                          color: empty ? "#c5bab0" : "#1a1410", fontStyle: empty ? "italic" : "normal" }}>
                              {empty ? "—" : String(value)}
                            </div>
                        }
                      </div>
                    );
                  };

                  return (
                    <>
                      {/* HEAD */}
                      <div className="lp-dh">
                        {isNemco && (
                          <span className="lp-src-badge nemco">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            </svg>
                            NEMCO Library
                          </span>
                        )}
                        {isLexora && (
                          <span className="lp-src-badge lexora">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="3" width="20" height="14" rx="2"/>
                              <line x1="8" y1="21" x2="16" y2="21"/>
                              <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                            Lexora Digital
                          </span>
                        )}

                        <div className="lp-dtitle">{b.title}</div>
                        {b.subtitle && <div className="lp-dsub">{b.subtitle}</div>}
                        {(b.author || b.authors) && (
                          <div className="lp-dauthor">by <strong>{b.author || b.authors}</strong></div>
                        )}

                        {isNemco && (
                          <>
                            <div className="lp-status-row">
                              <span className="lp-spill" style={{ background: sc.bg, color: sc.text }}>
                                <span className="lp-sdot" style={{ background: sc.dot }} />
                                {sc.label}
                              </span>
                              {b.shelf && (
                                <span className="lp-shelf">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="3" width="7" height="18"/>
                                    <rect x="9" y="3" width="7" height="18"/>
                                    <rect x="16" y="3" width="6" height="18"/>
                                  </svg>
                                  Shelf {b.shelf}
                                </span>
                              )}
                              {b.sublocation && (
                                <span className="lp-subloc">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                  </svg>
                                  {b.sublocation}
                                </span>
                              )}
                            </div>
                            <div className="lp-copies">
                              <strong>{b.available_copies ?? 0}</strong> of {b.total_copies ?? b.quantity ?? 0} {(b.total_copies ?? 1) === 1 ? "copy" : "copies"} available
                            </div>
                          </>
                        )}
                      </div>

                      {/* BODY */}
                      <div className="lp-db">

                        {/* ══ NEMCO — all 33 columns ══ */}
                        {isNemco && (<>

                          <div>
                            <div className="lp-sec-title">Title Information</div>
                            <div className="lp-grid">
                              <F label="Title"          value={b.title} full />
                              <F label="Subtitle"       value={b.subtitle} full />
                              <F label="Author"         value={b.author} />
                              <F label="Authors"        value={b.authors} />
                              <F label="Author Name"    value={b.authorName} />
                              <F label="Author Dates"   value={b.authorDates} />
                              <F label="Edition"        value={b.edition} />
                              <F label="Volume"         value={b.volume} />
                              <F label="Material Type"  value={b.materialType} />
                              <F label="Subtype"        value={b.subtype} />
                              <F label="Genre"          value={b.genre} />
                              <F label="Collection"     value={b.collection} />
                            </div>
                          </div>

                          <div>
                            <div className="lp-sec-title">Standard Numbers</div>
                            <div className="lp-grid">
                              <F label="Accession No." value={b.accessionNumber} />
                              <F label="Call No."      value={b.callNumber} />
                              <F label="ISBN"          value={b.isbn} />
                              <F label="ISSN"          value={b.issn} />
                              <F label="LCCN"          value={b.lccn} />
                            </div>
                          </div>

                          <div>
                            <div className="lp-sec-title">Publication</div>
                            <div className="lp-grid">
                              <F label="Publisher"     value={b.publisher} />
                              <F label="Place"         value={b.place} />
                              <F label="Year"          value={formatYear(b.year)} />
                              <F label="Date"          value={b.date} />
                            </div>
                          </div>

                          <div>
                            <div className="lp-sec-title">Physical Description</div>
                            <div className="lp-grid">
                              <F label="Pages"         value={b.pages} />
                              <F label="Extent"        value={b.extent} />
                              <F label="Size"          value={b.size} />
                              <F label="Shelf"         value={b.shelf} />
                              <F label="Sublocation"   value={b.sublocation} />
                              <F label="No. of Copies" value={b.total_copies ?? b.quantity} />
                              <F label="Available"     value={b.available_copies} />
                              <F label="Borrowed"      value={b.borrowed_copies} />
                              <F label="Other Details" value={b.otherDetails} full />
                            </div>
                          </div>

                          <div>
                            <div className="lp-sec-title">Description</div>
                            <div className="lp-grid">
                              <F label="Description"   value={b.description} full />
                            </div>
                          </div>

                          <div>
                            <div className="lp-sec-title">System</div>
                            <div className="lp-grid">
                              <F label="Status"        value={b.status} />
                              <F label="ID"            value={b.id} />
                              <F label="Created At"    value={b.created_at} />
                              <F label="Updated At"    value={b.updated_at} />
                            </div>
                          </div>

                        </>)}

                        {/* ══ LEXORA — all 11 columns ══ */}
                        {isLexora && (<>

                          <div>
                            <div className="lp-sec-title">Book Information</div>
                            <div className="lp-grid">
                              <F label="Title"          value={b.title} full />
                              <F label="Author"         value={b.author} full />
                              <F label="Year"           value={formatYear(b.year)} />
                              <F label="Collection"     value={b.collection} />
                              <F label="Resource Type"  value={b.resource_type} />
                              <F label="Format"         value={b.format} />
                            </div>
                          </div>

                          <div>
                            <div className="lp-sec-title">Academic Details</div>
                            <div className="lp-grid">
                              <F label="Program"        value={b.program} />
                              <F label="Subject / Course" value={b.subject_course} full />
                            </div>
                          </div>

                          <div>
                            <div className="lp-sec-title">Source</div>
                            <div className="lp-grid">
                              <F label="Source URL"     value={b.source} isLink full />
                            </div>
                          </div>

                          <div>
                            <div className="lp-sec-title">System</div>
                            <div className="lp-grid">
                              <F label="ID"             value={b.id} />
                              <F label="Created At"     value={b.created_at} />
                              <F label="Updated At"     value={b.updated_at} />
                            </div>
                          </div>

                          <a href={b.source || "https://lexoradigital.io/library/"}
                             target="_blank" rel="noopener noreferrer" className="lp-cta">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                              <polyline points="15 3 21 3 21 9"/>
                              <line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                            Find on Lexora Digital
                          </a>

                        </>)}

                      </div>{/* end lp-db */}
                    </>
                  );
                })()}
              </div>{/* end lp-detail */}

            </div>
          )}
        </section>
      )}

      {/* ── STATS ── */}
      {!searched && (
        <div className="lp-stats">
          {[["10,000+","Books"],["500+","Authors"],["24/7","Access"],["100%","Free"]].map(([n,l]) => (
            <div className="lp-stat" key={l}>
              <div className="lp-stat-n">{n}</div>
              <div className="lp-stat-l">{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        © {new Date().getFullYear()} <strong>Lexora</strong> — Library Management System
      </footer>
    </>
  );
}