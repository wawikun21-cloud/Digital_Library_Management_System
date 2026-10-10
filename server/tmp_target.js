const { pool } = require("../server/config/db");

(async () => {
  try {
    const [t] = await pool.query("SHOW TABLES FROM u195318110_baa_lms_task");
    const tables = t.map((r) => Object.values(r)[0]);
    console.log(`u195318110_baa_lms_task: ${tables.length} tables (dump has 125)`);

    const counts = [];
    for (const name of tables) {
      const [c] = await pool.query(`SELECT COUNT(*) AS n FROM \`u195318110_baa_lms_task\`.\`${name}\``);
      counts.push([name, Number(c[0].n)]);
    }
    counts.sort((a, b) => b[1] - a[1]);
    console.log("\nRow counts (top 15):");
    counts.slice(0, 15).forEach(([n, v]) => console.log(`   ${n.padEnd(34)} ${v}`));

    const empty = counts.filter(([, v]) => v === 0);
    console.log(`\nEmpty tables: ${empty.length}/${counts.length}`);
    if (empty.length) console.log("   " + empty.map(([n]) => n).join(", "));

    const total = counts.reduce((s, [, v]) => s + v, 0);
    console.log(`\nTotal rows across all tables: ${total}`);
  } catch (err) {
    console.error("ERR", err.message);
  }
  process.exit(0);
})();
