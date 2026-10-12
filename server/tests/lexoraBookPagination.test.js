/**
 * Pagination and sorting behaviour of LexoraBookModel.getAll.
 *
 * The pool is stubbed so these run without MySQL; they pin the SQL shape
 * (LIMIT/OFFSET placeholders, parameter order, whitelisted ORDER BY) and
 * the pagination metadata the client now depends on.
 */
const assert = require("node:assert/strict");
const test = require("node:test");

const db = require("../config/db");
const LexoraBook = require("../models/LexoraBook");

const realQuery = db.pool.query.bind(db.pool);

/** Records every query; answers count/metadata/row queries. */
function stubPool(rows = []) {
  const seen = [];
  db.pool.query = async (sql, params = []) => {
    seen.push({ sql, params });
    if (/COUNT\(\*\) AS count/.test(sql)) return [[{ count: 42 }]];
    if (/SELECT DISTINCT/.test(sql)) return [[]];
    return [rows];
  };
  return seen;
}

test.afterEach(() => { db.pool.query = realQuery; });

test("paged requests use LIMIT/OFFSET placeholders and report totals", async () => {
  const seen = stubPool();
  const result = await LexoraBook.getAll({ page: 3, pageSize: 10 });

  const rowsQuery = seen.find((q) => /FROM lexora_books/.test(q.sql) && /LIMIT/.test(q.sql));
  assert.ok(rowsQuery, "expected a paginated rows query");
  assert.match(rowsQuery.sql, /LIMIT \? OFFSET \?/);
  assert.deepEqual(rowsQuery.params.slice(-2), [10, 20], "LIMIT=pageSize, OFFSET=(page-1)*pageSize");

  assert.equal(result.pagination, undefined === result.pagination
    ? undefined
    : result.pagination);
  assert.deepEqual(result.pagination, { page: 3, pageSize: 10, totalItems: 42, totalPages: 5 });
});

test("unpaged requests keep the previous full-list behaviour", async () => {
  const seen = stubPool();
  const result = await LexoraBook.getAll({ search: "marketing" });

  const rowsQuery = seen.find((q) => /FROM lexora_books/.test(q.sql));
  assert.ok(!/LIMIT/.test(rowsQuery.sql), "no page requested → no LIMIT");
  assert.equal(result.pagination, undefined, "pagination metadata is omitted");
  assert.ok(!/COUNT/.test(seen.map((q) => q.sql).join(" ")), "no count query without paging");
});

test("sortBy is whitelisted and unknown values fall back to newest", async () => {
  let seen = stubPool();
  await LexoraBook.getAll({ page: 1, pageSize: 5, sortBy: "title" });
  let rowsQuery = seen.find((q) => /FROM lexora_books/.test(q.sql) && /LIMIT/.test(q.sql));
  assert.match(rowsQuery.sql, /ORDER BY title ASC/);

  seen = stubPool();
  await LexoraBook.getAll({ page: 1, pageSize: 5, sortBy: "id; DROP TABLE lexora_books" });
  rowsQuery = seen.find((q) => /FROM lexora_books/.test(q.sql) && /LIMIT/.test(q.sql));
  assert.match(rowsQuery.sql, /ORDER BY created_at DESC/);
  assert.ok(!/DROP TABLE/.test(rowsQuery.sql));
});

test("search params stay parameterised after adding author and subject_course", async () => {
  const seen = stubPool();
  await LexoraBook.getAll({ page: 1, pageSize: 5, search: "Rowling" });

  const rowsQuery = seen.find((q) => /FROM lexora_books/.test(q.sql) && /LIMIT/.test(q.sql));
  assert.equal((rowsQuery.sql.match(/\?/g) || []).length >= 6, true, "where + limit/offset placeholders");
  assert.equal(rowsQuery.params.filter((p) => typeof p === "string" && p.includes("rowling")).length, 4);
});

test("getPublic forces the public filters and still paginates", async () => {
  const seen = stubPool();
  const result = await LexoraBook.getPublic({ page: 2, pageSize: 12 });

  const rowsQuery = seen.find((q) => /FROM lexora_books/.test(q.sql) && /LIMIT/.test(q.sql));
  assert.match(rowsQuery.sql, /\bstatus = \?/);
  assert.match(rowsQuery.sql, /\bvisibility = \?/);
  assert.ok(rowsQuery.params.includes("published") && rowsQuery.params.includes("public"));
  assert.equal(result.pagination.page, 2);
  assert.equal(result.pagination.pageSize, 12);
});
