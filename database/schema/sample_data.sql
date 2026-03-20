-- ============================================================================
-- Movie Ticket Booking System - Sample Data
-- File: sample_data.sql
-- Purpose: Populate database with sample data for testing
-- Version: 2.0
-- Date: 2026-03-20
-- ============================================================================

USE movie_booking_db;

-- ============================================================================
-- STEP 1: Insert Sample Users
-- ============================================================================

INSERT INTO Users (name, email, password_hash, role) VALUES
('John Doe', 'john.doe@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'USER'),
('Jane Smith', 'jane.smith@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'USER'),
('Admin User', 'admin@moviebooking.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN'),
('Alice Johnson', 'alice.j@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'USER'),
('Bob Williams', 'bob.w@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'USER');

-- ============================================================================
-- STEP 2: Insert Sample Movies
-- ============================================================================

INSERT INTO Movies (title, genre, duration, language, release_date) VALUES
('The Matrix Resurrections', 'Sci-Fi', 148, 'English', '2021-12-22'),
('Dune: Part Two', 'Sci-Fi', 166, 'English', '2024-03-01'),
('Oppenheimer', 'Biography', 180, 'English', '2023-07-21'),
('Jawan', 'Action', 169, 'Hindi', '2023-09-07'),
('Pathaan', 'Action', 146, 'Hindi', '2023-01-25'),
('Avatar: The Way of Water', 'Sci-Fi', 192, 'English', '2022-12-16'),
('RRR', 'Action', 187, 'Telugu', '2022-03-25'),
('The Kashmir Files', 'Drama', 170, 'Hindi', '2022-03-11');

-- ============================================================================
-- STEP 3: Insert Sample Theatres
-- ============================================================================

INSERT INTO Theatres (name, location) VALUES
('PVR Cinemas', 'Phoenix Market City, Mumbai'),
('INOX Megaplex', 'R-City Mall, Ghatkopar, Mumbai'),
('Cinepolis', 'Seasons Mall, Pune'),
('Carnival Cinemas', 'Rave Mova, Bangalore'),
('PVR IMAX', 'Select City Walk, Delhi');

-- ============================================================================
-- STEP 4: Insert Sample Screens
-- ============================================================================

-- PVR Cinemas (theatre_id = 1) - 4 screens
INSERT INTO Screens (theatre_id, screen_number) VALUES
(1, 1), (1, 2), (1, 3), (1, 4);

-- INOX Megaplex (theatre_id = 2) - 3 screens
INSERT INTO Screens (theatre_id, screen_number) VALUES
(2, 1), (2, 2), (2, 3);

-- Cinepolis (theatre_id = 3) - 3 screens
INSERT INTO Screens (theatre_id, screen_number) VALUES
(3, 1), (3, 2), (3, 3);

-- Carnival Cinemas (theatre_id = 4) - 2 screens
INSERT INTO Screens (theatre_id, screen_number) VALUES
(4, 1), (4, 2);

-- PVR IMAX (theatre_id = 5) - 2 screens
INSERT INTO Screens (theatre_id, screen_number) VALUES
(5, 1), (5, 2);

-- ============================================================================
-- STEP 5: Insert Sample Seats
-- ============================================================================

-- Helper: Create seats for each screen
-- Screen 1 (50 seats: 40 REGULAR + 10 VIP)
INSERT INTO Seats (screen_id, seat_number, seat_type) VALUES
-- REGULAR seats (Rows A-D, 10 seats each)
(1, 'A1', 'REGULAR'), (1, 'A2', 'REGULAR'), (1, 'A3', 'REGULAR'), (1, 'A4', 'REGULAR'), (1, 'A5', 'REGULAR'),
(1, 'A6', 'REGULAR'), (1, 'A7', 'REGULAR'), (1, 'A8', 'REGULAR'), (1, 'A9', 'REGULAR'), (1, 'A10', 'REGULAR'),
(1, 'B1', 'REGULAR'), (1, 'B2', 'REGULAR'), (1, 'B3', 'REGULAR'), (1, 'B4', 'REGULAR'), (1, 'B5', 'REGULAR'),
(1, 'B6', 'REGULAR'), (1, 'B7', 'REGULAR'), (1, 'B8', 'REGULAR'), (1, 'B9', 'REGULAR'), (1, 'B10', 'REGULAR'),
(1, 'C1', 'REGULAR'), (1, 'C2', 'REGULAR'), (1, 'C3', 'REGULAR'), (1, 'C4', 'REGULAR'), (1, 'C5', 'REGULAR'),
(1, 'C6', 'REGULAR'), (1, 'C7', 'REGULAR'), (1, 'C8', 'REGULAR'), (1, 'C9', 'REGULAR'), (1, 'C10', 'REGULAR'),
(1, 'D1', 'REGULAR'), (1, 'D2', 'REGULAR'), (1, 'D3', 'REGULAR'), (1, 'D4', 'REGULAR'), (1, 'D5', 'REGULAR'),
(1, 'D6', 'REGULAR'), (1, 'D7', 'REGULAR'), (1, 'D8', 'REGULAR'), (1, 'D9', 'REGULAR'), (1, 'D10', 'REGULAR'),
-- VIP seats (Row E, 10 seats)
(1, 'E1', 'VIP'), (1, 'E2', 'VIP'), (1, 'E3', 'VIP'), (1, 'E4', 'VIP'), (1, 'E5', 'VIP'),
(1, 'E6', 'VIP'), (1, 'E7', 'VIP'), (1, 'E8', 'VIP'), (1, 'E9', 'VIP'), (1, 'E10', 'VIP');

-- Screen 2 (30 seats: 25 REGULAR + 5 VIP)
INSERT INTO Seats (screen_id, seat_number, seat_type) VALUES
(2, 'A1', 'REGULAR'), (2, 'A2', 'REGULAR'), (2, 'A3', 'REGULAR'), (2, 'A4', 'REGULAR'), (2, 'A5', 'REGULAR'),
(2, 'A6', 'REGULAR'), (2, 'A7', 'REGULAR'), (2, 'A8', 'REGULAR'), (2, 'A9', 'REGULAR'), (2, 'A10', 'REGULAR'),
(2, 'B1', 'REGULAR'), (2, 'B2', 'REGULAR'), (2, 'B3', 'REGULAR'), (2, 'B4', 'REGULAR'), (2, 'B5', 'REGULAR'),
(2, 'B6', 'REGULAR'), (2, 'B7', 'REGULAR'), (2, 'B8', 'REGULAR'), (2, 'B9', 'REGULAR'), (2, 'B10', 'REGULAR'),
(2, 'C1', 'REGULAR'), (2, 'C2', 'REGULAR'), (2, 'C3', 'REGULAR'), (2, 'C4', 'REGULAR'), (2, 'C5', 'REGULAR'),
(2, 'C6', 'VIP'), (2, 'C7', 'VIP'), (2, 'C8', 'VIP'), (2, 'C9', 'VIP'), (2, 'C10', 'VIP');

-- Note: Add more seats for other screens as needed

-- ============================================================================
-- STEP 6: Insert Sample Shows
-- ============================================================================

-- Shows for today and upcoming days
INSERT INTO Shows (movie_id, screen_id, show_time, price) VALUES
-- Dune: Part Two (movie_id = 2)
(2, 1, '2026-03-20 10:00:00', 250.00),
(2, 1, '2026-03-20 14:00:00', 300.00),
(2, 1, '2026-03-20 18:00:00', 350.00),
(2, 1, '2026-03-20 22:00:00', 300.00),

-- Oppenheimer (movie_id = 3)
(3, 2, '2026-03-20 11:00:00', 280.00),
(3, 2, '2026-03-20 15:00:00', 320.00),
(3, 2, '2026-03-20 19:00:00', 380.00),

-- Pathaan (movie_id = 5)
(5, 3, '2026-03-20 12:00:00', 200.00),
(5, 3, '2026-03-20 16:00:00', 250.00),
(5, 3, '2026-03-20 20:00:00', 300.00),

-- Tomorrow's shows
(2, 1, '2026-03-21 10:00:00', 250.00),
(3, 2, '2026-03-21 11:00:00', 280.00),
(5, 3, '2026-03-21 12:00:00', 200.00);

-- ============================================================================
-- STEP 7: Insert Sample Bookings
-- ============================================================================

-- Booking 1: John Doe books 2 seats for Dune show
INSERT INTO Bookings (user_id, show_id, total_amount, status) VALUES
(1, 1, 500.00, 'CONFIRMED');

INSERT INTO Booking_Seats (booking_id, seat_id) VALUES
(1, 1), (1, 2); -- Seats A1, A2

-- Booking 2: Jane Smith books 3 VIP seats for Dune show
INSERT INTO Bookings (user_id, show_id, total_amount, status) VALUES
(2, 1, 900.00, 'CONFIRMED');

INSERT INTO Booking_Seats (booking_id, seat_id) VALUES
(2, 41), (2, 42), (2, 43); -- Seats E1, E2, E3

-- Booking 3: Alice books 1 seat for Oppenheimer
INSERT INTO Bookings (user_id, show_id, total_amount, status) VALUES
(4, 5, 280.00, 'CONFIRMED');

INSERT INTO Booking_Seats (booking_id, seat_id) VALUES
(3, 51); -- First seat in Screen 2

-- Booking 4: Cancelled booking example
INSERT INTO Bookings (user_id, show_id, total_amount, status) VALUES
(5, 8, 400.00, 'CANCELLED');

INSERT INTO Booking_Seats (booking_id, seat_id) VALUES
(4, 3), (4, 4); -- Seats A3, A4

-- ============================================================================
-- STEP 8: Insert Sample Payments
-- ============================================================================

INSERT INTO Payments (booking_id, amount, payment_method, payment_status) VALUES
(1, 500.00, 'CREDIT_CARD', 'SUCCESS'),
(2, 900.00, 'UPI', 'SUCCESS'),
(3, 280.00, 'DEBIT_CARD', 'SUCCESS'),
(4, 400.00, 'CREDIT_CARD', 'SUCCESS'); -- Payment succeeded but booking cancelled later

-- ============================================================================
-- Verify Sample Data
-- ============================================================================

SELECT 'Sample data inserted successfully!' AS Status;

-- Summary statistics
SELECT 'Users' AS Entity, COUNT(*) AS Count FROM Users
UNION ALL
SELECT 'Movies', COUNT(*) FROM Movies
UNION ALL
SELECT 'Theatres', COUNT(*) FROM Theatres
UNION ALL
SELECT 'Screens', COUNT(*) FROM Screens
UNION ALL
SELECT 'Seats', COUNT(*) FROM Seats
UNION ALL
SELECT 'Shows', COUNT(*) FROM Shows
UNION ALL
SELECT 'Bookings', COUNT(*) FROM Bookings
UNION ALL
SELECT 'Booking_Seats', COUNT(*) FROM Booking_Seats
UNION ALL
SELECT 'Payments', COUNT(*) FROM Payments
UNION ALL
SELECT 'Audit_Bookings', COUNT(*) FROM Audit_Bookings;

-- ============================================================================
-- End of sample data
-- ============================================================================
