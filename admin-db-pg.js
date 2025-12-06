const { Pool } = require("pg");

// PostgreSQL database connection
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

// Create SQLite-compatible interface
const adminDb = {
  run: (query, params, callback) => {
    // Convert SQLite syntax to PostgreSQL
    let pgQuery = query
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, "SERIAL PRIMARY KEY")
      .replace(
        /DATETIME DEFAULT CURRENT_TIMESTAMP/g,
        "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      )
      .replace(/DATETIME/g, "TIMESTAMP")
      .replace(/BOOLEAN DEFAULT 1/g, "BOOLEAN DEFAULT TRUE")
      .replace(/BOOLEAN DEFAULT 0/g, "BOOLEAN DEFAULT FALSE")
      .replace(
        /CHECK\(role IN \('user', 'admin'\)\)/g,
        "CHECK(role IN ('user', 'admin'))"
      )
      // Convert SQLite boolean comparisons to PostgreSQL boolean
      .replace(/\bis_active\s*=\s*1\b/gi, "is_active = true")
      .replace(/\bis_active\s*=\s*0\b/gi, "is_active = false")
      .replace(/\bfl\.is_active\s*=\s*1\b/gi, "fl.is_active = true")
      .replace(/\bfl\.is_active\s*=\s*0\b/gi, "fl.is_active = false")
      // Handle SET is_active = 0/1 in UPDATE statements
      .replace(/\bSET\s+is_active\s*=\s*0\b/gi, "SET is_active = false")
      .replace(/\bSET\s+is_active\s*=\s*1\b/gi, "SET is_active = true")
      .replace(/\bSET\s+fl\.is_active\s*=\s*0\b/gi, "SET fl.is_active = false")
      .replace(/\bSET\s+fl\.is_active\s*=\s*1\b/gi, "SET fl.is_active = true")
      // Handle WHERE clauses with boolean in UPDATE/DELETE
      .replace(
        /\bWHERE\s+fl\.is_active\s*=\s*1\b/gi,
        "WHERE fl.is_active = true"
      )
      .replace(
        /\bWHERE\s+fl\.is_active\s*=\s*0\b/gi,
        "WHERE fl.is_active = false"
      )
      .replace(/\bAND\s+fl\.is_active\s*=\s*1\b/gi, "AND fl.is_active = true")
      .replace(/\bAND\s+fl\.is_active\s*=\s*0\b/gi, "AND fl.is_active = false")
      // Handle boolean literals in INSERT VALUES clauses for is_active column
      // Pattern: VALUES (?, ?, 1, ...) or VALUES (?, ?, 0, ...) where 1/0 is for is_active
      // Convert literal 1/0 to true/false when they appear as the 3rd value in VALUES clause
      // Match: VALUES ( followed by param, comma, param, comma, then literal 1 or 0
      .replace(/\bVALUES\s*\([^,)]+,\s*[^,)]+,\s*\b1\b/gi, (match) => {
        return match.replace(/\b1\b/, "true");
      })
      .replace(/\bVALUES\s*\([^,)]+,\s*[^,)]+,\s*\b0\b/gi, (match) => {
        return match.replace(/\b0\b/, "false");
      });

    // Handle INSERT OR IGNORE - need to add ON CONFLICT clause
    if (pgQuery.includes("INSERT OR IGNORE")) {
      // Extract table name and add ON CONFLICT
      const tableMatch = pgQuery.match(/INTO\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        // Try to find unique constraint (usually id or name)
        let conflictColumn = "id";
        if (tableName === "feedback_axes") conflictColumn = "name";
        if (tableName === "users") conflictColumn = "username";
        if (tableName === "admin_users") conflictColumn = "username";

        pgQuery = pgQuery.replace(/INSERT OR IGNORE/i, `INSERT`);
        // Add ON CONFLICT at the end, before semicolon
        pgQuery = pgQuery.replace(
          /;?\s*$/,
          ` ON CONFLICT (${conflictColumn}) DO NOTHING;`
        );
      }
    }

    // Convert ? placeholders to $1, $2, etc.
    let paramIndex = 1;
    const pgParams = [];
    if (params && params.length > 0) {
      pgQuery = pgQuery.replace(/\?/g, () => {
        pgParams.push(params[paramIndex - 1]);
        return `$${paramIndex++}`;
      });
    }

    pool.query(pgQuery, pgParams, (err, res) => {
      if (callback) {
        if (err) {
          callback(err);
        } else {
          // For INSERT, try to get the last inserted ID
          if (pgQuery.trim().toUpperCase().startsWith("INSERT")) {
            pool.query("SELECT LASTVAL()", (err, idRes) => {
              const result = {
                lastID: idRes && idRes.rows[0] ? idRes.rows[0].lastval : null,
                changes: res.rowCount || 0,
              };
              callback(null, result);
            });
          } else {
            const result = {
              lastID: null,
              changes: res.rowCount || 0,
            };
            callback(null, result);
          }
        }
      }
    });
  },

  get: (query, params, callback) => {
    // Handle case where params is actually the callback (2-arg call)
    if (typeof params === "function" && !callback) {
      callback = params;
      params = [];
    }

    let pgQuery = query
      .replace(/DATETIME/g, "TIMESTAMP")
      .replace(/BOOLEAN/g, "BOOLEAN")
      // Convert SQLite boolean comparisons to PostgreSQL boolean
      .replace(/\bis_active\s*=\s*1\b/gi, "is_active = true")
      .replace(/\bis_active\s*=\s*0\b/gi, "is_active = false")
      .replace(/\bfl\.is_active\s*=\s*1\b/gi, "fl.is_active = true")
      .replace(/\bfl\.is_active\s*=\s*0\b/gi, "fl.is_active = false")
      // Handle JOIN conditions with boolean
      .replace(/\bAND\s+fl\.is_active\s*=\s*1\b/gi, "AND fl.is_active = true")
      .replace(/\bAND\s+fl\.is_active\s*=\s*0\b/gi, "AND fl.is_active = false");

    let paramIndex = 1;
    const pgParams = [];
    if (params && params.length > 0) {
      pgQuery = pgQuery.replace(/\?/g, () => {
        pgParams.push(params[paramIndex - 1]);
        return `$${paramIndex++}`;
      });
    }

    pool.query(pgQuery, pgParams, (err, res) => {
      if (callback) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, res.rows[0] || null);
        }
      }
    });
  },

  all: (query, params, callback) => {
    // Handle case where params is actually the callback (2-arg call)
    if (typeof params === "function" && !callback) {
      callback = params;
      params = [];
    }

    let pgQuery = query
      .replace(/DATETIME/g, "TIMESTAMP")
      .replace(/BOOLEAN/g, "BOOLEAN")
      // Convert SQLite boolean comparisons to PostgreSQL boolean
      .replace(/\bis_active\s*=\s*1\b/gi, "is_active = true")
      .replace(/\bis_active\s*=\s*0\b/gi, "is_active = false")
      .replace(/\bfl\.is_active\s*=\s*1\b/gi, "fl.is_active = true")
      .replace(/\bfl\.is_active\s*=\s*0\b/gi, "fl.is_active = false")
      // Handle JOIN conditions with boolean
      .replace(/\bAND\s+fl\.is_active\s*=\s*1\b/gi, "AND fl.is_active = true")
      .replace(/\bAND\s+fl\.is_active\s*=\s*0\b/gi, "AND fl.is_active = false");

    let paramIndex = 1;
    const pgParams = [];
    if (params && params.length > 0) {
      pgQuery = pgQuery.replace(/\?/g, () => {
        pgParams.push(params[paramIndex - 1]);
        return `$${paramIndex++}`;
      });
    }

    pool.query(pgQuery, pgParams, (err, res) => {
      if (callback) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, res.rows || []);
        }
      }
    });
  },

  serialize: (callback) => {
    if (callback) {
      // Run callback in a transaction
      pool.query("BEGIN", (err) => {
        if (err) {
          callback();
          return;
        }
        callback();
        pool.query("COMMIT", () => {});
      });
    }
  },

  close: (callback) => {
    pool.end((err) => {
      if (callback) callback(err);
    });
  },
};

