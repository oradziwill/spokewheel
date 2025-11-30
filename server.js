const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const adminDb = require("./admin-db");
const { adminLogin } = require("./admin-auth");
const adminRoutes = require("./admin-api");
const peopleRoutes = require("./people-api");
const userRoutes = require("./user-api");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
// Only serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "client/build")));
}

// Admin routes
app.use("/api/admin", adminRoutes);

// User authentication routes
app.use("/api/users", userRoutes);

// People management routes
app.use("/api", peopleRoutes);

// Database setup
const db = new sqlite3.Database("./feedback.db");

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Feedback sources table
  db.run(`CREATE TABLE IF NOT EXISTS feedback_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Feedback axes table
  db.run(`CREATE TABLE IF NOT EXISTS feedback_axes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    left_label TEXT NOT NULL,
    right_label TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Feedback responses table
  db.run(`CREATE TABLE IF NOT EXISTS feedback_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    axis_id INTEGER,
    source_id INTEGER,
    value REAL NOT NULL CHECK (value >= -1 AND value <= 1),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (axis_id) REFERENCES feedback_axes (id),
    FOREIGN KEY (source_id) REFERENCES feedback_sources (id),
    UNIQUE(user_id, axis_id, source_id)
  )`);

  // Insert default axes
  const defaultAxes = [
    { name: "personality", left_label: "Introvert", right_label: "Extrovert" },
    { name: "communication", left_label: "Direct", right_label: "Diplomatic" },
    {
      name: "decision_making",
      left_label: "Analytical",
      right_label: "Intuitive",
    },
    {
      name: "work_style",
      left_label: "Independent",
      right_label: "Collaborative",
    },
    {
      name: "feedback_style",
      left_label: "Constructive",
      right_label: "Supportive",
    },
  ];

  // Insert default feedback sources
  const defaultSources = [
    { name: "self", description: "Self-assessment - your own perspective" },
    {
      name: "peer",
      description: "Peer feedback - from colleagues at same level",
    },
    {
      name: "superior",
      description: "Superior feedback - from managers or leaders",
    },
    {
      name: "inferior",
      description: "Subordinate feedback - from team members you manage",
    },
  ];

  // Check if sources already exist before inserting
  db.get("SELECT COUNT(*) as count FROM feedback_sources", (err, row) => {
    if (err) {
      console.error("Error checking sources:", err);
      return;
    }

    if (row.count === 0) {
      const stmt = db.prepare(
        "INSERT INTO feedback_sources (name, description) VALUES (?, ?)"
      );
      defaultSources.forEach((source) => {
        stmt.run(source.name, source.description);
      });
      stmt.finalize();
      console.log("Default feedback sources inserted");
    } else {
      console.log("Feedback sources already exist, skipping insertion");
    }
  });

  // Check if axes already exist before inserting
  db.get("SELECT COUNT(*) as count FROM feedback_axes", (err, row) => {
    if (err) {
      console.error("Error checking axes:", err);
      return;
    }

    if (row.count === 0) {
      // Only insert if no axes exist
      const stmt = db.prepare(
        "INSERT INTO feedback_axes (name, left_label, right_label) VALUES (?, ?, ?)"
      );
      defaultAxes.forEach((axis) => {
        stmt.run(axis.name, axis.left_label, axis.right_label);
      });
      stmt.finalize();
      console.log("Default axes inserted");
    } else {
      console.log("Axes already exist, skipping insertion");
    }
  });
});

// API Routes

// Admin login endpoint
app.post("/api/admin/login", adminLogin);

// Sync feedback to admin database with person information
// New structure: one row per feedback submission with all axes as columns
// feedbackValues is an object with axis names as keys and values as numbers
const syncToAdminDb = (
  personId,
  personName,
  evaluatorName,
  evaluatorEmail,
  source,
  feedbackValues
) => {
  // Check if record exists for this person, evaluator, and source combination
  adminDb.get(
    "SELECT * FROM admin_feedback_results WHERE person_receiving_id = ? AND person_giving_name = ? AND feedback_source = ?",
    [personId, evaluatorName, source],
    (err, existingRecord) => {
      if (err) {
        console.error("Error checking admin record:", err);
        return;
      }

      // Build the column names and values for all axes
      const axisColumns = Object.keys(feedbackValues);
      const axisValues = Object.values(feedbackValues);

      if (existingRecord) {
        // Update existing record with all axis values
        const setClauses = axisColumns.map((col) => `${col} = ?`).join(", ");
        const updateQuery = `
          UPDATE admin_feedback_results 
          SET ${setClauses}, submission_date = CURRENT_TIMESTAMP 
          WHERE person_receiving_id = ? AND person_giving_name = ? AND feedback_source = ?
        `;
        adminDb.run(
          updateQuery,
          [...axisValues, personId, evaluatorName, source],
          (err) => {
            if (err) {
              console.error("Error updating admin record:", err);
            }
          }
        );
      } else {
        // Insert new record with all axis values
        const columns = [
          "person_receiving_id",
          "person_receiving_name",
          "person_giving_name",
          "person_giving_email",
          "feedback_source",
          ...axisColumns,
        ];
        const placeholders = columns.map(() => "?").join(", ");
        const insertQuery = `
          INSERT INTO admin_feedback_results 
          (${columns.join(", ")}, submission_date)
          VALUES (${placeholders}, CURRENT_TIMESTAMP)
        `;
        adminDb.run(
          insertQuery,
          [
            personId,
            personName,
            evaluatorName,
            evaluatorEmail || null,
            source,
            ...axisValues,
          ],
          (err) => {
            if (err) {
              console.error("Error inserting admin record:", err);
            }
          }
        );
      }
    }
  );
};

