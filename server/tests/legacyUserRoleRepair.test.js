// ─────────────────────────────────────────────────────────
//  tests/legacyUserRoleRepair.test.js
//
//  Regression test for the boot-time user-role repair.
//
//  The repair used to run `UPDATE users SET role = 'super_admin' WHERE
//  role = '' OR role = 'admin'` on every server start, back from when
//  'admin' was the single top role. Now 'admin' is a real role, so that
//  promotion silently undid every super_admin → admin demotion on the
//  next restart — and because super_admin short-circuits every permission
//  check, the demoted user's permission restrictions stopped applying
//  too. The repair must only ever touch genuinely unroled ('') rows.
//
//  Run: node --test server/tests/legacyUserRoleRepair.test.js
// ─────────────────────────────────────────────────────────

const test = require("node:test");
const assert = require("node:assert/strict");

const { repairLegacyUserRoles } = require("../config/db");

/** Minimal connection stub that records every query it is given. */
function fakeConn(selectRows) {
  const calls = [];
  return {
    calls,
    async query(sql) {
      calls.push(sql);
      if (sql.startsWith("SELECT id FROM users")) return [selectRows];
      return [{ affectedRows: selectRows.length }];
    },
  };
}

const updateOf = (conn) => conn.calls.find((sql) => sql.startsWith("UPDATE users"));

test("repair: promotes legacy blank-role rows to super_admin", async () => {
  const conn = fakeConn([{ id: 1 }, { id: 2 }]);
  const promoted = await repairLegacyUserRoles(conn);
  assert.equal(promoted, 2);

  const update = updateOf(conn);
  assert.ok(update, "expected an UPDATE users query");
  assert.match(update, /role = 'super_admin'/);
});

test("repair: never rewrites the 'admin' role (demotions must survive a restart)", async () => {
  const conn = fakeConn([{ id: 7 }]);

  const promoted = await repairLegacyUserRoles(conn);

  // Even when rows are repaired, the WHERE clause must not mention 'admin'
  // — selecting or updating it is what re-promoted demoted users on boot.
  const select = conn.calls.find((sql) => sql.startsWith("SELECT id FROM users"));
  const update = updateOf(conn);
  assert.ok(promoted >= 0);
  assert.ok(!select.includes("'admin'"), "SELECT must not match admin users");
  assert.ok(!update.includes("'admin'"), "UPDATE must not rewrite admin users");
  assert.ok(!/[^_]'admin'/.test(update.replace(/super_admin/g, "")), "UPDATE must only write super_admin");
});

test("repair: no blank-role rows means no write at all", async () => {
  const conn = fakeConn([]);
  const promoted = await repairLegacyUserRoles(conn);
  assert.equal(promoted, 0);
  assert.equal(updateOf(conn), undefined, "must not UPDATE when nothing to repair");
});
