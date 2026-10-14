// ---------------------------------------------------------
//  tests/bulkCategoryAssignment.test.js
//
//  Unit tests for the pure contracts behind bulk book ->
//  category assignment:
//    * validateBulkAssignPayload (payload guardrails)
//    * shared/bookFilterSql (the single source of truth for book
//      filter predicates — used by the list endpoints AND the
//      bulk assignment, so they can never drift)
//
//  Run: node --test server/tests/bulkCategoryAssignment.test.js
// ---------------------------------------------------------

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateBulkAssignPayload,
  MAX_BULK_IDS,
} = require("../features/organization/organization.validation");
const shared = require("../shared/bookFilterSql");

// ---------------------------------------------------------
//  validateBulkAssignPayload
// ---------------------------------------------------------

test("bulk payload: accepts an ids assignment", () => {
  assert.equal(
    validateBulkAssignPayload({ type: "physical", mode: "ids", book_ids: [1, 2, 3] }),
    null
  );
});

test("bulk payload: accepts a filter assignment with known filters", () => {
  assert.equal(
    validateBulkAssignPayload({
      type: "lexora",
      mode: "filter",
      filters: { search: "hamlet", status: "published", visibility: "public", source_type: "pdf" },
      exclude_ids: [],
    }),
    null
  );
});

test("bulk payload: rejects unknown type / mode", () => {
  assert.match(validateBulkAssignPayload({ type: "other", mode: "filter" }), /type/);
  assert.match(validateBulkAssignPayload({ type: "physical", mode: "all" }), /mode/);
});

test("bulk payload: rejects a non-array or oversized book_ids", () => {
  assert.match(validateBulkAssignPayload({ type: "physical", mode: "ids" }), /book_ids/);
  assert.match(validateBulkAssignPayload({ type: "physical", mode: "ids", book_ids: "1,2" }), /book_ids/);
  const tooMany = Array.from({ length: MAX_BULK_IDS + 1 }, (_, i) => i + 1);
  assert.match(validateBulkAssignPayload({ type: "physical", mode: "ids", book_ids: tooMany }), /book_ids/);
});

test("bulk payload: rejects unknown or non-string filters", () => {
  assert.match(
    validateBulkAssignPayload({ type: "physical", mode: "filter", filters: { genre: "x" } }),
    /Unknown filter 'genre'/
  );
  assert.match(
    validateBulkAssignPayload({ type: "physical", mode: "filter", filters: { status: 5 } }),
    /must be a string/
  );
});

// ---------------------------------------------------------
//  physicalBookFilters — mirrors models/Book.js (the page's
//  `genre` filter targets the collection column; Available /
//  OutOfStock are copies-derived).
// ---------------------------------------------------------

test("physical filters: search is parameterized across the seven list columns", () => {
  const { conditions, params } = shared.physicalBookFilters({ search: "Hamlet" });
  assert.equal(conditions.length, 1);
  assert.equal(conditions[0].match(/LIKE \?/g).length, 7);
  // Never interpolated into the SQL — always bound parameters.
  assert.ok(!conditions[0].includes("Hamlet"));
  assert.equal(params.length, 7);
  assert.ok(params.every((p) => p === "%hamlet%"));
});

test("physical filters: collection (incl. the __NULL__ uncategorized sentinel)", () => {
  const value = shared.physicalBookFilters({ collection: "Reference" });
  assert.deepEqual(value.conditions, ["b.collection = ?"]);
  assert.deepEqual(value.params, ["Reference"]);

  const empty = shared.physicalBookFilters({ collection: "__NULL__" });
  assert.deepEqual(empty.conditions, ["b.collection IS NULL OR b.collection = ''"]);
  assert.deepEqual(empty.params, []);
});

test("physical filters: status keeps the copies-derived semantics", () => {
  assert.deepEqual(shared.physicalBookFilters({ status: "Available" }).conditions, ["cc.avail_copies > 0"]);
  assert.deepEqual(shared.physicalBookFilters({ status: "OutOfStock" }).conditions, ["cc.avail_copies = 0"]);
  const lost = shared.physicalBookFilters({ status: "Lost" });
  assert.deepEqual(lost.conditions, ["b.status = ?"]);
  assert.deepEqual(lost.params, ["Lost"]);
  assert.deepEqual(shared.physicalBookFilters({ status: "All" }).conditions, []);
});

// ---------------------------------------------------------
//  lexoraBookFilters — mirrors models/LexoraBook.js
// ---------------------------------------------------------

test("lexora filters: search covers the four list columns", () => {
  const { conditions, params } = shared.lexoraBookFilters({ search: "Hamlet" });
  assert.equal(conditions.length, 1);
  assert.equal(conditions[0].match(/LIKE \?/g).length, 4);
  assert.equal(params.length, 4);
});

test("lexora filters: status / visibility / source_type / resource_type", () => {
  const { conditions, params } = shared.lexoraBookFilters({
    status: "published",
    visibility: "public",
    source_type: "pdf",
    resource_type: "Book",
  });
  assert.deepEqual(conditions, ["lb.status = ?", "lb.visibility = ?", "lb.source_type = ?", "lb.resource_type = ?"]);
  assert.deepEqual(params, ["published", "public", "pdf", "Book"]);
});

test("lexora filters: empty filters produce nothing", () => {
  assert.deepEqual(shared.lexoraBookFilters({}), { conditions: [], params: [] });
});
