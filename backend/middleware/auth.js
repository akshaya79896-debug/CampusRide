const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: "Access denied. No authorization token provided." 
      });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid authorization header format. Expected 'Bearer <token>'." 
      });
    }

    const token = parts[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Access denied. Token is missing." 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [rows] = await pool.query(
      "SELECT id, name, email, phone, college, role FROM users WHERE id = ?",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: "User session is no longer valid. User not found." 
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false, 
        message: "Session expired. Please log in again." 
      });
    }
    return res.status(401).json({ 
      success: false, 
      message: "Invalid token. Authentication failed." 
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    if (!authHeader) return next();

    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer" && parts[1]) {
      const decoded = jwt.verify(parts[1], process.env.JWT_SECRET);
      const [rows] = await pool.query(
        "SELECT id, name, email, phone, college, role FROM users WHERE id = ?",
        [decoded.id]
      );
      if (rows.length > 0) {
        req.user = rows[0];
      }
    }
    next();
  } catch (e) {
    // If token invalid, proceed without user
    next();
  }
};

module.exports = authenticateToken;
module.exports.optionalAuth = optionalAuth;
module.exports.authenticateToken = authenticateToken;
