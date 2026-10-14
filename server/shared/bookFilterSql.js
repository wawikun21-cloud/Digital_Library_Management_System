// ─────────────────────────────────────────────────────────
//  shared/bookFilterSql.js
//
//  Book filter predicates, ONE source of truth.
//
//  Both the catalog list endpoints (models/Book.js,
//  models/LexoraBook.js) and the organization feature's bulk
//  category assignment (features/organization) build their WHERE
//  clauses here, so "assign every book matching these filters" can
//  never drift from "what the book list shows".
//
//  Contract:
//   • every function returns parameterized fragments
//     ({ conditions: string[], params: [] }) — never interpolated
//     user input;
//   • physical predicates expect the books table aliased `b` and the
//     copies aggregate joined via BOOK_COPIES_JOIN (status
//     Available / OutOfStock are copies-derived, exactly like the
//     list endpoints);
//   • lexora predicates expect lexora_books aliased `lb`.
//
//  The physical "collection" filter keeps the historical quirk that
//  the list API's `genre` query param filters the collection column,
//  and the "__NULL__" sentinel means "uncategorized" — mirrored here
//  on purpose so the bulk path matches the list path byte for byte.
// ─────────────────────────────────────────────────────────

/** Copies aggregate shared by every physical-book list/bulk query. */
const BOOK_COPIES_JOIN = `
       LEFT JOIN (
         SELECT book_id,
                COUNT(*)                  AS total_copies,
                SUM(status = 'Available') AS avail_copies
         FROM   book_copies WHERE is_deleted = 0 GROUP BY book_id
       ) cc ON cc.book_id = b.id`;

const PHYSICAL_SEARCH_COLUMNS = [
  "b.title",
  "b.author",
  "b.authors",
  "b.isbn",
  "b.genre",
  "b.accessionNumber",
  "b.callNumber",
];

const LEXORA_SEARCH_COLUMNS = [
  "LOWER(REPLACE(REPLACE(title, '\\n', ' '), '\\r', ' '))",
  "LOWER(COALESCE(short_description,''))",
  "LOWER(COALESCE(author,''))",
  "LOWER(COALESCE(subject_course,''))",
];

function likeParams(term) {
  return `%${String(term).toLowerCase()}%`;
}

/**
 * Physical-book predicates. Supported filters: search, collection
 * (incl. "__NULL__" for uncategorized), status (Available /
 * OutOfStock are copies-derived; any other value filters b.status).
 */
function physicalBookFilters({ search, collection, status } = {}, alias = "b") {
  const conditions = [];
  const params = [];

  if (search) {
    const like = likeParams(search);
    conditions.push(`(${PHYSICAL_SEARCH_COLUMNS.map((col) => `${col} LIKE ?`).join(" OR ")})`);
    PHYSICAL_SEARCH_COLUMNS.forEach(() => params.push(like));
  }

  if (collection === "__NULL__") {
    conditions.push(`${alias}.collection IS NULL OR ${alias}.collection = ''`);
  } else if (collection) {
    conditions.push(`${alias}.collection = ?`);
    params.push(collection);
  }

  if (status && status !== "All") {
    if (status === "Available") conditions.push("cc.avail_copies > 0");
    else if (status === "OutOfStock") conditions.push("cc.avail_copies = 0");
    else {
      conditions.push(`${alias}.status = ?`);
      params.push(status);
    }
  }

  return { conditions, params };
}

/**
 * Digital-book predicates. Supported filters: search, status,
 * visibility, source_type, resource_type.
 */
function lexoraBookFilters({ search, status, visibility, source_type: sourceType, resource_type: resourceType } = {}, alias = "lb") {
  const conditions = [];
  const params = [];

  if (search) {
    const like = likeParams(search);
    conditions.push(`(${LEXORA_SEARCH_COLUMNS.map((col) => `${col} LIKE ?`).join(" OR ")})`);
    LEXORA_SEARCH_COLUMNS.forEach(() => params.push(like));
  }
  if (status) {
    conditions.push(`${alias}.status = ?`);
    params.push(status);
  }
  if (visibility) {
    conditions.push(`${alias}.visibility = ?`);
    params.push(visibility);
  }
  if (sourceType) {
    conditions.push(`${alias}.source_type = ?`);
    params.push(sourceType);
  }
  if (resourceType) {
    conditions.push(`${alias}.resource_type = ?`);
    params.push(resourceType);
  }

  return { conditions, params };
}

module.exports = {
  BOOK_COPIES_JOIN,
  physicalBookFilters,
  lexoraBookFilters,
};
