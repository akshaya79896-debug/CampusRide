const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authenticateToken } = require("../middleware/auth");
const requireAdmin = require("../middleware/admin");

// Student route to report a ride (requires authentication, but not admin)
router.post("/report", authenticateToken, adminController.createReport);

// All subsequent routes require ADMIN role
router.use(authenticateToken);
router.use(requireAdmin);

router.get("/stats", adminController.getStats);
router.get("/users", adminController.getAllUsers);
router.get("/rides", adminController.getAllRides);
router.delete("/rides/:id", adminController.deleteRideAdmin);
router.get("/reports", adminController.getReports);
router.patch("/reports/:id", adminController.updateReport);

module.exports = router;
