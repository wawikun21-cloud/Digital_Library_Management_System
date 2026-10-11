/**
 * features/books/utils/bookApiErrors.js
 *
 * Error handling shared by the book mutations. The former pages/Books.jsx
 * repeated the same server-error mapping block in create and update, and
 * the same first-error focus block twice more.
 */

/**
 * Maps a failed API result onto field errors + a toast.
 * @returns {boolean} true when the result was a failure (handled here).
 */
export function applyServerErrors(result, { setErrors, showToast, fallbackMessage }) {
  if (result.details && typeof result.details === "object") {
    setErrors(prev => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(result.details).map(([k, v]) => [k, String(v)])
      ),
    }));
    // Also show a toast for visibility
    const firstErr = Object.values(result.details)[0];
    showToast(String(firstErr), "error");
  } else {
    showToast(result.error || fallbackMessage, "error");
  }
  return true;
}

/** Focus the first invalid field after a failed validation pass. */
export function focusFirstError(errors) {
  setTimeout(() => {
    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      const el = document.querySelector(`[name="${firstKey}"], [id^="copies"][id*="accession_number"]`);
      el?.focus();
    }
  }, 50);
}
