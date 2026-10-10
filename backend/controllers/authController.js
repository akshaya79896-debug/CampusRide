const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Register a new user (always STUDENT by default)
const register = async (req, res) => {
  try {
    const { name, email, password, phone, college } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long."
      });
    }

    const trimmedName = name ? name.trim() : "Student";
    const trimmedPhone = phone ? phone.trim() : null;
    const trimmedCollege = college ? college.trim() : "College Campus";

    // Check if email already exists
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user strictly as STUDENT
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, phone, college, role) VALUES (?, ?, ?, ?, ?, 'STUDENT')",
      [trimmedName, trimmedEmail, hashedPassword, trimmedPhone, trimmedCollege]
    );

    // Generate token so student is logged in directly or can log in
    const token = jwt.sign(
      { id: result.insertId, role: "STUDENT", email: trimmedEmail },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful! Welcome to CampusRide.",
      token,
      user: {
        id: result.insertId,
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        college: trimmedCollege,
        role: "STUDENT"
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to register user. Please try again later."
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter both email and password."
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query user
    const [rows] = await pool.query(
      "SELECT id, name, email, password, phone, college, role FROM users WHERE email = ?",
      [trimmedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const user = rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Return safe user info (never password)
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        college: user.college,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to log in. Please try again later."
    });
  }
};

// Get current authenticated user profile & stats
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const [userRows] = await pool.query(
      "SELECT id, name, email, phone, college, role, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    const user = userRows[0];

    // Get statistics
    const [offeredCount] = await pool.query(
      "SELECT COUNT(*) AS count FROM rides WHERE driver_id = ?",
      [userId]
    );
    const [requestsCount] = await pool.query(
      "SELECT COUNT(*) AS count FROM ride_requests WHERE passenger_id = ?",
      [userId]
    );
    const [unreadNotifs] = await pool.query(
      "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE",
      [userId]
    );
    const [ratingsAvg] = await pool.query(
      "SELECT AVG(rating) AS avg_rating, COUNT(*) AS total_ratings FROM ratings WHERE reviewee_id = ?",
      [userId]
    );

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        stats: {
          ridesOffered: offeredCount[0].count,
          ridesRequested: requestsCount[0].count,
          unreadNotifications: unreadNotifs[0].count,
          avgRating: ratingsAvg[0].avg_rating ? parseFloat(ratingsAvg[0].avg_rating).toFixed(1) : "New",
          totalRatings: ratingsAvg[0].total_ratings
        }
      }
    });
  } catch (error) {
    console.error("GetMe error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile."
    });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, college } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Name cannot be empty."
      });
    }

    await pool.query(
      "UPDATE users SET name = ?, phone = ?, college = ? WHERE id = ?",
      [name.trim(), phone ? phone.trim() : null, college ? college.trim() : null, userId]
    );

    const [updated] = await pool.query(
      "SELECT id, name, email, phone, college, role FROM users WHERE id = ?",
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: updated[0]
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile."
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long."
      });
    }

    const [rows] = await pool.query("SELECT password FROM users WHERE id = ?", [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password."
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully."
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change password."
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword
};
