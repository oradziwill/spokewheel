#!/usr/bin/env node

/**
 * Test PostgreSQL connection and configuration
 *
 * Usage: node test-postgres.js
 */

try {
  require("dotenv").config();
} catch (err) {
  // dotenv not installed, that's okay
}

const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER || "spokewheel_user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "spokewheel",
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

console.log("Testing PostgreSQL connection...\n");
console.log("Configuration:");
console.log(`  Host: ${process.env.DB_HOST || "localhost"}`);
console.log(`  Port: ${process.env.DB_PORT || 5432}`);
console.log(`  Database: ${process.env.DB_NAME || "spokewheel"}`);
console.log(`  User: ${process.env.DB_USER || "spokewheel_user"}`);
console.log("");

pool.query(
  "SELECT NOW() as current_time, version() as pg_version",
  (err, res) => {
    if (err) {
      console.error("❌ Connection failed!");
      console.error(`\nError: ${err.message}\n`);
      console.error("Troubleshooting:");
      console.error(
        "  1. Check if PostgreSQL is running: sudo systemctl status postgresql"
      );
      console.error("  2. Verify credentials in .env file");
      console.error(
        "  3. Check if database exists: psql -U spokewheel_user -d spokewheel"
      );
      console.error("  4. See POSTGRES_SETUP.md for detailed instructions\n");
      process.exit(1);
    }

    console.log("✅ Connection successful!\n");
    console.log(`PostgreSQL Version: ${res.rows[0].pg_version.split(",")[0]}`);
    console.log(`Current Time: ${res.rows[0].current_time}\n`);

    // Test table creation
    pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
      (err, res) => {
        if (err) {
          console.error("Error checking tables:", err);
          pool.end();
          process.exit(1);
        }

        if (res.rows.length > 0) {
          console.log("✅ Tables found:");
          res.rows.forEach((row) => {
            console.log(`   - ${row.table_name}`);
          });
        } else {
          console.log(
            "⚠️  No tables found. Run the application to create tables."
          );
        }

        console.log("\n✅ PostgreSQL is ready to use!");
        console.log("\nNext steps:");
        console.log("  1. Set DB_TYPE=postgresql in your .env file");
        console.log("  2. Start your application: node server.js");
        console.log(
          "  3. If migrating from SQLite, run: node migrate-to-postgres.js\n"
        );

        pool.end();
        process.exit(0);
      }
    );
  }
);
