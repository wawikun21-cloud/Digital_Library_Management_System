/**
 * features/transactions/pages/BorrowedPage.jsx
 *
 * Borrowed Books — composition only.
 *
 * Data lives in useTransactions (list, real-time sync, mutations) and
 * useTransactionFilters (query/status/type + summary); each modal owns its
 * own form state. This page holds only which modal is open, the toast, and
 * the delete-confirmation target. Replaces the former pages/Borrowed.jsx.
 */

import { useState, useCallback, useEffect } from "react";
import { BookOpen, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import ConfirmationModal from "../../../components/ConfirmationModal";
import Toast from "../../../components/Toast";
import { useTransactions } from "../hooks/useTransactions";
import { useTransactionFilters } from "../hooks/useTransactionFilters";
import { isOverdue } from "../utils/transactionDates";
import TransactionSummaryCards from "../components/TransactionSummaryCards";
import TransactionToolbar from "../components/TransactionToolbar";
import BorrowModal from "../components/BorrowModal";
import EditTxnModal from "../components/EditTxnModal";
import ExtendTxnModal from "../components/ExtendTxnModal";
import TransactionDetailModal from "../components/TransactionDetailModal";
import BorrowedTable from "../components/BorrowedTable";

export default function BorrowedPage() {
  const { hasPermissionAction } = useAuth();

  // ── Per-action permission gates (server enforces the same) ──
  const canBorrow  = hasPermissionAction("manage_transactions", "create");
  const canReturn  = hasPermissionAction("manage_transactions", "return");
  const canExtend  = hasPermissionAction("manage_transactions", "extend");
  const canEdit    = hasPermissionAction("manage_transactions", "edit");
  const canDelete  = hasPermissionAction("manage_transactions", "delete");
  const canPayFine = hasPermissionAction("manage_transactions", "pay_fine");

  // ── Toast ─────────────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  const showToast = useCallback((message, type = "info") => setToast({ visible: true, message, type }), []);
  const hideToast = useCallback(() => setToast(p => ({ ...p, visible: false })), []);

  const {
    txns, loading,
    borrowBooks, updateTxn, extendTxn, returnTxn, deleteTxn, payFineTxn,
  } = useTransactions({ showToast });
  const {
    query, setQuery, statusFilter, setStatusFilter, typeFilter, setTypeFilter,
    filtered, summary, hasActiveFilters, clearFilters,
  } = useTransactionFilters(txns);

  // ── Modal state: "borrow" | "edit" | "extend" | false ──
  const [modal,     setModal]     = useState(false);
  const [editTxn,   setEditTxn]   = useState(null);
  const [detailTxn, setDetailTxn] = useState(null);

  // ── Delete modal ───────────────────────────────────────
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, title: "" });

  const openBorrowModal  = () => setModal("borrow");
  const openEditModal    = (txn) => { setEditTxn(txn); setModal("edit"); };
  const openExtendModal  = (txn) => { setEditTxn(txn); setModal("extend"); };
  const closeModal       = () => { setModal(false); setEditTxn(null); };

  const requestDelete = (txn) => setDeleteModal({ open: true, id: txn.id, title: txn.book_title || "" });
  const cancelDelete  = () => setDeleteModal({ open: false, id: null, title: "" });
  const confirmDelete = () => {
    deleteTxn(deleteModal.id);
    setDeleteModal({ open: false, id: null, title: "" });
  };

  // Pay-fine also refreshes the open detail modal.
  const handlePayFine = (id) => {
    payFineTxn(id, updated => setDetailTxn(prev => (prev?.id === id ? updated : prev)));
  };

  // ── Lock scroll when a modal is open ──────────────────
  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page Header ──────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold"
            style={{ color: "var(--text-primary)" }}>
            <BookOpen size={22} style={{ color: "var(--accent-amber)" }} />
            Borrowed Books
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Manage borrowing transactions, returns, renewals, and overdue fines
          </p>
        </div>
      </div>

      {/* ── Summary pills ──────────────────────────────── */}
      <TransactionSummaryCards summary={summary} />

      {/* ── Toolbar ────────────────────────────────────── */}
      <TransactionToolbar
        query={query} onQuery={setQuery}
        statusFilter={statusFilter} onStatusFilter={setStatusFilter}
        typeFilter={typeFilter} onTypeFilter={setTypeFilter}
        onClearFilters={clearFilters} hasActiveFilters={hasActiveFilters}
        canBorrow={canBorrow} onBorrowClick={openBorrowModal}
      />

      {/* Result count */}
      <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
        {filtered.length === txns.length
          ? `${txns.length} transaction${txns.length !== 1 ? "s" : ""}`
          : `${filtered.length} of ${txns.length} shown`}
      </p>

      {/* ── Table ──────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-amber)" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <AlertCircle size={36} className="mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No transactions found.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <BorrowedTable
            transactions={filtered}
            onRowClick={t => setDetailTxn(t)}
            isOverdue={isOverdue}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          BORROW MODAL
      ══════════════════════════════════════════════════ */}
      {modal === "borrow" && (
        <BorrowModal onClose={closeModal} onBorrow={borrowBooks} />
      )}

      {/* ══════════════════════════════════════════════════
          EDIT MODAL
      ══════════════════════════════════════════════════ */}
      {modal === "edit" && editTxn && (
        <EditTxnModal txn={editTxn} onClose={closeModal} onSave={updateTxn} />
      )}

      {/* ══════════════════════════════════════════════════
          EXTEND MODAL
      ══════════════════════════════════════════════════ */}
      {modal === "extend" && editTxn && (
        <ExtendTxnModal txn={editTxn} onClose={closeModal} onExtend={extendTxn} />
      )}

      {/* ══════════════════════════════════════════════════
          DETAIL MODAL (row click)
      ══════════════════════════════════════════════════ */}
      {detailTxn && (
        <TransactionDetailModal
          txn={detailTxn}
          onClose={() => setDetailTxn(null)}
          onReturn={returnTxn}
          onRenew={openExtendModal}
          onEdit={openEditModal}
          onDelete={requestDelete}
          onPayFine={handlePayFine}
          canReturn={canReturn}
          canExtend={canExtend}
          canEdit={canEdit}
          canDelete={canDelete}
          canPayFine={canPayFine}
        />
      )}

      {/* ── Delete confirmation ────────────────────────── */}
      <ConfirmationModal
        isOpen={deleteModal.open}
        title="Delete Transaction"
        message={`Are you sure you want to delete the transaction for "${deleteModal.title}"?`}
        confirmText="Delete" cancelText="Cancel" type="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={hideToast} />
    </div>
  );
}
