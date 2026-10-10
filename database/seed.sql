-- =====================================================================
-- CampusRide Database Seed Script
-- Realistic demonstration data for testing
-- Will not delete existing users
-- =====================================================================

USE `campusride`;

-- Ensure admin account exists (password: Admin@123, bcrypt hash)
-- Hashed using bcrypt with 10 salt rounds: $2a$10$y6m3hU7m5yVvQ1j3vU4Hk.oY8nIq6cIe3KzDkL/m2iJzVdM0dO2q. (or standard hash)
-- We can also safely insert with IGNORE on email
INSERT IGNORE INTO `users` (`email`, `name`, `password`, `phone`, `college`, `role`)
VALUES (
  'admin@campusride.com',
  'CampusRide Admin',
  '$2a$10$7Zhy1b.lC1Lz8bO5eG8q7Ob5x5xO9c2ZgC3bO5wK3qH1s5u8q6mOu', -- Admin@123
  '9876543210',
  'Administration',
  'ADMIN'
);

-- Seed some demo rides if none exist
-- (Associating with existing user id 1, 2, or 3 if present)
INSERT INTO `rides` (`driver_id`, `source`, `destination`, `travel_date`, `departure_time`, `vehicle_type`, `vehicle_details`, `total_seats`, `available_seats`, `fare`, `notes`, `status`)
SELECT 1, 'Uppal Metro Station', 'Anurag University, Ghatkesar', CURDATE() + INTERVAL 1 DAY, '08:30:00', 'Bike', 'Royal Enfield Classic 350 (TS08EA1234)', 1, 1, 40.00, 'Travelling daily for morning lectures. Helmet mandatory.', 'OPEN'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `rides` WHERE `source` = 'Uppal Metro Station' AND `destination` = 'Anurag University, Ghatkesar');

INSERT INTO `rides` (`driver_id`, `source`, `destination`, `travel_date`, `departure_time`, `vehicle_type`, `vehicle_details`, `total_seats`, `available_seats`, `fare`, `notes`, `status`)
SELECT 2, 'LB Nagar Ring Road', 'Anurag University, Ghatkesar', CURDATE() + INTERVAL 1 DAY, '08:15:00', 'Car', 'Hyundai i20 White (TS07GH5678)', 3, 3, 60.00, 'AC car, space for bags. Pick up near D-Mart.', 'OPEN'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `rides` WHERE `source` = 'LB Nagar Ring Road' AND `destination` = 'Anurag University, Ghatkesar');

INSERT INTO `rides` (`driver_id`, `source`, `destination`, `travel_date`, `departure_time`, `vehicle_type`, `vehicle_details`, `total_seats`, `available_seats`, `fare`, `notes`, `status`)
SELECT 1, 'Secunderabad Railway Station', 'Osmania University Campus', CURDATE() + INTERVAL 2 DAY, '09:00:00', 'Auto', 'Bajaj Maxima (TS10UA9012)', 3, 3, 30.00, 'Shared auto for campus students. Very economical.', 'OPEN'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `rides` WHERE `source` = 'Secunderabad Railway Station' AND `destination` = 'Osmania University Campus');
