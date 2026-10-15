const path = require("path");
const { pool } = require(path.join(path.resolve("."), "server/config/db"));

(async () => {
  try {
    for (const t of ["books", "lexora_books", "categories", "departments", "schools"]) {
      const [rows] = await pool.query(
        `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, DATA_TYPE, COLUMN_TYPE
           FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION`,
        [t]
      );
      console.log(`\n== ${t} ==`);
      for (const r of rows) {
        console.log(`  ${r.COLUMN_NAME}  nullable=${r.IS_NULLABLE}  default=${r.COLUMN_DEFAULT === null ? "NULL" : r.COLUMN_DEFAULT}  type=${r.COLUMN_TYPE}`);
      }
    }
  } catch (e) {
    console.error("err:", e.message);
  } finally {
    await pool.end();
  }
})();