// Initialize PostgreSQL tables
const initializeTables = () => {
  const queries = [
    // Admin users table
    `CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )`,

    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )`,

    // People table
    `CREATE TABLE IF NOT EXISTS people (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      department TEXT,
      position TEXT,
      created_by_user_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by_user_id) REFERENCES users (id)
    )`,

    // Feedback links table
    `CREATE TABLE IF NOT EXISTS feedback_links (
      id SERIAL PRIMARY KEY,
      person_id INTEGER NOT NULL,
      link_token TEXT NOT NULL UNIQUE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      FOREIGN KEY (person_id) REFERENCES people (id)
    )`,

    // Feedback axes table
    `CREATE TABLE IF NOT EXISTS feedback_axes (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      left_label TEXT NOT NULL,
      right_label TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Admin feedback results table
    `CREATE TABLE IF NOT EXISTS admin_feedback_results (
      id SERIAL PRIMARY KEY,
      person_receiving_id INTEGER NOT NULL,
      person_receiving_name TEXT NOT NULL,
      person_giving_name TEXT NOT NULL,
      person_giving_email TEXT,
      feedback_source TEXT NOT NULL CHECK(feedback_source IN ('self', 'peer', 'superior', 'inferior')),
      submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      -- One column for each axis
      communication_style DOUBLE PRECISION,
      prioritising DOUBLE PRECISION,
      interaction_style DOUBLE PRECISION,
      influencing_style DOUBLE PRECISION,
      planning_style DOUBLE PRECISION,
      approach_style DOUBLE PRECISION,
      management_style DOUBLE PRECISION,
      behavior_style DOUBLE PRECISION,
      communication_mode DOUBLE PRECISION,
      risk_style DOUBLE PRECISION,
      feedback_style DOUBLE PRECISION,
      FOREIGN KEY (person_receiving_id) REFERENCES people (id) ON DELETE CASCADE
    )`,

    // Create indexes for faster queries
    `CREATE INDEX IF NOT EXISTS idx_feedback_source ON admin_feedback_results(feedback_source)`,
    `CREATE INDEX IF NOT EXISTS idx_person_receiving ON admin_feedback_results(person_receiving_id)`,
    `CREATE INDEX IF NOT EXISTS idx_submission_date ON admin_feedback_results(submission_date)`,

    // Feedback summary table with statistics per source and overall
    `CREATE TABLE IF NOT EXISTS feedback_summary (
      id SERIAL PRIMARY KEY,
      feedback_source TEXT, -- NULL means "all sources combined"
      axis_name TEXT NOT NULL,
      average_value DOUBLE PRECISION,
      median_value DOUBLE PRECISION,
      mean_value DOUBLE PRECISION, -- Same as average, but keeping for clarity
      std_dev DOUBLE PRECISION,
      total_responses INTEGER DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create index for summary table
    `CREATE INDEX IF NOT EXISTS idx_summary_source_axis ON feedback_summary(feedback_source, axis_name)`,
  ];

  // Execute queries sequentially
  let index = 0;
  const runNext = () => {
    if (index >= queries.length) {
      // Insert default data
      insertDefaultData();
      return;
    }
    pool.query(queries[index], (err) => {
      if (err) {
        console.error(`Error creating table ${index + 1}:`, err);
      }
      index++;
      runNext();
    });
  };
  runNext();
};

const insertDefaultData = () => {
  // Insert default axes
  pool.query(
    `INSERT INTO feedback_axes (id, name, left_label, right_label, created_at) 
     VALUES 
       (1, 'communication_style', 'ASYNCHRONOUS' || E'\\n' || 'communication', 'SYNCHRONOUS' || E'\\n' || 'communication', CURRENT_TIMESTAMP),
       (2, 'prioritising', 'PRIORITISING' || E'\\n' || 'hierarchical', 'CHAOS' || E'\\n' || 'entropy', CURRENT_TIMESTAMP),
       (3, 'interaction_style', '1onGROUPS' || E'\\n' || 'dominant interaction', '1on1' || E'\\n' || 'dominant interaction', CURRENT_TIMESTAMP),
       (4, 'influencing_style', 'TELLING' || E'\\n' || 'influencing by statements', 'ASKING' || E'\\n' || 'influencing by questioning', CURRENT_TIMESTAMP),
       (5, 'planning_style', 'STRATEGISING' || E'\\n' || 'analysing/planning', 'VISIONEERING' || E'\\n' || 'picturing the future', CURRENT_TIMESTAMP),
       (6, 'approach_style', 'CHALLANGE' || E'\\n' || 'others', 'CARE' || E'\\n' || 'empathy', CURRENT_TIMESTAMP),
       (7, 'management_style', 'MICRO-MGMT' || E'\\n' || 'hands-on', 'MACRO-MGMT' || E'\\n' || 'hands-off', CURRENT_TIMESTAMP),
       (8, 'behavior_style', 'PUSHING' || E'\\n' || 'prevailing behaviour', 'ADAPTIVE' || E'\\n' || 'to others', CURRENT_TIMESTAMP),
       (9, 'communication_mode', 'EXPRESSING' || E'\\n' || 'prevailing behaviour', 'LISTENING' || E'\\n' || 'prevailing behaviour', CURRENT_TIMESTAMP),
       (10, 'risk_style', 'PREVENTION' || E'\\n' || 'minimising risk/uncertainty', 'PRO-MOTION' || E'\\n' || 'seeking/pursuing opportunities', CURRENT_TIMESTAMP),
       (11, 'feedback_style', 'NEGATIVE FBCK' || E'\\n' || 'criticism', 'POSITIVE FBCK' || E'\\n' || 'Praise', CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO NOTHING`,
    (err) => {
      if (err && !err.message.includes("duplicate")) {
        console.error("Error inserting default axes:", err);
      }
    }
  );

  // Insert default admin user
  pool.query("SELECT COUNT(*) as count FROM admin_users", (err, res) => {
    if (err) {
      console.error("Error checking admin users:", err);
      return;
    }

    if (res.rows[0].count === "0") {
      const bcrypt = require("bcrypt");
      const hashedPassword = bcrypt.hashSync("admin123", 10);

      pool.query(
        "INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)",
        ["admin", hashedPassword],
        (err) => {
          if (err) {
            console.error("Error creating admin user:", err);
          } else {
            console.log(
              "Default admin user created (username: admin, password: admin123)"
            );
          }
        }
      );
    }
  });
};

// Initialize tables on load
initializeTables();

module.exports = adminDb;