// Get all feedback axes
app.get("/api/axes", (req, res) => {
  // Use admin database for axes (where the updated axes are stored)
  adminDb.all("SELECT * FROM feedback_axes ORDER BY id", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Convert escaped newlines (\n) to actual newlines
    const processedRows = rows.map((row) => ({
      ...row,
      left_label: row.left_label.replace(/\\n/g, "\n"),
      right_label: row.right_label.replace(/\\n/g, "\n"),
    }));
    res.json(processedRows);
  });
});

// Get all feedback sources
app.get("/api/sources", (req, res) => {
  db.all("SELECT * FROM feedback_sources ORDER BY id", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get all users with their feedback
app.get("/api/users", (req, res) => {
  const query = `
    SELECT 
      u.id,
      u.name,
      u.email,
      u.created_at,
      fr.axis_id,
      fa.name as axis_name,
      fr.self_value,
      fr.peer_value,
      fr.superior_value,
      fr.inferior_value
    FROM users u
    LEFT JOIN feedback_responses fr ON u.id = fr.user_id
    LEFT JOIN feedback_axes fa ON fr.axis_id = fa.id
    ORDER BY u.created_at DESC, u.id, fr.axis_id
  `;

  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Group feedback by user
    const userMap = new Map();

    rows.forEach((row) => {
      if (!userMap.has(row.id)) {
        userMap.set(row.id, {
          id: row.id,
          name: row.name,
          email: row.email,
          created_at: row.created_at,
          feedback: {},
        });
      }

      const user = userMap.get(row.id);

      if (row.axis_name) {
        user.feedback[row.axis_name] = {
          self: row.self_value,
          peer: row.peer_value,
          superior: row.superior_value,
          inferior: row.inferior_value,
        };
      }
    });

    const users = Array.from(userMap.values());
    res.json(users);
  });
});

// Submit feedback via link token
app.post("/api/feedback/:token", (req, res) => {
  const { token } = req.params;
  const { evaluatorName, evaluatorEmail, feedback, source } = req.body;

  if (!evaluatorName || !feedback || !source) {
    return res
      .status(400)
      .json({ error: "Evaluator name, feedback, and source are required" });
  }

  // First, validate the link token and get person info
  adminDb.get(
    `SELECT 
      p.id as person_id, 
      p.name as person_name,
      fl.expires_at,
      fl.is_active
    FROM people p
    JOIN feedback_links fl ON p.id = fl.person_id
    WHERE fl.link_token = ? AND fl.is_active = 1`,
    [token],
    (err, linkData) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (!linkData) {
        res.status(404).json({ error: "Invalid or expired link" });
        return;
      }

      // Check if link has expired
      if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
        res.status(410).json({ error: "Link has expired" });
        return;
      }

      // Validate source
      const validSources = ["self", "peer", "superior", "inferior"];
      if (!validSources.includes(source)) {
        res.status(400).json({ error: "Invalid feedback source" });
        return;
      }

      // Process feedback - all axes in one submission
      if (Object.keys(feedback).length === 0) {
        res.json({ success: true, message: "Feedback saved successfully" });
        return;
      }

      // Sync all feedback to admin database in one row
      syncToAdminDb(
        linkData.person_id,
        linkData.person_name,
        evaluatorName,
        evaluatorEmail,
        source,
        feedback
      );

      res.json({
        success: true,
        message: "Feedback saved successfully",
        person_name: linkData.person_name,
      });
    }
  );
});

