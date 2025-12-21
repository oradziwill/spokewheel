// Quick script to drop only admin_feedback_results table on Railway
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST || process.env.PGHOST,
  port: process.env.DB_PORT || process.env.PGPORT || 5432,
  database: process.env.DB_NAME || process.env.PGDATABASE,
  user: process.env.DB_USER || process.env.PGUSER,
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function dropTable() {
  try {
    console.log("Dropping admin_feedback_results table...");
    await pool.query('DROP TABLE IF EXISTS admin_feedback_results CASCADE');
    console.log('✅ Successfully dropped admin_feedback_results table');
    console.log('\n📋 Next: Redeploy your Railway service to recreate the table with new schema');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

dropTable();
