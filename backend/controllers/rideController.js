const pool = require("../config/db");

// Helper to format current date and time in Indian Standard Time (IST, UTC+05:30)
const getISTDateTime = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const p = {};
  for (const part of parts) {
    p[part.type] = part.value;
  }
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
};

// Offer/Create a new ride
const createRide = async (req, res) => {
  try {
    const driverId = req.user.id;
    const {
      source,
      destination,
      travel_date,
      departure_time,
      vehicle_type,
      vehicle_details,
      total_seats,
      available_seats,
      fare,
      notes
    } = req.body;

    // Validation
    if (!source || !destination || !travel_date || !departure_time || !vehicle_type) {
      return res.status(400).json({
        success: false,
        message: "Source, destination, date, time, and vehicle type are required."
      });
    }

    // Verify departure date and time is in the future (IST)
    const currentIST = getISTDateTime();
    const formattedTime = departure_time.length === 5 ? `${departure_time}:00` : departure_time;
    const rideDateTime = `${travel_date} ${formattedTime}`;
    if (rideDateTime <= currentIST) {
      return res.status(400).json({
        success: false,
        message: "Departure date and time must be in the future."
      });
    }

    const validVehicles = ["Bike", "Car", "Auto"];
    if (!validVehicles.includes(vehicle_type)) {
      return res.status(400).json({
        success: false,
        message: "Vehicle type must be 'Bike', 'Car', or 'Auto'."
      });
    }

    const seats = parseInt(total_seats) || 1;
    if (seats < 1 || seats > 10) {
      return res.status(400).json({
        success: false,
        message: "Total seats must be between 1 and 10."
      });
    }

    const availSeats = available_seats !== undefined ? parseInt(available_seats) : seats;
    const rideFare = fare !== undefined ? parseFloat(fare) : 0.00;

    const [result] = await pool.query(
      `INSERT INTO rides 
        (driver_id, source, destination, travel_date, departure_time, vehicle_type, vehicle_details, total_seats, available_seats, fare, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
      [
        driverId,
        source.trim(),
        destination.trim(),
        travel_date,
        departure_time,
        vehicle_type,
        vehicle_details ? vehicle_details.trim() : null,
        seats,
        availSeats,
        rideFare,
        notes ? notes.trim() : null
      ]
    );

    const [newRide] = await pool.query(
      `SELECT r.*, u.name as driver_name, u.college as driver_college, u.phone as driver_phone
       FROM rides r
       JOIN users u ON r.driver_id = u.id
       WHERE r.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Ride offered successfully!",
      ride: newRide[0]
    });
  } catch (error) {
    console.error("Create ride error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create ride. Please check your inputs and try again."
    });
  }
};

