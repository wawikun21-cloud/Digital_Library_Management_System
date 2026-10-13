const assert = require('node:assert/strict');
const test = require('node:test');
const LexoraBookModel = require('../models/LexoraBook');

// _sanitizeBookData is pure, so the reader-setting normalisation can be
// verified without a database — it is the contract the reader payload,
// the create INSERT and the update SET clause all depend on.
function flags(overrides = {}) {
  return LexoraBookModel._sanitizeBookData({
    title: 'Test Book',
    ...overrides,
  });
}

test('explicit disable values turn a reader flag off', () => {
  for (const off of [false, 0, '0', 'false']) {
    assert.equal(flags({ allow_text_copy: off }).allow_text_copy, 0, `allow_text_copy=${String(off)}`);
    assert.equal(flags({ allow_screenshot: off }).allow_screenshot, 0, `allow_screenshot=${String(off)}`);
  }
});

test('explicit enable values turn a reader flag on', () => {
  for (const on of [true, 1, '1', 'true']) {
    assert.equal(flags({ allow_text_copy: on }).allow_text_copy, 1, `allow_text_copy=${String(on)}`);
    assert.equal(flags({ allow_screenshot: on }).allow_screenshot, 1, `allow_screenshot=${String(on)}`);
  }
});

test('a missing flag defaults to allowed so omission cannot lock a book', () => {
  assert.equal(flags().allow_text_copy, 1);
  assert.equal(flags().allow_screenshot, 1);
  assert.equal(flags({ allow_text_copy: undefined }).allow_text_copy, 1);
  assert.equal(flags({ allow_text_copy: null }).allow_text_copy, 1);
  assert.equal(flags({ allow_text_copy: 'maybe' }).allow_text_copy, 1);
});

test('flags survive alongside the rest of the sanitized payload', () => {
  const data = flags({ allow_text_copy: false, allow_screenshot: true });
  assert.equal(data.title, 'Test Book');
  assert.equal(data.status, 'draft');
  assert.equal(data.visibility, 'public');
  assert.equal(data.allow_text_copy, 0);
  assert.equal(data.allow_screenshot, 1);
});
