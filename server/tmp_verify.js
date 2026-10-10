const { pool } = require("../server/config/db");
const fs = require("node:fs");

const DB = "u195318110_baa_lms_task";
const dumpPath = "C:\\Users\\wawik\\Downloads\\u195318110_BAA_lms_task.sql";

(async () => {
  try {
    const [liveRows] = await pool.query(
      `SELECT TABLE_NAME, TABLE_TYPE, TABLE_ROWS, ENGINE
       FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
      [DB]
    );
    const live = new Map(liveRows.map((r) => [r.TABLE_NAME, r]));
    const liveTables = [...live.keys()];

    const text = fs.readFileSync(dumpPath, "utf8");
    const dumpTables = [...text.matchAll(/CREATE TABLE `([^`]+)`/g)].map((m) => m[1]);

    console.log(`Dump tables: ${dumpTables.length} | Live tables: ${liveTables.length}`);

    const missing = dumpTables.filter((t) => !live.has(t));
    const extra = liveTables.filter((t) => !dumpTables.includes(t));
    console.log(`Missing in live DB: ${missing.length ? missing.join(", ") : "none"}`);
    console.log(`Extra in live DB:   ${extra.length ? extra.join(", ") : "none"}`);

    // Views should be views, not tables.
    const views = liveTables.filter((t) => live.get(t).TABLE_TYPE === "VIEW");
    const realTables = liveTables.filter((t) => live.get(t).TABLE_TYPE === "BASE TABLE");
    console.log(`\nBase tables: ${realTables.length} | Views: ${views.length}`);
    console.log(`Views: ${views.join(", ") || "none"}`);

    // Column-level comparison for the tables we care most about.
    const KEY = ["roles", "permissions", "role_permissions", "users", "courses"];
    for (const name of KEY) {
      const [dumpCols] = await (async () => {
        // pull the CREATE TABLE block out of the dump and count columns
        const start = text.indexOf(`CREATE TABLE \`${name}\``);
        if (start === -1) return [[]];
        const end = text.indexOf("\n)", start);
        const block = text.slice(start, end);
        return [[{ n: (block.match(/^\s+`/gm) || []).length }]];
      })();
      const [liveCols] = await pool.query(
        `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [DB, name]
      );
      const status = dumpCols[0]?.n === liveCols[0].n ? "OK" : "MISMATCH";
      console.log(`  ${status.padEnd(9)} ${name}: dump=${dumpCols[0]?.n} live=${liveCols[0].n}`);
    }

    // Exact row counts for the populated tables.
    const [pop] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
      [DB]
    );
    let total = 0;
    const zero = [];
    for (const r of pop) {
      const [c] = await pool.query(`SELECT COUNT(*) AS n FROM \`${DB}\`.\`${r.TABLE_NAME}\``);
      total += Number(c[0].n);
      if (Number(c[0].n) === 0) zero.push(r.TABLE_NAME);
    }
    console.log(`\nExact total rows: ${total}`);
    console.log(`Empty base tables: ${zero.length}`);
  } catch (err) {
    console.error("ERR", err.message);
  }
  process.exit(0);
})();
