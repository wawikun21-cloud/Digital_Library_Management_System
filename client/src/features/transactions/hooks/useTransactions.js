/**
 * features/transactions/hooks/useTransactions.js
 *
 * Transaction list + real-time sync + mutations for the borrowed-books
 * page. Extracted from the component body of the former pages/Borrowed.jsx.
 */

import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "../../../hooks/useWebsocket";
import transactionsApi from "../api/transactionsApi";
import { sanitizeTxns } from "../utils/transactionDates";

export function useTransactions({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [txns, setTxns]       = useState([]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await transactionsApi.fetchTransactions();
      const data = res;
      if (data.success) setTxns(sanitizeTxns(data.data || []));
      else showToast("Failed to load transactions", "error");
    } catch { showToast("Could not connect to server", "error"); }
    finally  { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // ── Real-time transaction sync via Socket.io ──────────
  //
  // When another browser tab or a different staff member performs a
  // borrow / return / delete / fine-paid action, the server broadcasts
  // the event.  We apply the update directly to local state so this
  // view stays current without a manual refresh.
  //
  // Duplicate-guard: if our own mutation already updated state (optimistic
  // update in the mutation handlers), the WS event will carry the same id —
  // the map/filter will no-op harmlessly.
  useWebSocket({
    // transaction:new — prepend the new transaction
    onTransactionNew: (data) => {
      if (!data?.id) return;
      setTxns(prev => {
        // Avoid duplicates if our own POST already added it
        if (prev.some(t => t.id === data.id)) return prev;
        return [sanitizeTxns([data])[0], ...prev];
      });
    },

    // transaction:returned — update the matching row in-place
    onTransactionReturned: (data) => {
      if (!data?.id) return;
      setTxns(prev =>
        prev.map(t => t.id === data.id ? { ...t, ...sanitizeTxns([data])[0] } : t)
      );
    },

    // transaction:deleted — remove the row
    onTransactionDeleted: (data) => {
      if (!data?.id) return;
      setTxns(prev => prev.filter(t => t.id !== data.id));
    },

    // transaction:fine_paid — mark the fine paid on the row
    onTransactionFinePaid: (data) => {
      if (!data?.id) return;
      setTxns(prev =>
        prev.map(t => t.id === data.id ? { ...t, ...sanitizeTxns([data])[0] } : t)
      );
    },
  });

  // ── Save borrow (creates one transaction per book) ────
  const borrowBooks = useCallback(async (form) => {
    try {
      const results = await Promise.all(form.books.map(book =>
        transactionsApi.createTransaction({
          book_id:           book.id,
          accession_number:  book.accessionNumber || null,
          borrower_type:     form.borrower_type,
          borrower_name:     form.borrower_name,
          borrower_id_number:form.borrower_id_number || null,
          borrower_contact:  form.borrower_contact   || null,
          borrower_email:    form.borrower_email     || null,
          borrower_course:   form.borrower_course    || null,
          borrower_yr_level: form.borrower_yr_level  || null,
          borrow_date:       form.borrow_date,
          due_date:          form.due_date,
        })
      ));

      const failed = results.filter(r => !r.success);
      if (failed.length) {
        showToast(failed[0].error || "Some books failed to borrow", "error");
        return false;
      }

      const newTxns = sanitizeTxns(results.map(r => r.data));
      // Guard against duplicates: the WS onTransactionNew event may fire
      // before or after this optimistic update, inserting the same id twice.
      setTxns(p => {
        const existingIds = new Set(p.map(t => t.id));
        return [...newTxns.filter(t => !existingIds.has(t.id)), ...p];
      });
      showToast(`${form.books.length} book(s) borrowed successfully!`, "success");
      return true;
    } catch { showToast("Failed to connect to server", "error"); return false; }
  }, [showToast]);

  // ── Save edit ─────────────────────────────────────────
  const updateTxn = useCallback(async (id, form) => {
    try {
      const result = await transactionsApi.updateTransaction(id, {
        borrower_name:      form.borrower_name,
        borrower_id_number: form.borrower_id_number || null,
        borrower_contact:   form.borrower_contact   || null,
        borrower_email:     form.borrower_email     || null,
        borrower_course:    form.borrower_course    || null,
        borrower_yr_level:  form.borrower_yr_level  || null,
        borrow_date:        form.borrow_date,
        due_date:           form.due_date,
      });
      if (result.success) {
        setTxns(p => p.map(t => t.id === id ? sanitizeTxns([result.data])[0] : t));
        showToast("Transaction updated", "success");
        return true;
      }
      showToast(result.error || "Failed to update", "error");
      return false;
    } catch { showToast("Failed to connect to server", "error"); return false; }
  }, [showToast]);

  // ── Extend due date ───────────────────────────────────
  const extendTxn = useCallback(async (id, days) => {
    try {
      const result = await transactionsApi.extendDueDate(id, days);
      if (result.success) {
        setTxns(p => p.map(t => t.id === id ? sanitizeTxns([result.data])[0] : t));
        showToast(`Due date renewed by ${days} day(s)`, "success");
        return true;
      }
      showToast(result.error || "Failed to renew", "error");
      return false;
    } catch { showToast("Failed to connect to server", "error"); return false; }
  }, [showToast]);

  // ── Return book ───────────────────────────────────────
  const returnTxn = useCallback(async (id) => {
    try {
      const result = await transactionsApi.returnBook(id);
      if (result.success) {
        setTxns(p => p.map(t => t.id === id ? sanitizeTxns([result.data])[0] : t));
        showToast("Book returned successfully!", "success");
      } else { showToast(result.error || "Failed to return", "error"); }
    } catch { showToast("Failed to connect to server", "error"); }
  }, [showToast]);

  // ── Delete ────────────────────────────────────────────
  const deleteTxn = useCallback(async (id) => {
    try {
      const result = await transactionsApi.deleteTransaction(id);
      if (result.success) {
        setTxns(p => p.filter(t => t.id !== id));
        showToast("Transaction deleted", "success");
      } else { showToast(result.error || "Failed to delete", "error"); }
    } catch { showToast("Failed to connect to server", "error"); }
  }, [showToast]);

  // ── Pay fine ─────────────────────────────────────────
  const payFineTxn = useCallback(async (id, onSuccess) => {
    try {
      const result = await transactionsApi.payFine(id);
      if (result.success) {
        const updated = sanitizeTxns([result.data])[0];
        setTxns(p => p.map(t => t.id === id ? updated : t));
        onSuccess?.(updated);
        showToast("Fine marked as paid!", "success");
      } else { showToast(result.error || "Failed to mark fine as paid", "error"); }
    } catch { showToast("Failed to connect to server", "error"); }
  }, [showToast]);

  return {
    txns, loading, fetchTransactions,
    borrowBooks, updateTxn, extendTxn, returnTxn, deleteTxn, payFineTxn,
  };
}
