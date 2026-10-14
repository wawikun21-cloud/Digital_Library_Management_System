/**
 * features/analytics/pages/BookDashboardPage.jsx
 *
 * School Library Book Dashboard — composition only.
 *
 * All data and fetch logic lives in useBookDashboardData; this page holds
 * only the filter selection and which modal is open. Replaces the former
 * pages/BookDashboard.jsx.
 */

import { useState } from "react";
import { BookOpen, Copy, Package, UserCheck, AlertCircle, Calendar } from "lucide-react";
import { useWebSocket } from "../../../hooks/useWebsocket";
import { useBookDashboardData } from "../hooks/useBookDashboardData";
import { formatNum } from "../utils/formatUtils";
import { C } from "../constants/bookDashboardPalette";
import KpiCard from "../../../components/ui/KpiCard";
import BookFilterControls from "../components/book-dashboard/BookFilterControls";
import GenreChart from "../components/book-dashboard/GenreChart";
import StatusDonut from "../components/book-dashboard/StatusDonut";
import TopBorrowedCard from "../components/book-dashboard/TopBorrowedCard";
import CollectionChart from "../components/book-dashboard/CollectionChart";
import ArrivalsChart from "../components/book-dashboard/ArrivalsChart";
import LowStockCard from "../components/book-dashboard/LowStockCard";
import TopBorrowedModal from "../components/book-dashboard/TopBorrowedModal";
import LowStockModal from "../components/book-dashboard/LowStockModal";

const EMPTY_FILTER = { genre: "All", collection: "All", dateFrom: "", dateTo: "" };

export default function BookDashboardPage() {
  const [arrivalsFilter, setArrivalsFilter]           = useState("Monthly");
  const [showLowStockModal, setShowLowStockModal]     = useState(false);
  const [showTopBorrowedModal, setShowTopBorrowedModal] = useState(false);

  const [globalFilter, setGlobalFilter] = useState({ genre: "All", collection: "All", dateFrom: "", dateTo: "" });

  const {
    kpi, genreData, statusData, statusLoading, statusError,
    topBorrowed, topBorrowedLoading, topBorrowedError,
    collectionData, newArrivals, arrivalsDataKey, lowStock,
    reload, applyStatsUpdate,
  } = useBookDashboardData({ globalFilter, arrivalsFilter });

  // reload / applyStatsUpdate are stable handles — the socket listeners are
  // registered once and always call the current filter values (FIX D).
  useWebSocket({
    isAdmin:               true,
    onStatsUpdate:         applyStatsUpdate,
    onTransactionNew:      reload,
    onTransactionReturned: reload,
    onTransactionDeleted:  reload,
  });

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {showLowStockModal    && <LowStockModal    onClose={() => setShowLowStockModal(false)} />}
      {showTopBorrowedModal && (
        <TopBorrowedModal
          onClose={() => setShowTopBorrowedModal(false)}
          data={topBorrowed}
          loading={topBorrowedLoading}
        />
      )}

      {/* ── Page Header + Inline Filters ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>

        <BookFilterControls
          globalFilter={globalFilter}
          onChange={patch => setGlobalFilter(f => ({ ...f, ...patch }))}
          onClear={() => setGlobalFilter(EMPTY_FILTER)}
          genreOptions={genreData.map(g => g.genre)}
          collectionOptions={collectionData.map(c => c.collection)}
        />
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <KpiCard icon={BookOpen}    iconBg="rgba(99,102,241,.13)" iconColor={C.indigo}  label="Total Titles"     value={formatNum(kpi?.totalBooks)} />
        <KpiCard icon={Copy}        iconBg="rgba(34,197,94,.13)"  iconColor={C.green}   label="Total Copies"     value={formatNum(kpi?.totalCopies)} />
        <KpiCard icon={Package}     iconBg="rgba(50,102,127,.13)" iconColor={C.teal}    label="Available Copies" value={formatNum(kpi?.availableCopies)} />
        <KpiCard icon={UserCheck}   iconBg="rgba(238,162,58,.13)" iconColor={C.amber}   label="Borrowed Books"   value={formatNum(kpi?.borrowedBooks)} sub={kpi ? "Active borrows" : "Loading…"} />
        <KpiCard icon={AlertCircle} iconBg="rgba(244,63,94,.13)"  iconColor={C.rose}    label="Overdue Books"    value={formatNum(kpi?.overdueBooks)} />
        <KpiCard icon={Calendar}    iconBg="rgba(168,85,247,.13)" iconColor={C.purple}  label="Added This Month" value={formatNum(kpi?.addedThisMonth)} />
      </div>

      {/* ── Charts Row: Genre Bar + Status Donut ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 10 }}>
        <GenreChart genreData={genreData} />
        <StatusDonut
          statusData={statusData}
          loading={statusLoading}
          error={statusError}
          totalCopies={kpi?.totalCopies}
        />
      </div>

      {/* ── Charts Row: Top Borrowed (table) + Books by Collection ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 10 }}>
        <TopBorrowedCard
          topBorrowed={topBorrowed}
          loading={topBorrowedLoading}
          error={topBorrowedError}
          onViewAll={() => setShowTopBorrowedModal(true)}
        />
        <CollectionChart collectionData={collectionData} />
      </div>

      {/* ── Charts Row: New Arrivals Over Time + Low Stock ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ArrivalsChart
          arrivalsData={newArrivals}
          dataKey={arrivalsDataKey}
          period={arrivalsFilter}
          onPeriodChange={setArrivalsFilter}
        />
        <LowStockCard lowStock={lowStock} onViewAll={() => setShowLowStockModal(true)} />
      </div>
    </main>
  );
}
