#!/usr/bin/env node

/**
 * Migration script to move data from SQLite to PostgreSQL
 *
 * Usage:
 *   1. Set up PostgreSQL database (see DEPLOYMENT.md)
 *   2. Set environment variables:
 *      DB_TYPE=postgresql
 *      DB_USER=spokewheel_user
 *      DB_PASSWORD=your_password
 *      DB_NAME=spokewheel
 *      DB_HOST=localhost
 *   3. Run: node migrate-to-postgres.js
 */

const sqlite3 = require("sqlite3").verbose();
const { Pool } = require("pg");

// Load environment variables if dotenv is available
try {
  require("dotenv").config();
} catch (err) {
  console.log(
    "Note: dotenv not installed, using environment variables directly"
  );
}

// SQLite connection
const sqliteDb = new sqlite3.Database("./admin_feedback.db");

// PostgreSQL connection
const pgPool = new Pool({
  user: process.env.DB_USER || "spokewheel_user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "spokewheel",
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

console.log("Starting migration from SQLite to PostgreSQL...\n");

// Test PostgreSQL connection
pgPool.query("SELECT NOW()", (err) => {
  if (err) {
    console.error("❌ PostgreSQL connection failed:", err.message);
    console.error("\nPlease check your database configuration:");
    console.error("  - DB_USER, DB_PASSWORD, DB_NAME, DB_HOST");
    process.exit(1);
  }
  console.log("✅ Connected to PostgreSQL\n");
  startMigration();
});

async function startMigration() {
  try {
    // Migrate tables in order (respecting foreign keys)
    await migrateTable("admin_users", [
      "id",
      "username",
      "password_hash",
      "created_at",
      "last_login",
    ]);
    await migrateTable("users", [
      "id",
      "username",
      "email",
      "password_hash",
      "full_name",
      "role",
      "is_active",
      "created_at",
      "last_login",
    ]);
    await migrateTable("feedback_axes", [
      "id",
      "name",
      "left_label",
      "right_label",
      "created_at",
    ]);
    await migrateTable("people", [
      "id",
      "name",
      "email",
      "department",
      "position",
      "created_by_user_id",
      "created_at",
      "updated_at",
    ]);
    await migrateTable("feedback_links", [
      "id",
      "person_id",
      "link_token",
      "is_active",
      "created_at",
      "expires_at",
    ]);
    await migrateTable("admin_feedback_results", [
      "id",
      "person_id",
      "person_name",
      "evaluator_name",
      "evaluator_email",
      "axis_name",
      "self_value",
      "peer_value",
      "superior_value",
      "inferior_value",
      "link_token",
      "submission_date",
      "created_at",
    ]);
    await migrateTable("feedback_summary", [
      "id",
      "axis_name",
      "source_type",
      "total_responses",
      "average_value",
      "min_value",
      "max_value",
      "last_updated",
    ]);

    console.log("\n✅ Migration completed successfully!");
    console.log("\nNext steps:");
    console.log("  1. Set DB_TYPE=postgresql in your .env file");
    console.log("  2. Restart your application");
    console.log("  3. Verify data in PostgreSQL");
    console.log("  4. Keep SQLite backup for safety\n");

    sqliteDb.close();
    await pgPool.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    sqliteDb.close();
    await pgPool.end();
    process.exit(1);
  }
}

function migrateTable(tableName, columns) {
  return new Promise((resolve, reject) => {
    console.log(`Migrating ${tableName}...`);

    sqliteDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
      if (err) {
        if (err.message.includes("no such table")) {
          console.log(
            `  ⚠️  Table ${tableName} doesn't exist in SQLite, skipping`
          );
          resolve();
          return;
        }
        reject(err);
        return;
      }

      if (rows.length === 0) {
        console.log(`  ✓ No data to migrate for ${tableName}`);
        resolve();
        return;
      }

      // Clear existing data in PostgreSQL (optional - comment out if you want to keep existing data)
      try {
        await pgPool.query(`DELETE FROM ${tableName}`);
      } catch (err) {
        // Table might not exist yet, that's okay
      }

      // Insert data
      let inserted = 0;
      for (const row of rows) {
        const values = columns.map((col) => row[col]);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
        const columnNames = columns.join(", ");

        try {
          await pgPool.query(
            `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
            values
          );
          inserted++;
        } catch (err) {
          if (
            !err.message.includes("duplicate") &&
            !err.message.includes("violates unique constraint")
          ) {
            console.error(
              `  ⚠️  Error inserting row into ${tableName}:`,
              err.message
            );
          }
        }
      }

      console.log(`  ✓ Migrated ${inserted} rows from ${tableName}`);
      resolve();
    });
  });
}
