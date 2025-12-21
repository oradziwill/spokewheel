// Script to reset admin_feedback_results table on Railway PostgreSQL
// This will DROP the table and let the server recreate it with new schema

require("dotenv").config();
const { Pool } = require("pg");

// Use Railway's DATABASE_URL or individual connection vars
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST || process.env.PGHOST,
  port: process.env.DB_PORT || process.env.PGPORT || 5432,
  database: process.env.DB_NAME || process.env.PGDATABASE,
  user: process.env.DB_USER || process.env.PGUSER,
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function resetTable() {
  try {
    console.log("⚠️  WARNING: This will DROP the admin_feedback_results table and all its data!");
    console.log("The server will recreate it with the new schema on restart.\n");

    // Drop the table
    await pool.query('DROP TABLE IF EXISTS admin_feedback_results CASCADE');
    
    console.log("✅ Successfully dropped admin_feedback_results table");
    console.log("\n📋 Next steps:");
    console.log("   1. Restart your Railway service");
    console.log("   2. The server will automatically recreate the table with new column names:");
    console.log("      asking, chaos, positive-fbck, listening, macro-mgmt, visioneering, 1on1, synchronous, pro-motion, adaptive, care");
    console.log("\n⚠️  Note: All existing feedback data has been deleted.");
    
  } catch (error) {
    console.error("❌ Error resetting table:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetTable();

