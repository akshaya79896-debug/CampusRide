const pool = require("../config/db");

// Get all notifications for current user
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [userId]
    );

    const [unread] = await pool.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE",
      [userId]
    );

    return res.status(200).json({
      success: true,
      unreadCount: unread[0].count,
      notifications: rows
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications."
    });
  }
};

// Mark single notification as read
const markAsRead = async (req, res) => {
  try {
    const notifId = req.params.id;
    const userId = req.user.id;

    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
      [notifId, userId]
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read."
    });
  } catch (error) {
    console.error("Mark read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification."
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = ?",
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read."
    });
  } catch (error) {
    console.error("Mark all read error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notifications."
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
