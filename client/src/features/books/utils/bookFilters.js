/**
 * features/books/utils/bookFilters.js
 *
 * Pure catalog filtering and sorting. Extracted from the `filtered`
 * useMemo of the former pages/Books.jsx.
 */

export function isOutOfStock(book) {
  const effectiveStatus = book.display_status || book.status;
  const availCopies = book.available_copies;
  if (effectiveStatus === "OutOfStock") return true;
  if (availCopies !== undefined && availCopies !== null) return Number(availCopies) === 0;
  return book.quantity === 0;
}

const SEARCH_KEYS = [
  "title", "author", "genre", "isbn", "publisher",
  "accessionNumber", "accession_list", "collection",
];

/**
 * @param {Array}  books
 * @param {object} filters { query, statusFilter, genreFilter, collectionFilter }
 * @returns {Array} filtered books (unsorted — use sortBooks for ordering)
 */
export function filterBooks(books, { query, statusFilter, genreFilter, collectionFilter }) {
  const q = (query || "").toLowerCase().trim();
  return books.filter(b => {
    if (q && !SEARCH_KEYS.some(k => b[k]?.toString().toLowerCase().includes(q))) return false;
    if (statusFilter !== "All" && statusFilter === "OutOfStock" && !isOutOfStock(b)) return false;
    if (statusFilter !== "All" && statusFilter !== "OutOfStock" && (b.display_status || b.status) !== statusFilter) return false;
    if (genreFilter && b.genre !== genreFilter) return false;
    if (collectionFilter === "__NULL__") {
      return !b.collection || b.collection.trim() === "";
    } else if (collectionFilter && b.collection !== collectionFilter) {
      return false;
    }
    return true;
  });
}

/** In-place sort, matching the original's mutating behaviour. */
export function sortBooks(result, sortBy) {
  if (sortBy === "title")  result.sort((a, b) => a.title.localeCompare(b.title));
  if (sortBy === "author") result.sort((a, b) => (a.author || "").localeCompare(b.author || ""));
  if (sortBy === "year")   result.sort((a, b) => (b.year || 0) - (a.year || 0));
  return result;
}

/** Distinct sorted collections / genres present in the list. */
export const distinctSorted = (books, key) =>
  [...new Set(books.map(b => b[key]).filter(Boolean))].sort();
