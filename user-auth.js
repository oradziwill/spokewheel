const bcrypt = require("bcrypt");
const adminDb = require("./admin-db");

// User authentication middleware
const authenticateUser = (req, res, next) => {
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

      // Verify password
      bcrypt.compare(password, user.password_hash, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ error: "Authentication error" });
        }

        if (!isMatch) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        req.user = user; // Attach user to request
        next();
      });
    }
  );
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
};

// User registration
const registerUser = (req, res) => {
  const { username, email, password, fullName } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ error: "Username, email, and password are required" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Validate password strength
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long" });
  }

  // Check if username or email already exists
  adminDb.get(
    "SELECT * FROM users WHERE username = ? OR email = ?",
    [username, email],
    (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (existingUser) {
        return res.status(400).json({
          error:
            existingUser.username === username
              ? "Username already exists"
              : "Email already exists",
        });
      }

      // Hash password
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          return res.status(500).json({ error: "Error hashing password" });
        }

        // Insert new user
        adminDb.run(
          "INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'user')",
          [username, email, hash, fullName || null],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            res.json({
              success: true,
              message: "User registered successfully",
              user: {
                id: this.lastID,
                username,
                email,
                full_name: fullName,
                role: "user",
              },
            });
          }
        );
      });
    }
  );
};

// User login
const loginUser = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

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

      bcrypt.compare(password, user.password_hash, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ error: "Authentication error" });
        }

        if (!isMatch) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        // Update last login time
        adminDb.run(
          "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
          [user.id],
          (updateErr) => {
            if (updateErr) {
              console.error("Error updating last login:", updateErr.message);
            }
          }
        );

        res.json({
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            last_login: user.last_login,
          },
        });
      });
    }
  );
};

// Get current user info
const getCurrentUser = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      full_name: req.user.full_name,
      role: req.user.role,
      last_login: req.user.last_login,
    },
  });
};

module.exports = {
  authenticateUser,
  requireAdmin,
  registerUser,
  loginUser,
  getCurrentUser,
};
