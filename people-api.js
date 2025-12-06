const express = require("express");
const adminDb = require("./admin-db");
const { authenticateAdmin } = require("./admin-auth");
const { authenticateUser } = require("./user-auth");
const crypto = require("crypto");

const router = express.Router();

// Combined authentication middleware - accepts either admin or user
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const credentials = Buffer.from(
    authHeader.split(" ")[1],
    "base64"
  ).toString();
  const [username, password] = credentials.split(":");

  if (!username || !password) {
    return res.status(401).json({ error: "Invalid credentials format" });
  }

  // Try admin authentication first
  adminDb.get(
    "SELECT * FROM admin_users WHERE username = ?",
    [username],
    (err, admin) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (admin) {
        const bcrypt = require("bcrypt");
        bcrypt.compare(password, admin.password_hash, (err, isMatch) => {
          if (err || !isMatch) {
            // If admin auth fails, try user auth
            tryUserAuth();
          } else {
            req.user = {
              id: admin.id,
              username: admin.username,
              role: "admin",
            };
            next();
          }
        });
      } else {
        // Try user authentication
        tryUserAuth();
      }
    }
  );

  function tryUserAuth() {
    adminDb.get(
      "SELECT * FROM users WHERE username = ? AND is_active = 1",
      [username],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }

        if (!user) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        const bcrypt = require("bcrypt");
        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
          if (err) {
            return res.status(500).json({ error: "Authentication error" });
          }

          if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
          }

          req.user = user;
          next();
        });
      }
    );
  }
};

// Get all people (authenticated users see their own, admins see all)
router.get("/people", authenticate, (req, res) => {
  const isAdmin = req.user.role === "admin";

  // Build query based on user role
  let query;
  let params = [];

  if (isAdmin) {
    // Admins see all people
    query = `
      SELECT 
        p.*,
        COUNT(fl.id) as active_links,
        COALESCE(COUNT(fr.id), 0) as feedback_count
      FROM people p
      LEFT JOIN feedback_links fl ON p.id = fl.person_id AND fl.is_active = 1
      LEFT JOIN admin_feedback_results fr ON p.id = fr.person_receiving_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
  } else {
    // Regular users see only their own people
    query = `
      SELECT 
        p.*,
        COUNT(fl.id) as active_links,
        COALESCE(COUNT(fr.id), 0) as feedback_count
      FROM people p
      LEFT JOIN feedback_links fl ON p.id = fl.person_id AND fl.is_active = 1
      LEFT JOIN admin_feedback_results fr ON p.id = fr.person_receiving_id
      WHERE p.created_by_user_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    params = [req.user.id];
  }

  adminDb.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Create a new person (authenticated users can create)
router.post("/people", authenticate, (req, res) => {
  const { name, email, department, position } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const query = `
    INSERT INTO people (name, email, department, position, created_by_user_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  adminDb.run(
    query,
    [name, email || null, department || null, position || null, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        message: "Person created successfully",
        person: {
          id: this.lastID,
          name,
          email,
          department,
          position,
        },
      });
    }
  );
});

// Update a person (users can update their own, admins can update any)
router.put("/people/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const { name, email, department, position } = req.body;
  const isAdmin = req.user.role === "admin";

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  // Check if person exists and user has permission
  adminDb.get("SELECT * FROM people WHERE id = ?", [id], (err, person) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!person) {
      return res.status(404).json({ error: "Person not found" });
    }

    // Check permission: users can only update their own people
    if (!isAdmin && person.created_by_user_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only update your own people" });
    }

    const query = `
      UPDATE people 
      SET name = ?, email = ?, department = ?, position = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    adminDb.run(
      query,
      [name, email || null, department || null, position || null, id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: "Person not found" });
        }

        res.json({
          success: true,
          message: "Person updated successfully",
        });
      }
    );
  });
});

// Delete a person (users can delete their own, admins can delete any)
router.delete("/people/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === "admin";

  // Check if person exists and user has permission
  adminDb.get("SELECT * FROM people WHERE id = ?", [id], (err, person) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!person) {
      return res.status(404).json({ error: "Person not found" });
    }

    // Check permission: users can only delete their own people
    if (!isAdmin && person.created_by_user_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only delete your own people" });
    }

    // First, deactivate all links for this person
    adminDb.run(
      "UPDATE feedback_links SET is_active = 0 WHERE person_id = ?",
      [id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Then delete the person
        adminDb.run("DELETE FROM people WHERE id = ?", [id], function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: "Person not found" });
          }

          res.json({
            success: true,
            message: "Person deleted successfully",
          });
        });
      }
    );
  });
});