// Search / Find rides with flexible filters and partial matching
const searchRides = async (req, res) => {
  try {
    const {
      source,
      destination,
      date,
      vehicle_type,
      min_seats,
      max_fare,
      status
    } = req.query;

    let query = `
      SELECT 
        r.*,
        u.name as driver_name,
        u.college as driver_college,
        u.phone as driver_phone,
        COALESCE(AVG(rt.rating), 0) as driver_avg_rating,
        COUNT(DISTINCT rt.id) as driver_rating_count
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      LEFT JOIN ratings rt ON rt.reviewee_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by status (default to OPEN with available seats; excludes CANCELLED, COMPLETED, FULL)
    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    } else {
      query += ` AND r.status = 'OPEN' AND r.available_seats > 0`;
    }

    // Automatically hide expired rides: departure date and time must be in the future (IST, UTC+05:30)
    const currentIST = getISTDateTime();
    query += ` AND TIMESTAMP(r.travel_date, r.departure_time) > ?`;
    params.push(currentIST);

    // Partial and case-insensitive matching for source (supports both manual entry and dropdown options)
    if (source && source.trim() !== "") {
      const src = source.trim().toLowerCase();
      query += ` AND (LOWER(r.source) LIKE ? OR ? LIKE CONCAT('%', LOWER(r.source), '%'))`;
      params.push(`%${src}%`, src);
    }

    // Partial and case-insensitive matching for destination (supports both manual entry and dropdown options)
    if (destination && destination.trim() !== "") {
      const dest = destination.trim().toLowerCase();
      query += ` AND (LOWER(r.destination) LIKE ? OR ? LIKE CONCAT('%', LOWER(r.destination), '%'))`;
      params.push(`%${dest}%`, dest);
    }

    // Filter by travel date
    if (date && date.trim() !== "") {
      query += ` AND r.travel_date = ?`;
      params.push(date.trim());
    }

    // Filter by vehicle type
    if (vehicle_type && vehicle_type.trim() !== "") {
      query += ` AND r.vehicle_type = ?`;
      params.push(vehicle_type.trim());
    }

    // Filter by minimum available seats
    if (min_seats) {
      query += ` AND r.available_seats >= ?`;
      params.push(parseInt(min_seats));
    }

    // Filter by max fare
    if (max_fare) {
      query += ` AND r.fare <= ?`;
      params.push(parseFloat(max_fare));
    }

    query += `
      GROUP BY r.id
      ORDER BY r.travel_date ASC, r.departure_time ASC
    `;

    const [rows] = await pool.query(query, params);

    const formattedRows = rows.map(r => ({
      ...r,
      driver_avg_rating: r.driver_avg_rating ? parseFloat(r.driver_avg_rating).toFixed(1) : "New"
    }));

    return res.status(200).json({
      success: true,
      count: formattedRows.length,
      rides: formattedRows
    });
  } catch (error) {
    console.error("Search rides error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search rides."
    });
  }
};

// Get single ride details
const getRideById = async (req, res) => {
  try {
    const rideId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;

    const [rows] = await pool.query(
      `SELECT 
        r.*,
        u.name as driver_name,
        u.college as driver_college,
        u.phone as driver_phone,
        u.email as driver_email,
        COALESCE(AVG(rt.rating), 0) as driver_avg_rating,
        COUNT(DISTINCT rt.id) as driver_rating_count
       FROM rides r
       JOIN users u ON r.driver_id = u.id
       LEFT JOIN ratings rt ON rt.reviewee_id = u.id
       WHERE r.id = ?
       GROUP BY r.id`,
      [rideId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ride not found."
      });
    }

    const ride = rows[0];
    ride.driver_avg_rating = ride.driver_avg_rating ? parseFloat(ride.driver_avg_rating).toFixed(1) : "New";

    // Get accepted passengers list
    const [acceptedPassengers] = await pool.query(
      `SELECT req.id as request_id, req.seats_requested, req.pickup_point, u.id as passenger_id, u.name as passenger_name, u.phone as passenger_phone, u.college as passenger_college
       FROM ride_requests req
       JOIN users u ON req.passenger_id = u.id
       WHERE req.ride_id = ? AND req.status = 'ACCEPTED'`,
      [rideId]
    );
    ride.passengers = acceptedPassengers;

    // Check current user's request status if authenticated
    if (currentUserId) {
      const [userRequest] = await pool.query(
        "SELECT id, status, seats_requested FROM ride_requests WHERE ride_id = ? AND passenger_id = ? ORDER BY id DESC LIMIT 1",
        [rideId, currentUserId]
      );
      ride.userRequest = userRequest.length > 0 ? userRequest[0] : null;
      ride.isOwner = ride.driver_id === currentUserId;
    }

    return res.status(200).json({
      success: true,
      ride
    });
  } catch (error) {
    console.error("Get ride error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve ride details."
    });
  }
};

// Get rides offered by logged-in user
const getMyOfferedRides = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT 
        r.*,
        (SELECT COUNT(*) FROM ride_requests req WHERE req.ride_id = r.id AND req.status = 'PENDING') as pending_requests_count,
        (SELECT COUNT(*) FROM ride_requests req WHERE req.ride_id = r.id AND req.status = 'ACCEPTED') as accepted_requests_count
       FROM rides r
       WHERE r.driver_id = ?
       ORDER BY r.travel_date DESC, r.departure_time DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      rides: rows
    });
  } catch (error) {
    console.error("Get offered rides error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch offered rides."
    });
  }
};

// Cancel a ride (driver only)
const cancelRide = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const rideId = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    await connection.beginTransaction();

    // Verify ownership
    const [rides] = await connection.query(
      "SELECT * FROM rides WHERE id = ? FOR UPDATE",
      [rideId]
    );

    if (rides.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Ride not found." });
    }

    const ride = rides[0];
    if (ride.driver_id !== userId && !isAdmin) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Unauthorized. You cannot cancel someone else's ride." });
    }

    if (ride.status === "CANCELLED") {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Ride is already cancelled." });
    }

    // Update ride status
    await connection.query("UPDATE rides SET status = 'CANCELLED' WHERE id = ?", [rideId]);

    // Find all passengers with PENDING or ACCEPTED requests
    const [requests] = await connection.query(
      "SELECT passenger_id, status FROM ride_requests WHERE ride_id = ? AND status IN ('PENDING', 'ACCEPTED')",
      [rideId]
    );

    // Cancel all requests
    await connection.query(
      "UPDATE ride_requests SET status = 'CANCELLED' WHERE ride_id = ? AND status IN ('PENDING', 'ACCEPTED')",
      [rideId]
    );

    // Send notifications to all affected passengers
    for (const reqItem of requests) {
      await connection.query(
        `INSERT INTO notifications (user_id, title, message, type, related_ride_id)
         VALUES (?, ?, ?, 'RIDE_CANCELLED', ?)`,
        [
          reqItem.passenger_id,
          "Ride Cancelled",
          `The ride from ${ride.source} to ${ride.destination} on ${ride.travel_date} has been cancelled by the driver.`,
          rideId
        ]
      );
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Ride has been cancelled and affected passengers have been notified."
    });
  } catch (error) {
    await connection.rollback();
    console.error("Cancel ride error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel ride."
    });
  } finally {
    connection.release();
  }
};

// Complete a ride (driver only)
const completeRide = async (req, res) => {
  try {
    const rideId = req.params.id;
    const userId = req.user.id;

    const [rides] = await pool.query("SELECT * FROM rides WHERE id = ?", [rideId]);
    if (rides.length === 0) {
      return res.status(404).json({ success: false, message: "Ride not found." });
    }

    const ride = rides[0];
    if (ride.driver_id !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Unauthorized to complete this ride." });
    }

    await pool.query("UPDATE rides SET status = 'COMPLETED' WHERE id = ?", [rideId]);

    // Notify passengers that ride is completed and they can rate the driver
    const [passengers] = await pool.query(
      "SELECT passenger_id FROM ride_requests WHERE ride_id = ? AND status = 'ACCEPTED'",
      [rideId]
    );

    for (const p of passengers) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_ride_id)
         VALUES (?, 'Ride Completed', 'Your ride has finished! Please rate your experience with the driver.', 'SYSTEM', ?)`,
        [p.passenger_id, rideId]
      );
    }

    return res.status(200).json({
      success: true,
      message: "Ride marked as completed!"
    });
  } catch (error) {
    console.error("Complete ride error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete ride."
    });
  }
};

module.exports = {
  createRide,
  searchRides,
  getRideById,
  getMyOfferedRides,
  cancelRide,
  completeRide
};
