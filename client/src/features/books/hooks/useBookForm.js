/**
 * features/books/hooks/useBookForm.js
 *
 * Book modal lifecycle: form state, the quantity→status sync rule, the
 * add / view / edit flows, and the create / update mutations. Extracted
 * from the former pages/Books.jsx.
 */

import { useState, useEffect, useCallback } from "react";
import booksApi from "../../../services/api/booksApi";
import { EMPTY_FORM } from "../constants/bookForm";
import { validateBookForm } from "../validation/bookValidation";
import { applyServerErrors, focusFirstError } from "../utils/bookApiErrors";

export function useBookForm({ showToast, onCreated, onUpdated, onSaved }) {
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});
  const [selectedBook, setSelectedBook] = useState(null);
  const [modalMode, setModalMode] = useState("add");

  // Body scroll lock while the modal is open.
  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modal]);

  // quantity 0 + "Available" → auto flip status to OutOfStock.
  useEffect(() => {
    if (form.quantity === 0 && form.status === "Available") {
      setForm(f => ({ ...f, status: "OutOfStock" }));
    }
  }, [form.quantity]);

  /** Open the add modal in one of the toolbar modes: manual | import | lexora. */
  const openAdd = useCallback((mode = "manual") => {
    setForm({ ...EMPTY_FORM, _mode: mode });
    setErrors({});
    setModalMode("add");
    setModal(true);
  }, []);

  const openView = useCallback((book) => {
    setSelectedBook(book);
    setModalMode("view");
    setForm({ ...EMPTY_FORM, ...book, _mode: "manual" });
    setModal(true);
  }, []);

  const openEdit = useCallback(async (book) => {
    setSelectedBook(book);
    setModalMode("edit");
    try {
      const copyResult = await booksApi.fetchBookCopies(book.id);
      setForm({
        ...EMPTY_FORM, ...book, _mode: "manual",
        copies: copyResult.success ? (copyResult.data || []) : [],
      });
    } catch {
      setForm({ ...EMPTY_FORM, ...book, _mode: "manual", copies: [] });
    }
    setErrors({});
    setModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setModal(false);
    setSelectedBook(null);
    setModalMode("add");
  }, []);

  const runValidation = () => {
    const e = validateBookForm(form);
    if (Object.keys(e).length) {
      setErrors(e);
      focusFirstError(e);
      return false;
    }
    return true;
  };

  const submit = useCallback(async () => {
    if (!runValidation()) return;
    try {
      const result = await booksApi.createBook(form);
      if (result.success) {
        onCreated?.(result.data);
        setModal(false);
        showToast("Book added successfully!", "success");
        await onSaved?.();
      } else {
        applyServerErrors(result, { setErrors, showToast, fallbackMessage: "Failed to add book" });
      }
    } catch (err) {
      console.error("Add book error:", err);
      showToast("Failed to connect to server", "error");
    }
  }, [form, onCreated, onSaved, showToast]);

  const update = useCallback(async () => {
    if (!runValidation()) return;
    try {
      const result = await booksApi.updateBook(selectedBook.id, form);
      if (result.success) {
        onUpdated?.(result.data);
        setModal(false);
        showToast("Book updated successfully!", "success");
        await onSaved?.();
      } else {
        applyServerErrors(result, { setErrors, showToast, fallbackMessage: "Failed to update book" });
      }
    } catch (err) {
      console.error("Update book error:", err);
      showToast("Failed to connect to server", "error");
    }
  }, [form, selectedBook, onUpdated, onSaved, showToast]);

  // ── Import complete: do a fresh fetch so copy counts are accurate ──
  const handleImportComplete = useCallback(async (importedBooks) => {
    setModal(false);
    const total = importedBooks.length;
    const totalCopies = importedBooks.reduce((s, b) => s + (b.quantity ?? 0), 0);
    showToast(
      `Imported ${total} title${total !== 1 ? "s" : ""} · ${totalCopies} cop${totalCopies !== 1 ? "ies" : "y"} saved`,
      "success"
    );
    await onSaved?.();
  }, [showToast, onSaved]);

  return {
    modal, modalMode, form, setForm, errors, setErrors, selectedBook,
    openAdd, openView, openEdit, closeModal, submit, update, handleImportComplete,
  };
}
