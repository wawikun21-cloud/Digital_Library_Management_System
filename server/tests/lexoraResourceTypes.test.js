const assert = require('node:assert/strict');
const test = require('node:test');
const LexoraBookModel = require('../models/LexoraBook');
const { pool } = require('../config/db');

// The model reaches MySQL through pool.query; a stub keeps these tests
// DB-free while still exercising the real create/update/delete paths.
const originalQuery = pool.query;
let queries;

function stubPool({ usageCount = 0, existingType = null } = {}) {
  queries = [];
  pool.query = async (sql, params) => {
    queries.push({ sql, params });
    if (/^INSERT INTO lexora_books/i.test(sql)) return [{ insertId: 42 }];
    if (/^DELETE/i.test(sql)) return [{ affectedRows: 1 }];
    if (/COUNT\(\*\)/i.test(sql)) return [[{ total: usageCount }]];
    if (/lexora_book_resource_types/i.test(sql) && existingType) return [[existingType]];
    return [[]];
  };
}

test('create() accepts a managed resource type and persists it', async () => {
  stubPool();
  LexoraBookModel._managedResourceTypeNames = async () => ['Open Source', 'Premium'];

  const result = await LexoraBookModel.create({ title: 'Managed Book', resource_type: 'Premium' });

  assert.equal(result.success, true);
  const insert = queries.find((q) => /^INSERT INTO lexora_books/i.test(q.sql));
  assert.ok(insert, 'book INSERT ran');
  assert.ok(insert.sql.includes('resource_type'));
  const columns = insert.sql.match(/\((.*?)\)\s*VALUES/s)[1].split(',').map((c) => c.trim());
  assert.equal(columns.length, insert.params.length, 'column count matches values');
  assert.equal(insert.params[columns.indexOf('resource_type')], 'Premium');
});

test('create() rejects a resource type that is not managed', async () => {
  stubPool();
  LexoraBookModel._managedResourceTypeNames = async () => ['Open Source', 'Premium'];

  const result = await LexoraBookModel.create({ title: 'Bad Book', resource_type: 'Freemium' });

  assert.equal(result.success, false);
  assert.match(result.error, /not a managed resource type/);
  assert.ok(!queries.some((q) => /^INSERT INTO lexora_books/i.test(q.sql)), 'no INSERT attempted');
});

test('create() allows an empty resource type (badge is optional)', async () => {
  stubPool();
  LexoraBookModel._managedResourceTypeNames = async () => ['Open Source', 'Premium'];

  const result = await LexoraBookModel.create({ title: 'Untyped Book', resource_type: '' });

  assert.equal(result.success, true);
});

test('update() keeps a legacy stored value but rejects a new unmanaged one', async () => {
  LexoraBookModel._managedResourceTypeNames = async () => ['Open Source', 'Premium'];

  stubPool();
  LexoraBookModel.getById = async () => ({
    success: true,
    data: { id: 7, resource_type: 'E-Book', title: 'Legacy' },
  });
  const unchanged = await LexoraBookModel.update(7, { resource_type: 'E-Book' });
  assert.equal(unchanged.success, true, 'legacy value preserved on untouched save');

  stubPool();
  LexoraBookModel.getById = async () => ({
    success: true,
    data: { id: 7, resource_type: 'E-Book', title: 'Legacy' },
  });
  const switched = await LexoraBookModel.update(7, { resource_type: 'Freemium' });
  assert.equal(switched.success, false);
  assert.match(switched.error, /not a managed resource type/);
});

test('update() accepts switching to a managed resource type', async () => {
  stubPool();
  LexoraBookModel._managedResourceTypeNames = async () => ['Open Source', 'Premium'];
  LexoraBookModel.getById = async () => ({
    success: true,
    data: { id: 7, resource_type: 'E-Book', title: 'Legacy' },
  });

  const result = await LexoraBookModel.update(7, { resource_type: 'Open Source' });

  assert.equal(result.success, true);
  const update = queries.find((q) => /^UPDATE lexora_books/i.test(q.sql));
  assert.ok(update.sql.includes('`resource_type` = ?'));
});

test('deleteResourceType refuses while books still use the type', async () => {
  stubPool({ usageCount: 3, existingType: { id: 2, name: 'Premium', slug: 'premium' } });

  const result = await LexoraBookModel.deleteResourceType(2);

  assert.equal(result.success, false);
  assert.match(result.error, /3 books still use "Premium"/);
  assert.ok(!queries.some((q) => /^DELETE/i.test(q.sql)), 'no DELETE ran');
});

test('deleteResourceType deletes an unused type', async () => {
  stubPool({ usageCount: 0, existingType: { id: 2, name: 'Premium', slug: 'premium' } });

  const result = await LexoraBookModel.deleteResourceType(2);

  assert.equal(result.success, true);
  assert.ok(queries.some((q) => /^DELETE/i.test(q.sql)), 'DELETE ran');
});

test('createResourceType reuses an existing type on duplicate slug', async () => {
  stubPool({ existingType: { id: 2, name: 'Premium', slug: 'premium' } });
  pool.query = async (sql) => {
    queries.push({ sql });
    if (/^INSERT INTO lexora_book_resource_types/i.test(sql)) {
      const err = new Error('Duplicate entry');
      err.code = 'ER_DUP_ENTRY';
      throw err;
    }
    return [[{ id: 2, name: 'Premium', slug: 'premium' }]];
  };

  const result = await LexoraBookModel.createResourceType('Premium');

  assert.equal(result.success, true);
  assert.equal(result.data.id, 2);
});

test.after(() => { pool.query = originalQuery; });
