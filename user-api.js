const express = require("express");
const {
  registerUser,
  loginUser,
  getCurrentUser,
  authenticateUser,
} = require("./user-auth");

const router = express.Router();

// Public endpoints
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected endpoints
router.get("/me", authenticateUser, getCurrentUser);

module.exports = router;
