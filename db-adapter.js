// Database adapter that supports both SQLite and PostgreSQL
// Set DB_TYPE=postgresql in .env to use PostgreSQL, otherwise uses SQLite

const DB_TYPE = process.env.DB_TYPE || "sqlite";

let db;

if (DB_TYPE === "postgresql") {
  // PostgreSQL setup
  const { Pool } = require("pg");

  const pool = new Pool({
    user: process.env.DB_USER || "spokewheel_user",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "spokewheel",
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  // Test connection
  pool.query("SELECT NOW()", (err, res) => {
    if (err) {
      console.error("PostgreSQL connection error:", err);
    } else {
      console.log("Connected to PostgreSQL database");
    }
  });

  // Create a SQLite-like interface for PostgreSQL
  db = {
    // Convert SQLite syntax to PostgreSQL
    run: (query, params, callback) => {
      // Convert SQLite placeholders (?) to PostgreSQL ($1, $2, etc.)
      let pgQuery = query;
      let paramIndex = 1;
      const pgParams = [];

      if (params && params.length > 0) {
        pgQuery = query.replace(/\?/g, () => {
          pgParams.push(params[paramIndex - 1]);
          return `$${paramIndex++}`;
        });
      }

      // Convert SQLite-specific syntax
      pgQuery = pgQuery
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, "SERIAL PRIMARY KEY")
        .replace(/DATETIME/g, "TIMESTAMP")
        .replace(/BOOLEAN/g, "BOOLEAN")
        .replace(/TEXT/g, "TEXT")
        .replace(/REAL/g, "DOUBLE PRECISION")
        .replace(/INSERT OR IGNORE/g, "INSERT")
        .replace(/CREATE TABLE IF NOT EXISTS/g, "CREATE TABLE IF NOT EXISTS");

      pool.query(pgQuery, pgParams, (err, res) => {
        if (callback) {
          if (err) {
            callback(err);
          } else {
            // Create a result object similar to SQLite's this
            const result = {
              lastID: res.insertId || (res.rows[0] && res.rows[0].id),
              changes: res.rowCount || 0,
            };
            callback(null, result);
          }
        }
      });
    },

    get: (query, params, callback) => {
      let pgQuery = query;
      let paramIndex = 1;
      const pgParams = [];

      if (params && params.length > 0) {
        pgQuery = query.replace(/\?/g, () => {
          pgParams.push(params[paramIndex - 1]);
          return `$${paramIndex++}`;
        });
      }

      // Convert SQLite syntax
      pgQuery = pgQuery
        .replace(/DATETIME/g, "TIMESTAMP")
        .replace(/BOOLEAN/g, "BOOLEAN");

      pool.query(pgQuery, pgParams, (err, res) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, res.rows[0] || null);
        }
      });
    },

    all: (query, params, callback) => {
      let pgQuery = query;
      let paramIndex = 1;
      const pgParams = [];

      if (params && params.length > 0) {
        pgQuery = query.replace(/\?/g, () => {
          pgParams.push(params[paramIndex - 1]);
          return `$${paramIndex++}`;
        });
      }

      // Convert SQLite syntax
      pgQuery = pgQuery
        .replace(/DATETIME/g, "TIMESTAMP")
        .replace(/BOOLEAN/g, "BOOLEAN");

      pool.query(pgQuery, pgParams, (err, res) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, res.rows || []);
        }
      });
    },

    serialize: (callback) => {
      // PostgreSQL doesn't need serialization, just run the callback
      if (callback) callback();
    },

    close: (callback) => {
      pool.end((err) => {
        if (callback) callback(err);
      });
    },
  };
} else {
  // SQLite setup (default)
  const sqlite3 = require("sqlite3").verbose();
  db = new sqlite3.Database("./admin_feedback.db");
}

module.exports = db;
