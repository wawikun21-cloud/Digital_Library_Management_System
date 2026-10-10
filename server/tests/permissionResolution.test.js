// ─────────────────────────────────────────────────────────
//  tests/permissionResolution.test.js
//  Unit tests for the pure resolution helpers:
//  parseActions + applyOverride.
//
//  Run: node --test server/tests/permissionResolution.test.js
// ─────────────────────────────────────────────────────────

const test = require("node:test");
const assert = require("node:assert/strict");

const { parseActions, applyOverride } = require("../features/roles/roles.service");

// ── parseActions ──────────────────────────────────────────
test("parseActions: null / undefined / empty string mean 'all defined'", () => {
  assert.equal(parseActions(null), null);
  assert.equal(parseActions(undefined), null);
  assert.equal(parseActions(""), null);
  assert.equal(parseActions("   "), null);
});

test("parseActions: arrays are de-duplicated and trimmed", () => {
  assert.deepEqual(parseActions(["view", "view", " edit "]), ["view", "edit"]);
  assert.deepEqual(parseActions([]), []);
});

test("parseActions: JSON strings are parsed (mysql2 may return raw text)", () => {
  assert.deepEqual(parseActions('["view","create"]'), ["view", "create"]);
  assert.deepEqual(parseActions("[]"), []);
});

test("parseActions: a JSON scalar string still yields an action list", () => {
  assert.deepEqual(parseActions('"view"'), ["view"]);
  assert.deepEqual(parseActions("view,create"), ["view", "create"]);
});

test("parseActions: unusable values fall back to the permission name", () => {
  assert.equal(parseActions(null), null);
  assert.equal(parseActions(undefined), null);
  assert.equal(parseActions("   "), null);
  assert.deepEqual(parseActions(42, "view_reports"), ["view"]);
  assert.deepEqual(parseActions({ actions: ["view"] }, "manage_books"), ["view", "create", "edit", "delete"]);
  assert.deepEqual(parseActions(42, "tools.download"), ["view", "download"]);
  assert.equal(parseActions(42), null);
  assert.equal(parseActions(42, "something_unmatched"), null);
});

test("parseActions: non-string entries are dropped", () => {
  assert.deepEqual(parseActions(["view", 3, null, "edit"]), ["view", "edit"]);
});

// ── applyOverride ─────────────────────────────────────────
const DEFINED = ["view", "create", "edit", "delete"];

test("applyOverride: granted=false drops the permission", () => {
  assert.deepEqual(applyOverride(null, DEFINED, { granted: false, actions: null }), []);
  assert.deepEqual(applyOverride(["view"], DEFINED, { granted: false, actions: ["view"] }), []);
});

test("applyOverride: actions=null keeps the full role set", () => {
  assert.deepEqual(applyOverride(null, DEFINED, { granted: true, actions: null }), DEFINED);
  assert.deepEqual(applyOverride(["view", "edit"], DEFINED, { granted: true, actions: null }), ["view", "edit"]);
});

test("applyOverride: explicit actions intersect role, override and defined", () => {
  assert.deepEqual(
    applyOverride(["view", "create", "delete"], DEFINED, { granted: true, actions: ["view", "edit"] }),
    ["view"]
  );
  assert.deepEqual(
    applyOverride(null, DEFINED, { granted: true, actions: ["view", "delete"] }),
    ["view", "delete"]
  );
});

test("applyOverride: an action outside the defined set never appears", () => {
  assert.deepEqual(
    applyOverride(["view"], DEFINED, { granted: true, actions: ["view", "publish"] }),
    ["view"]
  );
});

test("applyOverride: empty result means the permission is dropped", () => {
  assert.deepEqual(
    applyOverride(["view"], DEFINED, { granted: true, actions: ["create"] }),
    []
  );
  assert.deepEqual(applyOverride(["view"], DEFINED, { granted: true, actions: [] }), []);
});

test("applyOverride: role narrowing still applies when role has a subset", () => {
  // role narrowed to view+edit, override asks for create → nothing left
  assert.deepEqual(applyOverride(["view", "edit"], DEFINED, { granted: true, actions: ["create"] }), []);
});

test("applyOverride: no override object behaves like an empty grant", () => {
  assert.deepEqual(applyOverride(["view"], DEFINED, null), []);
  assert.deepEqual(applyOverride(["view"], DEFINED, undefined), []);
});
