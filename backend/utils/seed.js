const pool = require("../config/db");
const bcrypt = require("bcryptjs");

async function seedData() {
  console.log("Seeding initial data...");
  const connection = await pool.getConnection();

  try {
    // 1. Ensure an Admin user exists
    const [adminCheck] = await connection.query("SELECT id FROM users WHERE email = 'admin@campusride.com'");
    if (adminCheck.length === 0) {
      const hashedPassword = await bcrypt.hash("Admin@123", 10);
      await connection.query(
        "INSERT INTO users (name, email, password, phone, college, role) VALUES (?, ?, ?, ?, ?, ?)",
        ["CampusRide Admin", "admin@campusride.com", hashedPassword, "9876543210", "Administration", "ADMIN"]
      );
      console.log("Created admin user: admin@campusride.com");
    }

    // 2. Ensure sample demo rides exist for testing
    const [ridesCheck] = await connection.query("SELECT COUNT(*) AS count FROM rides");
    if (ridesCheck[0].count === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      const dayAfterStr = dayAfter.toISOString().split("T")[0];

      // Add ride from user 1 (Akshaya)
      await connection.query(`
        INSERT INTO rides (driver_id, source, destination, travel_date, departure_time, vehicle_type, vehicle_details, total_seats, available_seats, fare, notes, status)
        VALUES (?, 'Uppal Metro Station', 'Anurag University, Ghatkesar', ?, '08:30:00', 'Bike', 'Royal Enfield Classic 350 (TS08EA1234)', 1, 1, 40.00, 'Travelling daily for morning lectures. Helmet mandatory.', 'OPEN')
      `, [1, tomorrowStr]);

      // Add ride from user 2 (Rahul)
      await connection.query(`
        INSERT INTO rides (driver_id, source, destination, travel_date, departure_time, vehicle_type, vehicle_details, total_seats, available_seats, fare, notes, status)
        VALUES (?, 'LB Nagar Ring Road', 'Anurag University, Ghatkesar', ?, '08:15:00', 'Car', 'Hyundai i20 White (TS07GH5678)', 3, 3, 60.00, 'AC car, space for bags. Pick up near D-Mart.', 'OPEN')
      `, [2, tomorrowStr]);

      // Add ride from user 1 (Akshaya)
      await connection.query(`
        INSERT INTO rides (driver_id, source, destination, travel_date, departure_time, vehicle_type, vehicle_details, total_seats, available_seats, fare, notes, status)
        VALUES (?, 'Secunderabad Railway Station', 'Osmania University Campus', ?, '09:00:00', 'Auto', 'Bajaj Maxima (TS10UA9012)', 3, 3, 30.00, 'Shared auto for campus students. Very economical.', 'OPEN')
      `, [1, dayAfterStr]);

      console.log("Inserted sample rides.");
    }

    console.log("Seeding complete.");
  } catch (err) {
    console.error("Seed error:", err.message);
    throw err;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedData;
