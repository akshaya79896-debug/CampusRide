const express = require("express");
const router = express.Router();
const ratingController = require("../controllers/ratingController");
const { authenticateToken } = require("../middleware/auth");

// Public route to view a user's ratings & reviews
router.get("/user/:userId", ratingController.getUserRatings);

// Protected route to submit a rating for a completed ride
router.post("/", authenticateToken, ratingController.createRating);

module.exports = router;