// Generate feedback link for a person (users can generate for their own, admins for any)
router.post("/people/:id/generate-link", authenticate, (req, res) => {
  const { id } = req.params;
  const { expiresInDays } = req.body;

  const isAdmin = req.user.role === "admin";

  // First, check if person exists and user has permission
  adminDb.get("SELECT * FROM people WHERE id = ?", [id], (err, person) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!person) {
      return res.status(404).json({ error: "Person not found" });
    }

    // Check permission: users can only generate links for their own people
    if (!isAdmin && person.created_by_user_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only generate links for your own people" });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString("hex");

    // Calculate expiration date
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Insert the link
    const query = `
      INSERT INTO feedback_links (person_id, link_token, is_active, created_at, expires_at)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP, ?)
    `;

    adminDb.run(query, [id, token, expiresAt], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Build a frontend URL for the feedback link
      // Priority: FRONTEND_BASE_URL env → default to localhost:3000
      const frontendBase = (
        process.env.FRONTEND_BASE_URL || "http://localhost:3000"
      ).replace(/\/$/, "");

      const linkUrl = `${frontendBase}/feedback/${token}`;

      res.json({
        success: true,
        message: "Feedback link generated successfully",
        link: {
          id: this.lastID,
          token,
          url: linkUrl,
          expires_at: expiresAt,
          person_name: person.name,
        },
      });
    });
  });
});

// Get feedback links for a person (users see their own, admins see all)
router.get("/people/:id/links", authenticate, (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === "admin";

  // Check if person exists and user has permission
  adminDb.get("SELECT * FROM people WHERE id = ?", [id], (err, person) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!person) {
      return res.status(404).json({ error: "Person not found" });
    }

    // Check permission: users can only see links for their own people
    if (!isAdmin && person.created_by_user_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only view links for your own people" });
    }

    const query = `
      SELECT 
        fl.*,
        p.name as person_name
      FROM feedback_links fl
      JOIN people p ON fl.person_id = p.id
      WHERE fl.person_id = ?
      ORDER BY fl.created_at DESC
    `;

    adminDb.all(query, [id], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Build frontend base URL (same logic as generate-link)
      const frontendBase = (
        process.env.FRONTEND_BASE_URL || "http://localhost:3000"
      ).replace(/\/$/, "");

      // Add URL to each link
      const linksWithUrl = rows.map((link) => ({
        ...link,
        url: `${frontendBase}/feedback/${link.link_token}`,
      }));

      res.json(linksWithUrl);
    });
  });
});

// Deactivate a feedback link (users can deactivate their own, admins can deactivate any)
router.put("/links/:id/deactivate", authenticate, (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === "admin";

  // Check if link exists and get associated person
  adminDb.get(
    `SELECT fl.*, p.created_by_user_id 
     FROM feedback_links fl
     JOIN people p ON fl.person_id = p.id
     WHERE fl.id = ?`,
    [id],
    (err, linkData) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!linkData) {
        return res.status(404).json({ error: "Link not found" });
      }

      // Check permission: users can only deactivate links for their own people
      if (!isAdmin && linkData.created_by_user_id !== req.user.id) {
        return res
          .status(403)
          .json({ error: "You can only deactivate links for your own people" });
      }

      adminDb.run(
        "UPDATE feedback_links SET is_active = 0 WHERE id = ?",
        [id],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: "Link not found" });
          }

          res.json({
            success: true,
            message: "Link deactivated successfully",
          });
        }
      );
    }
  );
});

// Get person info by link token (public endpoint)
router.get("/feedback/:token", (req, res) => {
  const { token } = req.params;

  const query = `
    SELECT 
      p.*,
      fl.expires_at,
      fl.is_active
    FROM people p
    JOIN feedback_links fl ON p.id = fl.person_id
    WHERE fl.link_token = ? AND fl.is_active = 1
  `;

  adminDb.get(query, [token], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res
        .status(404)
        .json({ error: "Invalid, expired, or already used link" });
    }

    // Check if link has expired
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return res.status(410).json({ error: "Link has expired" });
    }

    res.json({
      person: {
        id: row.id,
        name: row.name,
        email: row.email,
        department: row.department,
        position: row.position,
      },
      link_token: token,
    });
  });
});

module.exports = router;
