const bcrypt = require("bcrypt");
const adminDb = require("./admin-db");

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
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

  // Check admin credentials
  adminDb.get(
    "SELECT * FROM admin_users WHERE username = ?",
    [username],
    (err, admin) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (!admin) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      bcrypt.compare(password, admin.password_hash, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ error: "Authentication error" });
        }

        if (!isMatch) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        // Update last login
        adminDb.run(
          "UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
          [admin.id]
        );

        req.admin = admin;
        next();
      });
    }
  );
};

// Admin login endpoint
const adminLogin = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  adminDb.get(
    "SELECT * FROM admin_users WHERE username = ?",
    [username],
    (err, admin) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (!admin) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      bcrypt.compare(password, admin.password_hash, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ error: "Authentication error" });
        }

        if (!isMatch) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        // Update last login
        adminDb.run(
          "UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
          [admin.id]
        );

        res.json({
          success: true,
          message: "Login successful",
          admin: {
            id: admin.id,
            username: admin.username,
            last_login: admin.last_login,
          },
        });
      });
    }
  );
};

module.exports = {
  authenticateAdmin,
  adminLogin,
};
