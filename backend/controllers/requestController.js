const pool = require("../config/db");

// Passenger creates a request for a seat
const createRequest = async (req, res) => {
  const passengerId = req.user.id;
  const { ride_id, seats_requested = 1, pickup_point, notes } = req.body;

  if (!ride_id) {
    return res.status(400).json({
      success: false,
      message: "Ride ID is required."
    });
  }

  const requestedCount = parseInt(seats_requested) || 1;
  if (requestedCount < 1) {
    return res.status(400).json({
      success: false,
      message: "At least 1 seat must be requested."
    });
  }

  try {
    // 1. Fetch ride details
    const [rides] = await pool.query("SELECT * FROM rides WHERE id = ?", [ride_id]);
    if (rides.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ride not found."
      });
    }

    const ride = rides[0];

    // 2. Prevent driver from requesting their own ride
    if (ride.driver_id === passengerId) {
      return res.status(400).json({
        success: false,
        message: "You cannot request a seat on a ride you created."
      });
    }

    // 3. Prevent requests for cancelled or completed rides
    if (ride.status !== "OPEN") {
      return res.status(400).json({
        success: false,
        message: `This ride is currently ${ride.status.toLowerCase()} and cannot accept new requests.`
      });
    }

    // 4. Verify available seats
    if (ride.available_seats < requestedCount) {
      return res.status(400).json({
        success: false,
        message: `Only ${ride.available_seats} seat(s) currently available on this ride.`
      });
    }

    // 5. Prevent duplicate pending or accepted requests
    const [existing] = await pool.query(
      "SELECT id, status FROM ride_requests WHERE ride_id = ? AND passenger_id = ? AND status IN ('PENDING', 'ACCEPTED')",
      [ride_id, passengerId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `You already have an active request (${existing[0].status.toLowerCase()}) for this ride.`
      });
    }

    // 6. Insert new ride request
    const [result] = await pool.query(
      `INSERT INTO ride_requests (ride_id, passenger_id, seats_requested, status, pickup_point, notes)
       VALUES (?, ?, ?, 'PENDING', ?, ?)`,
      [ride_id, passengerId, requestedCount, pickup_point ? pickup_point.trim() : null, notes ? notes.trim() : null]
    );

    // 7. Send notification to the driver
    const passengerName = req.user.name || "A student";
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_ride_id)
       VALUES (?, ?, ?, 'REQUEST_RECEIVED', ?)`,
      [
        ride.driver_id,
        "New Seat Request",
        `${passengerName} requested ${requestedCount} seat(s) on your ride from ${ride.source} to ${ride.destination}.`,
        ride_id
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Seat request submitted successfully! The driver has been notified.",
      requestId: result.insertId
    });
  } catch (error) {
    console.error("Create request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit ride request."
    });
  }
};

// Accept a ride request (Driver only, Transaction + Row-Level Locking)
const acceptRequest = async (req, res) => {
  const requestId = req.params.id;
  const driverId = req.user.id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch request with row locking
    const [requests] = await connection.query(
      "SELECT * FROM ride_requests WHERE id = ? FOR UPDATE",
      [requestId]
    );

    if (requests.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Request not found."
      });
    }

    const request = requests[0];

    // Verify request is PENDING
    if (request.status !== "PENDING") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot accept request. It is currently '${request.status}'.`
      });
    }

    // 2. Fetch ride with row locking
    const [rides] = await connection.query(
      "SELECT * FROM rides WHERE id = ? FOR UPDATE",
      [request.ride_id]
    );

    if (rides.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Associated ride not found."
      });
    }

    const ride = rides[0];

    // Verify driver ownership
    if (ride.driver_id !== driverId && req.user.role !== "ADMIN") {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Unauthorized. You are not the driver of this ride."
      });
    }

    // Verify ride status is OPEN
    if (ride.status !== "OPEN") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Ride is not open for booking (current status: ${ride.status}).`
      });
    }

    // Verify available seats
    if (ride.available_seats < request.seats_requested) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Not enough seats available! Required: ${request.seats_requested}, Available: ${ride.available_seats}.`
      });
    }

    // 3. Update request status to ACCEPTED
    await connection.query(
      "UPDATE ride_requests SET status = 'ACCEPTED' WHERE id = ?",
      [requestId]
    );

    // 4. Update available seats on the ride
    const updatedSeats = ride.available_seats - request.seats_requested;
    const newStatus = updatedSeats === 0 ? "FULL" : "OPEN";

    await connection.query(
      "UPDATE rides SET available_seats = ?, status = ? WHERE id = ?",
      [updatedSeats, newStatus, ride.id]
    );

    // 5. Create notification for passenger
    await connection.query(
      `INSERT INTO notifications (user_id, title, message, type, related_ride_id)
       VALUES (?, 'Ride Request Accepted!', ?, 'REQUEST_ACCEPTED', ?)`,
      [
        request.passenger_id,
        `Your request for ${request.seats_requested} seat(s) on the ride from ${ride.source} to ${ride.destination} has been accepted!`,
        ride.id
      ]
    );

    // Commit transaction
    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Request accepted successfully!",
      updatedAvailableSeats: updatedSeats,
      rideStatus: newStatus
    });
  } catch (error) {
    await connection.rollback();
    console.error("Accept request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept request. Transaction rolled back."
    });
  } finally {
    connection.release();
  }
};

