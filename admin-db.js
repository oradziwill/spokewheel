// Database adapter - supports both SQLite and PostgreSQL
// Set DB_TYPE=postgresql in .env to use PostgreSQL

const DB_TYPE = process.env.DB_TYPE || "sqlite";

let adminDb;

if (DB_TYPE === "postgresql") {
  // Use PostgreSQL
  adminDb = require("./admin-db-pg");
} else {
  // Use SQLite (default)
  const sqlite3 = require("sqlite3").verbose();
  adminDb = new sqlite3.Database("./admin_feedback.db");
}

// Initialize admin database tables
adminDb.serialize(() => {
  // Admin users table
  adminDb.run(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )`);

  // Comprehensive feedback results table with one column per axis
  // Column names based on axis labels (right_label) in visual order: 8, 10, 1, 3, 5, 7, 9, 11, 2, 4, 6
  adminDb.run(`CREATE TABLE IF NOT EXISTS admin_feedback_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_receiving_id INTEGER NOT NULL,
    person_receiving_name TEXT NOT NULL,
    person_giving_name TEXT NOT NULL,
    person_giving_email TEXT,
    feedback_source TEXT NOT NULL CHECK(feedback_source IN ('self', 'peer', 'superior', 'inferior')),
    submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- One column for each axis in visual order (8, 10, 1, 3, 5, 7, 9, 11, 2, 4, 6): ASKING, CHAOS, POSITIVE-FBCK, LISTENING, MACRO-MGMT, VISIONEERING, 1ON1, SYNCHRONOUS, PRO-MOTION, ADAPTIVE, CARE
    asking REAL,
    chaos REAL,
    "positive-fbck" REAL,
    listening REAL,
    "macro-mgmt" REAL,
    visioneering REAL,
    "1on1" REAL,
    synchronous REAL,
    "pro-motion" REAL,
    adaptive REAL,
    care REAL,
    FOREIGN KEY (person_receiving_id) REFERENCES people (id)
  )`);

  // Create indexes for faster queries
  adminDb.run(
    `CREATE INDEX IF NOT EXISTS idx_feedback_source ON admin_feedback_results(feedback_source)`
  );
  adminDb.run(
    `CREATE INDEX IF NOT EXISTS idx_person_receiving ON admin_feedback_results(person_receiving_id)`
  );
  adminDb.run(
    `CREATE INDEX IF NOT EXISTS idx_submission_date ON admin_feedback_results(submission_date)`
  );

  // Feedback summary table with statistics per source and overall
  adminDb.run(`CREATE TABLE IF NOT EXISTS feedback_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_source TEXT, -- NULL means "all sources combined"
    axis_name TEXT NOT NULL,
    average_value REAL,
    median_value REAL,
    mean_value REAL, -- Same as average, but keeping for clarity
    std_dev REAL,
    total_responses INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create index for summary table
  adminDb.run(
    `CREATE INDEX IF NOT EXISTS idx_summary_source_axis ON feedback_summary(feedback_source, axis_name)`
  );

  // Create feedback_axes table in admin database
  adminDb.run(`CREATE TABLE IF NOT EXISTS feedback_axes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    left_label TEXT NOT NULL,
    right_label TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Regular users table (for non-admin users)
  adminDb.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )`);

  // Create people table for managing feedback recipients
  adminDb.run(`CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    department TEXT,
    position TEXT,
    created_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_user_id) REFERENCES users (id)
  )`);

  // Create feedback_links table for generated links
  adminDb.run(`CREATE TABLE IF NOT EXISTS feedback_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL,
    link_token TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (person_id) REFERENCES people (id)
  )`);

  // Insert default axes into admin database
  // Order: Blue labels (right_label) from top clockwise: POSITIVE Fbck, PRO-MOTION, LISTENING, ADAPTIVE, MACRO-MGMT, CARE, VISIONEERING, ASKING, 1o1, CHAOS, SYNCHRONOUS
  adminDb.run(`INSERT OR IGNORE INTO feedback_axes (id, name, left_label, right_label, created_at) VALUES 
    (1, 'feedback_style', 'NEGATIVE FBCK\ncriticism', 'POSITIVE FBCK\nPraise', CURRENT_TIMESTAMP),
    (2, 'risk_style', 'PREVENTION\nminimising risk/uncertainty', 'PRO-MOTION\nseeking/pursuing opportunities', CURRENT_TIMESTAMP),
    (3, 'communication_mode', 'EXPRESSING\nprevailing behaviour', 'LISTENING\nprevailing behaviour', CURRENT_TIMESTAMP),
    (4, 'behavior_style', 'PUSHING\nprevailing behaviour', 'ADAPTIVE\nto others', CURRENT_TIMESTAMP),
    (5, 'management_style', 'MICRO-MGMT\nhands-on', 'MACRO-MGMT\nhands-off', CURRENT_TIMESTAMP),
    (6, 'approach_style', 'CHALLANGE\nothers', 'CARE\nempathy', CURRENT_TIMESTAMP),
    (7, 'planning_style', 'STRATEGISING\nanalysing/planning', 'VISIONEERING\npicturing the future', CURRENT_TIMESTAMP),
    (8, 'influencing_style', 'TELLING\ninfluencing by statements', 'ASKING\ninfluencing by questioning', CURRENT_TIMESTAMP),
    (9, 'interaction_style', '1onGROUPS\ndominant interaction', '1on1\ndominant interaction', CURRENT_TIMESTAMP),
    (10, 'prioritising', 'PRIORITISING\nhierarchical', 'CHAOS\nentropy', CURRENT_TIMESTAMP),
    (11, 'communication_style', 'ASYNCHRONOUS\ncommunication', 'SYNCHRONOUS\ncommunication', CURRENT_TIMESTAMP)
  `);

  // Insert default admin user (password: admin123)
  adminDb.get("SELECT COUNT(*) as count FROM admin_users", (err, row) => {
    if (err) {
      console.error("Error checking admin users:", err);
      return;
    }

    if (row.count === 0) {
      // Simple password hash for demo (in production, use bcrypt)
      const bcrypt = require("bcrypt");
      const hashedPassword = bcrypt.hashSync("admin123", 10);

      adminDb.run(
        "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
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
});

module.exports = adminDb;
