const { pool } = require("../server/config/db");
const fs = require("node:fs");
const DB = "u195318110_baa_lms_task";

(async () => {
  try {
    const cols = await pool.query(
      `SELECT TABLE_NAME, COUNT(*) AS n FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? GROUP BY TABLE_NAME`, [DB]);
    const idx = await pool.query(
      `SELECT TABLE_NAME, COUNT(*) AS n FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ? GROUP BY TABLE_NAME`, [DB]);
    const fks = await pool.query(
      `SELECT TABLE_NAME, COUNT(*) AS n FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
       GROUP BY TABLE_NAME`, [DB]);

    const idxMap = new Map(idx[0].map((r) => [r.TABLE_NAME, Number(r.n)]));
    const fkMap = new Map(fks[0].map((r) => [r.TABLE_NAME, Number(r.n)]));

    let totalIdx = 0, totalFk = 0;
    for (const c of cols[0]) {
      totalIdx += idxMap.get(c.TABLE_NAME) || 0;
      totalFk += fkMap.get(c.TABLE_NAME) || 0;
    }

    const text = fs.readFileSync("C:\\Users\\wawik\\Downloads\\u195318110_BAA_lms_task.sql", "utf8");
    const dumpPk = [...text.matchAll(/ADD PRIMARY KEY/g)].length;
    const dumpKey = [...text.matchAll(/ADD KEY/g)].length;
    const dumpFk = [...text.matchAll(/ADD CONSTRAINT/g)].length;

    console.log(`Columns:           ${cols[0].reduce((s, c) => s + Number(c.n), 0)}`);
    console.log(`Indexes live:      ${totalIdx}   (dump ADD KEY: ${dumpKey})`);
    console.log(`Foreign keys live: ${totalFk}   (dump ADD CONSTRAINT: ${dumpFk})`);
    console.log(`Primary keys live: ${idxMap.size} tables (dump ADD PRIMARY KEY: ${dumpPk})`);

    // Spot-check integrity: any FK-referenced row missing?
    const [orphans] = await pool.query(
      `SELECT COUNT(*) AS n FROM \`${DB}\`.role_permissions rp
       LEFT JOIN \`${DB}\`.permissions p ON p.name = rp.permission_name
       WHERE p.name IS NULL`);
    console.log(`\nOrphaned role_permissions rows: ${orphans[0].n}`);

    const [users] = await pool.query(`SELECT COUNT(*) AS n FROM \`${DB}\`.users`);
    const [roles] = await pool.query(`SELECT COUNT(*) AS n FROM \`${DB}\`.roles`);
    console.log(`users: ${users[0].n} | roles: ${roles[0].n}`);
  } catch (err) {
    console.error("ERR", err.message);
  }
  process.exit(0);
})();
