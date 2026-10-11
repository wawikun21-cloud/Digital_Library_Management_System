/**
 * features/landing/pages/LandingPage.jsx
 *
 * Public landing page — composition only.
 *
 * Search state lives in useLandingSearch + useSearchSuggestions; dropdown
 * state lives in SearchCard. Replaces the former landing/landingpage.jsx.
 */

import { useState, useCallback } from "react";
import "../landing.css";
import { useLandingSearch } from "../hooks/useLandingSearch";
import { useSearchSuggestions } from "../hooks/useSearchSuggestions";
import { getHistory, removeHistory } from "../utils/searchHistory";
import LandingTopBar from "../components/LandingTopBar";
import LandingHero from "../components/LandingHero";
import ResultsSection from "../components/ResultsSection";
import StatsStrip from "../components/StatsStrip";
import LandingFooter from "../components/LandingFooter";

export default function LandingPage() {
  const search      = useLandingSearch();
  const suggestions = useSearchSuggestions(search.query);

  const [history, setHistory] = useState(getHistory);

  const removeHistoryItem = useCallback((term) => {
    removeHistory(term);
    setHistory(getHistory());
  }, []);

  return (
    <>
      <LandingTopBar />

      <LandingHero
        search={search}
        suggestions={suggestions}
        history={{ items: history, remove: removeHistoryItem }}
      />

      {/* ── RESULTS ────────────────────────────────────── */}
      {search.searched && (
        <ResultsSection
          resultsRef={search.resultsRef}
          loading={search.loading}
          searchError={search.searchError}
          results={search.results}
          selectedBook={search.selectedBook}
          onSelect={search.setSelectedBook}
        />
      )}

      {/* ── STATS STRIP ────────────────────────────────── */}
      {!search.searched && <StatsStrip />}

      {/* ── FOOTER ─────────────────────────────────────── */}
      <LandingFooter />
    </>
  );
}
