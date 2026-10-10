const pool = require("../config/db");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  console.log("Starting database migration...");
  const connection = await pool.getConnection();

  try {
    // 1. Check & add columns to `users`
    const [cols] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'"
    );
    const colNames = cols.map(c => c.COLUMN_NAME.toLowerCase());

    if (!colNames.includes("college")) {
      console.log("Adding 'college' column to users table...");
      await connection.query("ALTER TABLE users ADD COLUMN college VARCHAR(255) NULL DEFAULT 'Anurag University' AFTER phone");
    }

    if (!colNames.includes("created_at")) {
      console.log("Adding 'created_at' column to users table...");
      await connection.query("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    }

    // 2. Create `rides` table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS rides (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        driver_id BIGINT NOT NULL,
        source VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        travel_date DATE NOT NULL,
        departure_time TIME NOT NULL,
        vehicle_type ENUM('Bike', 'Car', 'Auto') NOT NULL,
        vehicle_details VARCHAR(255) NULL,
        total_seats INT NOT NULL,
        available_seats INT NOT NULL,
        fare DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        notes TEXT NULL,
        status ENUM('OPEN', 'FULL', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_rides_driver FOREIGN KEY (driver_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_rides_route (source, destination),
        INDEX idx_rides_date (travel_date),
        INDEX idx_rides_status (status),
        INDEX idx_rides_driver (driver_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Verified 'rides' table.");

    // 3. Create `ride_requests` table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ride_requests (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        ride_id BIGINT NOT NULL,
        passenger_id BIGINT NOT NULL,
        seats_requested INT NOT NULL DEFAULT 1,
        status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
        pickup_point VARCHAR(255) NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_requests_ride FOREIGN KEY (ride_id) REFERENCES rides (id) ON DELETE CASCADE,
        CONSTRAINT fk_requests_passenger FOREIGN KEY (passenger_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_requests_ride (ride_id),
        INDEX idx_requests_passenger (passenger_id),
        INDEX idx_requests_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Verified 'ride_requests' table.");

    // 4. Create `notifications` table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('REQUEST_RECEIVED', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'RIDE_CANCELLED', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
        related_ride_id BIGINT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_notifications_user_read (user_id, is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Verified 'notifications' table.");

    // 5. Create `ratings` table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        ride_id BIGINT NOT NULL,
        reviewer_id BIGINT NOT NULL,
        reviewee_id BIGINT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_ratings_ride FOREIGN KEY (ride_id) REFERENCES rides (id) ON DELETE CASCADE,
        CONSTRAINT fk_ratings_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_ratings_reviewee FOREIGN KEY (reviewee_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE KEY unique_ride_review (ride_id, reviewer_id, reviewee_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Verified 'ratings' table.");

    // 6. Create `reports` table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        reporter_id BIGINT NOT NULL,
        ride_id BIGINT NULL,
        reason VARCHAR(255) NOT NULL,
        details TEXT NULL,
        status ENUM('PENDING', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_reports_ride FOREIGN KEY (ride_id) REFERENCES rides (id) ON DELETE SET NULL,
        INDEX idx_reports_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Verified 'reports' table.");

    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration error:", err.message);
    throw err;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log("All tables ready.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = runMigration;
