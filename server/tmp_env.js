const { pool } = require("../server/config/db");

const VARS = ["version", "max_allowed_packet", "innodb_buffer_pool_size", "character_set_server", "collation_server"];

(async () => {
  try {
    for (const v of VARS) {
      const [rows] = await pool.query(`SELECT @@${v} AS v`);
      const val = rows[0].v;
      console.log(`${v} = ${typeof val === "number" && v.includes("size") || v.includes("packet") ? `${(val / 1024 / 1024).toFixed(1)} MB` : val}`);
    }
    const [dbs] = await pool.query("SHOW DATABASES");
    console.log("\nDatabases:", dbs.map((d) => Object.values(d)[0]).join(", "));
    const [t] = await pool.query("SHOW TABLES");
    console.log("Current DB tables:", t.length);
  } catch (err) {
    console.error("ERR", err.message);
  }
  process.exit(0);
})();
