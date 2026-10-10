const express = require("express");
const router = express.Router();
const requestController = require("../controllers/requestController");
const { authenticateToken } = require("../middleware/auth");

// All request routes require authentication
router.use(authenticateToken);

// Create request for a seat
router.post("/", requestController.createRequest);

// Get requests submitted by logged-in user
router.get("/my", requestController.getMyRequests);

// Get requests received for a specific ride (driver only)
router.get("/ride/:rideId", requestController.getRideRequests);

// Accept request (driver only - transaction & row lock)
router.patch("/:id/accept", requestController.acceptRequest);

// Reject request (driver only)
router.patch("/:id/reject", requestController.rejectRequest);

// Cancel request (passenger only)
router.patch("/:id/cancel", requestController.cancelRequest);

module.exports = router;