// Create or update user feedback (legacy endpoint)
app.post("/api/feedback", (req, res) => {
  const { userName, userEmail, feedback, source } = req.body;

  if (!userName || !feedback || !source) {
    return res
      .status(400)
      .json({ error: "Name, feedback, and source are required" });
  }

  db.serialize(() => {
    // Insert or get user
    const userStmt = db.prepare(
      "INSERT OR REPLACE INTO users (name, email) VALUES (?, ?)"
    );
    userStmt.run(userName, userEmail || null, function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
    });
    userStmt.finalize();

    // Get user ID - use COALESCE to handle null email comparison
    const query = userEmail
      ? "SELECT id FROM users WHERE name = ? AND email = ?"
      : "SELECT id FROM users WHERE name = ? AND email IS NULL";
    const params = userEmail ? [userName, userEmail] : [userName];

    db.get(query, params, (err, user) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (!user) {
        res.status(500).json({ error: "Failed to create/retrieve user" });
        return;
      }

      const userId = user.id;

      // Validate source
      const validSources = ["self", "peer", "superior", "inferior"];
      if (!validSources.includes(source)) {
        res.status(400).json({ error: "Invalid feedback source" });
        return;
      }

      // Insert or update feedback responses
      const insertStmt = db.prepare(`
        INSERT INTO feedback_responses (user_id, axis_id, ${source}_value, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const updateStmt = db.prepare(`
        UPDATE feedback_responses 
        SET ${source}_value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND axis_id = ?
      `);

      const total = Object.keys(feedback).length;

      if (total === 0) {
        res.json({ success: true, message: "Feedback saved successfully" });
        return;
      }

      let completed = 0;
      const errors = [];

      // Process all feedback first
      Object.entries(feedback).forEach(([axisName, value]) => {
        // Get axis ID
        db.get(
          "SELECT id FROM feedback_axes WHERE name = ?",
          [axisName],
          (err, axis) => {
            if (err) {
              errors.push(err);
              completed++;
              if (completed === total) {
                insertStmt.finalize();
                updateStmt.finalize();
                if (errors.length > 0) {
                  res.status(500).json({ error: errors[0].message });
                } else {
                  // Sync all feedback to admin database in one row
                  // In legacy endpoint, person receiving = person giving (self-feedback)
                  syncToAdminDb(
                    userId,
                    userName,
                    userName, // person giving = person receiving in legacy
                    userEmail,
                    source,
                    feedback
                  );
                  res.json({
                    success: true,
                    message: "Feedback saved successfully",
                  });
                }
              }
              return;
            }

            if (axis) {
              // Check if record exists first
              db.get(
                "SELECT * FROM feedback_responses WHERE user_id = ? AND axis_id = ?",
                [userId, axis.id],
                (err, existingRecord) => {
                  if (err) {
                    errors.push(err);
                    completed++;
                    if (completed === total) {
                      insertStmt.finalize();
                      updateStmt.finalize();
                      if (errors.length > 0) {
                        res.status(500).json({ error: errors[0].message });
                      } else {
                        syncToAdminDb(
                          userId,
                          userName,
                          userName,
                          userEmail,
                          source,
                          feedback
                        );
                        res.json({
                          success: true,
                          message: "Feedback saved successfully",
                        });
                      }
                    }
                    return;
                  }

                  if (existingRecord) {
                    // Update existing record
                    updateStmt.run(
                      value,
                      userId,
                      axis.id,
                      function (updateErr) {
                        if (updateErr) {
                          errors.push(updateErr);
                        }
                        completed++;
                        if (completed === total) {
                          insertStmt.finalize();
                          updateStmt.finalize();
                          if (errors.length > 0) {
                            res.status(500).json({ error: errors[0].message });
                          } else {
                            // Sync all feedback to admin database in one row
                            syncToAdminDb(
                              userId,
                              userName,
                              userName,
                              userEmail,
                              source,
                              feedback
                            );
                            res.json({
                              success: true,
                              message: "Feedback saved successfully",
                            });
                          }
                        }
                      }
                    );
                  } else {
                    // Insert new record
                    insertStmt.run(
                      userId,
                      axis.id,
                      value,
                      function (insertErr) {
                        if (insertErr) {
                          errors.push(insertErr);
                        }
                        completed++;
                        if (completed === total) {
                          insertStmt.finalize();
                          updateStmt.finalize();
                          if (errors.length > 0) {
                            res.status(500).json({ error: errors[0].message });
                          } else {
                            // Sync all feedback to admin database in one row
                            syncToAdminDb(
                              userId,
                              userName,
                              userName,
                              userEmail,
                              source,
                              feedback
                            );
                            res.json({
                              success: true,
                              message: "Feedback saved successfully",
                            });
                          }
                        }
                      }
                    );
                  }
                }
              );
            } else {
              completed++;
              if (completed === total) {
                insertStmt.finalize();
                updateStmt.finalize();
                if (errors.length > 0) {
                  res.status(500).json({ error: errors[0].message });
                } else {
                  syncToAdminDb(
                    userId,
                    userName,
                    userName,
                    userEmail,
                    source,
                    feedback
                  );
                  res.json({
                    success: true,
                    message: "Feedback saved successfully",
                  });
                }
              }
            }
          }
        );
      });
    });
  });
});

// Get feedback statistics
app.get("/api/stats", (req, res) => {
  const query = `
    SELECT 
      fa.name as axis_name,
      fa.left_label,
      fa.right_label,
      AVG(fr.value) as average_value,
      COUNT(fr.value) as response_count,
      MIN(fr.value) as min_value,
      MAX(fr.value) as max_value
    FROM feedback_axes fa
    LEFT JOIN feedback_responses fr ON fa.id = fr.axis_id
    GROUP BY fa.id, fa.name, fa.left_label, fa.right_label
    ORDER BY fa.id
  `;

  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Serve React app (only in production)
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client/build", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Database connection closed.");
    process.exit(0);
  });
});
