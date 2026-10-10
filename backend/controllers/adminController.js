const pool = require("../config/db");

// Get overall platform statistics
const getStats = async (req, res) => {
  try {
    const [userCounts] = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'STUDENT' THEN 1 ELSE 0 END) as student_count,
        SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) as admin_count
      FROM users
    `);

    const [rideCounts] = await pool.query(`
      SELECT 
        COUNT(*) as total_rides,
        SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_rides,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_rides,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_rides
      FROM rides
    `);

    const [requestCounts] = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted_requests,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_requests
      FROM ride_requests
    `);

    const [reportsCount] = await pool.query(`
      SELECT COUNT(*) as count FROM reports WHERE status = 'PENDING'
    `);

    return res.status(200).json({
      success: true,
      stats: {
        users: userCounts[0],
        rides: rideCounts[0],
        requests: requestCounts[0],
        pendingReports: reportsCount[0].count
      }
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch platform stats."
    });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.college, u.role, u.created_at,
        (SELECT COUNT(*) FROM rides r WHERE r.driver_id = u.id) as rides_offered,
        (SELECT COUNT(*) FROM ride_requests req WHERE req.passenger_id = u.id) as requests_made
      FROM users u
      ORDER BY u.id DESC
    `);

    return res.status(200).json({
      success: true,
      count: rows.length,
      users: rows
    });
  } catch (error) {
    console.error("Admin get users error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users."
    });
  }
};

// Get all rides across the platform
const getAllRides = async (req, res) => {
  try {
    const { status, vehicle_type } = req.query;

    let query = `
      SELECT 
        r.*,
        u.name as driver_name,
        u.email as driver_email,
        u.phone as driver_phone,
        u.college as driver_college,
        (SELECT COUNT(*) FROM ride_requests req WHERE req.ride_id = r.id) as total_requests
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }
    if (vehicle_type) {
      query += ` AND r.vehicle_type = ?`;
      params.push(vehicle_type);
    }

    query += ` ORDER BY r.id DESC`;

    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      rides: rows
    });
  } catch (error) {
    console.error("Admin get rides error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rides."
    });
  }
};

// Delete or cancel ride as admin
const deleteRideAdmin = async (req, res) => {
  try {
    const rideId = req.params.id;

    // Check ride
    const [rides] = await pool.query("SELECT * FROM rides WHERE id = ?", [rideId]);
    if (rides.length === 0) {
      return res.status(404).json({ success: false, message: "Ride not found." });
    }

    // Cancel ride
    await pool.query("UPDATE rides SET status = 'CANCELLED' WHERE id = ?", [rideId]);

    // Notify driver
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_ride_id)
       VALUES (?, 'Ride Removed by Admin', 'Your ride has been cancelled by an administrator due to safety or policy guidelines.', 'RIDE_CANCELLED', ?)`,
      [rides[0].driver_id, rideId]
    );

    return res.status(200).json({
      success: true,
      message: "Ride has been cancelled and driver notified."
    });
  } catch (error) {
    console.error("Admin delete ride error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update ride."
    });
  }
};

// Get all reports
const getReports = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        rep.*,
        u.name as reporter_name,
        u.email as reporter_email,
        r.source as ride_source,
        r.destination as ride_destination,
        r.driver_id
      FROM reports rep
      JOIN users u ON rep.reporter_id = u.id
      LEFT JOIN rides r ON rep.ride_id = r.id
      ORDER BY rep.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      reports: rows
    });
  } catch (error) {
    console.error("Admin get reports error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reports."
    });
  }
};

// Update report status
const updateReport = async (req, res) => {
  try {
    const reportId = req.params.id;
    const { status } = req.body;

    if (!["PENDING", "RESOLVED", "DISMISSED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    await pool.query("UPDATE reports SET status = ? WHERE id = ?", [status, reportId]);

    return res.status(200).json({
      success: true,
      message: `Report marked as ${status.toLowerCase()}.`
    });
  } catch (error) {
    console.error("Update report error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update report."
    });
  }
};

// Create a report (Any authenticated student can report)
const createReport = async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { ride_id, reason, details } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ success: false, message: "Reason is required." });
    }

    await pool.query(
      "INSERT INTO reports (reporter_id, ride_id, reason, details, status) VALUES (?, ?, ?, ?, 'PENDING')",
      [reporterId, ride_id || null, reason.trim(), details ? details.trim() : null]
    );

    return res.status(201).json({
      success: true,
      message: "Report submitted. Our admin team will review it."
    });
  } catch (error) {
    console.error("Create report error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit report."
    });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  getAllRides,
  deleteRideAdmin,
  getReports,
  updateReport,
  createReport
};
