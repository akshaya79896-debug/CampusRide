const express = require("express");
const router = express.Router();
const rideController = require("../controllers/rideController");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

// Search rides (public, supports filter queries)
router.get("/", rideController.searchRides);

// Get rides offered by logged in user (protected)
// NOTE: MUST be defined before /:id route
router.get("/user/offered", authenticateToken, rideController.getMyOfferedRides);

// Get single ride details (optional auth to identify requester relation)
router.get("/:id", optionalAuth, rideController.getRideById);

// Create / Offer a new ride (protected)
router.post("/", authenticateToken, rideController.createRide);

// Cancel a ride (protected, driver only)
router.patch("/:id/cancel", authenticateToken, rideController.cancelRide);

// Complete a ride (protected, driver only)
router.patch("/:id/complete", authenticateToken, rideController.completeRide);

module.exports = router;
