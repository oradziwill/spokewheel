// Script to check if database schema matches new column names
const adminDb = require("./admin-db");

console.log("Checking database schema...\n");

if (process.env.DB_TYPE === "postgresql") {
  // PostgreSQL
  const { Pool } = require("pg");
  require("dotenv").config();
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  pool.query(
    `SELECT column_name 
     FROM information_schema.columns 
     WHERE table_name = 'admin_feedback_results' 
     AND column_name IN ('asking', 'positive-fbck', 'chaos', 'listening', 'macro-mgmt', 'visioneering', '1on1', 'synchronous', 'pro-motion', 'adaptive', 'care')
     ORDER BY column_name`,
    (err, res) => {
      if (err) {
        console.error("Error checking schema:", err);
        pool.end();
        return;
      }

      const newColumns = res.rows.map(r => r.column_name);
      const expectedColumns = ['1on1', 'adaptive', 'asking', 'care', 'chaos', 'listening', 'macro-mgmt', 'positive-fbck', 'pro-motion', 'synchronous', 'visioneering'];

      console.log("Found columns:", newColumns.sort().join(", "));
      console.log("Expected columns:", expectedColumns.sort().join(", "));

      if (newColumns.length === expectedColumns.length && 
          newColumns.sort().join(",") === expectedColumns.sort().join(",")) {
        console.log("\n✅ Database schema is correct!");
      } else {
        console.log("\n❌ Database schema is outdated!");
        console.log("Missing columns:", expectedColumns.filter(c => !newColumns.includes(c)).join(", "));
        console.log("\nTo fix, run:");
        console.log("  DROP TABLE admin_feedback_results CASCADE;");
        console.log("  (Then restart your server to recreate the table)");
      }

      pool.end();
    }
  );
} else {
  // SQLite
  adminDb.all(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='admin_feedback_results'`,
    (err, rows) => {
      if (err) {
        console.error("Error checking schema:", err);
        adminDb.close();
        return;
      }

      if (rows.length === 0) {
        console.log("❌ Table doesn't exist. Restart your server to create it.");
        adminDb.close();
        return;
      }

      const sql = rows[0].sql;
      const hasNewColumns = 
        sql.includes('"asking"') && 
        sql.includes('"positive-fbck"') && 
        sql.includes('"chaos"');

      if (hasNewColumns) {
        console.log("✅ Database schema appears to be correct!");
        console.log("Found new column names in table definition.");
      } else {
        console.log("❌ Database schema is outdated!");
        console.log("The table still has old column names.");
        console.log("\nTo fix:");
        console.log("  1. Stop your server");
        console.log("  2. Delete admin_feedback.db");
        console.log("  3. Restart your server");
      }

      adminDb.close();
    }
  );
}