// Reject a ride request (Driver only)
const rejectRequest = async (req, res) => {
  const requestId = req.params.id;
  const driverId = req.user.id;

  try {
    // 1. Fetch request and ride info
    const [rows] = await pool.query(
      `SELECT req.*, r.driver_id, r.source, r.destination
       FROM ride_requests req
       JOIN rides r ON req.ride_id = r.id
       WHERE req.id = ?`,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Request not found."
      });
    }

    const request = rows[0];

    // Verify driver ownership
    if (request.driver_id !== driverId && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. You are not the driver of this ride."
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject request with status '${request.status}'.`
      });
    }

    // 2. Update status to REJECTED (available seats are unaffected)
    await pool.query(
      "UPDATE ride_requests SET status = 'REJECTED' WHERE id = ?",
      [requestId]
    );

    // 3. Notify passenger
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_ride_id)
       VALUES (?, 'Ride Request Declined', ?, 'REQUEST_REJECTED', ?)`,
      [
        request.passenger_id,
        `Your request for a seat from ${request.source} to ${request.destination} was declined by the driver.`,
        request.ride_id
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Request declined."
    });
  } catch (error) {
    console.error("Reject request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to decline request."
    });
  }
};

// Cancel request (Passenger cancels their own request)
const cancelRequest = async (req, res) => {
  const requestId = req.params.id;
  const passengerId = req.user.id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [requests] = await connection.query(
      "SELECT * FROM ride_requests WHERE id = ? FOR UPDATE",
      [requestId]
    );

    if (requests.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    const request = requests[0];

    if (request.passenger_id !== passengerId && req.user.role !== "ADMIN") {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    if (["CANCELLED", "REJECTED"].includes(request.status)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Request is already ${request.status.toLowerCase()}.` });
    }

    const wasAccepted = request.status === "ACCEPTED";

    // Mark as CANCELLED
    await connection.query("UPDATE ride_requests SET status = 'CANCELLED' WHERE id = ?", [requestId]);

    // If it was ACCEPTED, restore seats on ride
    if (wasAccepted) {
      const [rides] = await connection.query("SELECT * FROM rides WHERE id = ? FOR UPDATE", [request.ride_id]);
      if (rides.length > 0) {
        const ride = rides[0];
        const newSeats = Math.min(ride.total_seats, ride.available_seats + request.seats_requested);
        const newStatus = ride.status === "FULL" ? "OPEN" : ride.status;

        await connection.query(
          "UPDATE rides SET available_seats = ?, status = ? WHERE id = ?",
          [newSeats, newStatus, ride.id]
        );

        // Notify driver of passenger cancellation
        await connection.query(
          `INSERT INTO notifications (user_id, title, message, type, related_ride_id)
           VALUES (?, 'Passenger Cancelled Booking', ?, 'SYSTEM', ?)`,
          [
            ride.driver_id,
            `A passenger has cancelled their accepted seat for your ride from ${ride.source} to ${ride.destination}. 1+ seat released.`,
            ride.id
          ]
        );
      }
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Request cancelled successfully."
    });
  } catch (error) {
    await connection.rollback();
    console.error("Cancel request error:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel request." });
  } finally {
    connection.release();
  }
};

// Get requests made by logged-in passenger
const getMyRequests = async (req, res) => {
  try {
    const passengerId = req.user.id;

    const [rows] = await pool.query(
      `SELECT 
        req.id as request_id,
        req.seats_requested,
        req.status as request_status,
        req.pickup_point,
        req.notes as request_notes,
        req.created_at as request_date,
        r.id as ride_id,
        r.source,
        r.destination,
        r.travel_date,
        r.departure_time,
        r.vehicle_type,
        r.vehicle_details,
        r.fare,
        r.status as ride_status,
        u.id as driver_id,
        u.name as driver_name,
        u.phone as driver_phone,
        u.college as driver_college
       FROM ride_requests req
       JOIN rides r ON req.ride_id = r.id
       JOIN users u ON r.driver_id = u.id
       WHERE req.passenger_id = ?
       ORDER BY req.created_at DESC`,
      [passengerId]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      requests: rows
    });
  } catch (error) {
    console.error("Get my requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your requests."
    });
  }
};

// Get all requests received for a specific ride (Driver only)
const getRideRequests = async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const userId = req.user.id;

    // Verify ride ownership
    const [rides] = await pool.query("SELECT driver_id FROM rides WHERE id = ?", [rideId]);
    if (rides.length === 0) {
      return res.status(404).json({ success: false, message: "Ride not found." });
    }

    if (rides[0].driver_id !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    const [rows] = await pool.query(
      `SELECT 
        req.*,
        u.name as passenger_name,
        u.phone as passenger_phone,
        u.email as passenger_email,
        u.college as passenger_college,
        COALESCE(AVG(rt.rating), 0) as passenger_avg_rating
       FROM ride_requests req
       JOIN users u ON req.passenger_id = u.id
       LEFT JOIN ratings rt ON rt.reviewee_id = u.id
       WHERE req.ride_id = ?
       GROUP BY req.id
       ORDER BY req.created_at DESC`,
      [rideId]
    );

    const formatted = rows.map(r => ({
      ...r,
      passenger_avg_rating: r.passenger_avg_rating ? parseFloat(r.passenger_avg_rating).toFixed(1) : "New"
    }));

    return res.status(200).json({
      success: true,
      requests: formatted
    });
  } catch (error) {
    console.error("Get ride requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch ride requests."
    });
  }
};

module.exports = {
  createRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  getMyRequests,
  getRideRequests
};
