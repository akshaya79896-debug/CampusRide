-- =====================================================================
-- CampusRide Database Migration
-- Target Database: campusride
-- MySQL 8.0+ Compatible
-- Safe migration: preserves existing `users` table and all records.
-- =====================================================================

USE `campusride`;

-- 1. Ensure `college` and `created_at` columns exist in `users`
SET @dbname = DATABASE();
SET @tablename = "users";

-- Check and add `college` column
SET @columnname = "college";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE `", @tablename, "` ADD COLUMN `", @columnname, "` VARCHAR(255) NULL DEFAULT 'Anurag University' AFTER `phone`;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check and add `created_at` column
SET @columnname = "created_at";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE `", @tablename, "` ADD COLUMN `", @columnname, "` TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Create `rides` table
CREATE TABLE IF NOT EXISTS `rides` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `driver_id` BIGINT NOT NULL,
  `source` VARCHAR(255) NOT NULL,
  `destination` VARCHAR(255) NOT NULL,
  `travel_date` DATE NOT NULL,
  `departure_time` TIME NOT NULL,
  `vehicle_type` ENUM('Bike', 'Car', 'Auto') NOT NULL,
  `vehicle_details` VARCHAR(255) NULL,
  `total_seats` INT NOT NULL,
  `available_seats` INT NOT NULL,
  `fare` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `status` ENUM('OPEN', 'FULL', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rides_driver` FOREIGN KEY (`driver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_rides_route` (`source`, `destination`),
  INDEX `idx_rides_date` (`travel_date`),
  INDEX `idx_rides_status` (`status`),
  INDEX `idx_rides_driver` (`driver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create `ride_requests` table
CREATE TABLE IF NOT EXISTS `ride_requests` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `ride_id` BIGINT NOT NULL,
  `passenger_id` BIGINT NOT NULL,
  `seats_requested` INT NOT NULL DEFAULT 1,
  `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `pickup_point` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_requests_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_requests_passenger` FOREIGN KEY (`passenger_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_requests_ride` (`ride_id`),
  INDEX `idx_requests_passenger` (`passenger_id`),
  INDEX `idx_requests_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create `notifications` table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('REQUEST_RECEIVED', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'RIDE_CANCELLED', 'SYSTEM') NOT NULL DEFAULT 'SYSTEM',
  `related_ride_id` BIGINT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_notifications_user_read` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create `ratings` table
CREATE TABLE IF NOT EXISTS `ratings` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `ride_id` BIGINT NOT NULL,
  `reviewer_id` BIGINT NOT NULL,
  `reviewee_id` BIGINT NOT NULL,
  `rating` INT NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `review` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ratings_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ratings_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ratings_reviewee` FOREIGN KEY (`reviewee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_ride_review` (`ride_id`, `reviewer_id`, `reviewee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Create `reports` table
CREATE TABLE IF NOT EXISTS `reports` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `reporter_id` BIGINT NOT NULL,
  `ride_id` BIGINT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `details` TEXT NULL,
  `status` ENUM('PENDING', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_reports_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_ride` FOREIGN KEY (`ride_id`) REFERENCES `rides` (`id`) ON DELETE SET NULL,
  INDEX `idx_reports_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
