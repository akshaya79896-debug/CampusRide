const pool = require("../config/db");

// Submit a rating and review for a completed ride
const createRating = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { ride_id, reviewee_id, rating, review } = req.body;

    if (!ride_id || !reviewee_id || !rating) {
      return res.status(400).json({
        success: false,
        message: "Ride ID, reviewee ID, and rating (1-5) are required."
      });
    }

    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5."
      });
    }

    if (reviewerId === parseInt(reviewee_id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot rate yourself."
      });
    }

    // 1. Verify ride exists and is COMPLETED
    const [rides] = await pool.query("SELECT * FROM rides WHERE id = ?", [ride_id]);
    if (rides.length === 0) {
      return res.status(404).json({ success: false, message: "Ride not found." });
    }

    const ride = rides[0];
    if (ride.status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Ratings can only be submitted for completed rides."
      });
    }

    // 2. Verify eligibility: reviewer and reviewee must have been participants in this ride
    // Either reviewer was driver and reviewee was accepted passenger,
    // OR reviewer was accepted passenger and reviewee was driver.
    const isReviewerDriver = ride.driver_id === reviewerId;
    const isRevieweeDriver = ride.driver_id === parseInt(reviewee_id);

    if (isReviewerDriver) {
      // Check if reviewee was an accepted passenger
      const [passengerReq] = await pool.query(
        "SELECT id FROM ride_requests WHERE ride_id = ? AND passenger_id = ? AND status = 'ACCEPTED'",
        [ride_id, reviewee_id]
      );
      if (passengerReq.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You can only rate accepted passengers of your ride."
        });
      }
    } else if (isRevieweeDriver) {
      // Check if reviewer was an accepted passenger
      const [passengerReq] = await pool.query(
        "SELECT id FROM ride_requests WHERE ride_id = ? AND passenger_id = ? AND status = 'ACCEPTED'",
        [ride_id, reviewerId]
      );
      if (passengerReq.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You can only rate the driver if you had an accepted booking."
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "You are not an eligible participant for this ride."
      });
    }

    // 3. Prevent duplicate rating
    const [existing] = await pool.query(
      "SELECT id FROM ratings WHERE ride_id = ? AND reviewer_id = ? AND reviewee_id = ?",
      [ride_id, reviewerId, reviewee_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You have already submitted a rating for this user on this ride."
      });
    }

    // 4. Insert rating
    await pool.query(
      "INSERT INTO ratings (ride_id, reviewer_id, reviewee_id, rating, review) VALUES (?, ?, ?, ?, ?)",
      [ride_id, reviewerId, reviewee_id, ratingNum, review ? review.trim() : null]
    );

    return res.status(201).json({
      success: true,
      message: "Thank you! Your rating has been submitted."
    });
  } catch (error) {
    console.error("Create rating error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit rating."
    });
  }
};

// Get ratings & reviews for a user
const getUserRatings = async (req, res) => {
  try {
    const userId = req.params.userId;

    const [reviews] = await pool.query(
      `SELECT rt.*, u.name as reviewer_name, r.source, r.destination, r.travel_date
       FROM ratings rt
       JOIN users u ON rt.reviewer_id = u.id
       JOIN rides r ON rt.ride_id = r.id
       WHERE rt.reviewee_id = ?
       ORDER BY rt.created_at DESC`,
      [userId]
    );

    const [summary] = await pool.query(
      "SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM ratings WHERE reviewee_id = ?",
      [userId]
    );

    return res.status(200).json({
      success: true,
      avgRating: summary[0].avg_rating ? parseFloat(summary[0].avg_rating).toFixed(1) : "New",
      totalReviews: summary[0].total_reviews,
      reviews
    });
  } catch (error) {
    console.error("Get user ratings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve ratings."
    });
  }
};

module.exports = {
  createRating,
  getUserRatings
};
