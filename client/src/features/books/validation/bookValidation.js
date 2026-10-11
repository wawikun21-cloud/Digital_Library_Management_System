/**
 * features/books/validation/bookValidation.js
 *
 * Book form validation. Extracted verbatim from the `validate()` function
 * in the former pages/Books.jsx so the form (and tests) can reuse it.
 *
 * Returns a flat errors object keyed by field / `copies[<i>].accession_number`.
 */
export function validateBookForm(form) {
  const e = {};

  // ── Required: Title ───────────────────────────────────────────────────────
  if (!form.title?.trim()) {
    e.title = "Title is required";
  }

  // ── Required: Accession numbers for all copies ───────────────────────────
  const copies = Array.isArray(form.copies) ? form.copies : [];
  copies.forEach((c, i) => {
    const acc = (c.accession_number || "").trim();
    if (!acc) {
      e[`copies[${i}].accession_number`] = "Accession number is required";
    }
  });

  // ── Uniqueness check: duplicate accession numbers within the form ─────────
  const seen = {};
  copies.forEach((c, i) => {
    const val = (c.accession_number || "").trim().toLowerCase();
    if (!val) return; // skip empty — already caught above
    if (seen[val] !== undefined) {
      e[`copies[${seen[val]}].accession_number`] = "Duplicate accession number";
      e[`copies[${i}].accession_number`]         = "Duplicate accession number";
    } else {
      seen[val] = i;
    }
  });

  return e;
}
