-- ============================================================================
-- View: vw_booking_summary
-- Purpose: Complete booking details with user, show, seat, and payment info
-- ============================================================================
-- Description:
--   Comprehensive booking view that aggregates all booking-related information
--   into a single denormalized view. Includes user details, show information,
--   seat numbers, payment status, and booking metadata.
--
-- Usage:
--   1. Get booking history for a user:
--      SELECT * FROM vw_booking_summary
--      WHERE user_email = 'user@example.com'
--      ORDER BY booking_time DESC;
--
--   2. Get booking details for receipt:
--      SELECT booking_id, movie_title, theatre_name, show_time,
--             seat_numbers, total_amount, payment_status
--      FROM vw_booking_summary
--      WHERE booking_id = 123;
--
--   3. Get all confirmed bookings for a show:
--      SELECT user_name, user_email, seat_numbers, total_amount
--      FROM vw_booking_summary
--      WHERE show_id = 5 AND booking_status = 'CONFIRMED';
--
--   4. Find bookings by date range:
--      SELECT * FROM vw_booking_summary
--      WHERE booking_time BETWEEN '2026-03-01' AND '2026-03-31'
--      ORDER BY booking_time DESC;
--
-- Performance Notes:
--   - Uses GROUP BY to aggregate seat numbers
--   - GROUP_CONCAT can be expensive for large seat counts
--   - Consider caching for frequently accessed bookings
--   - Indexed on booking_id, user_id, show_id
--
-- Dependencies:
--   - Bookings, Users, Shows, Movies, Theatres, Screens
--   - Booking_Seats, Seats junction
--   - Payments table
-- ============================================================================

DROP VIEW IF EXISTS vw_booking_summary;

CREATE VIEW vw_booking_summary AS
SELECT
    b.booking_id,
    -- User information
    u.name AS user_name,
    u.email AS user_email,
    -- Show information
    m.title AS movie_title,
    t.name AS theatre_name,
    sc.screen_number,
    sh.show_time,
    -- Seat details (aggregated)
    GROUP_CONCAT(
        se.seat_number
        ORDER BY se.seat_number ASC
        SEPARATOR ', '
    ) AS seat_numbers,
    -- Booking details
    b.total_amount,
    b.status AS booking_status,
    b.created_at AS booking_time,
    -- Payment information
    COALESCE(p.payment_status, 'PENDING') AS payment_status,
    p.payment_method,
    p.created_at AS payment_time
FROM
    Bookings b
    INNER JOIN Users u ON b.user_id = u.user_id
    INNER JOIN Shows sh ON b.show_id = sh.show_id
    INNER JOIN Movies m ON sh.movie_id = m.movie_id
    INNER JOIN Screens sc ON sh.screen_id = sc.screen_id
    INNER JOIN Theatres t ON sc.theatre_id = t.theatre_id
    -- Join to get all booked seats
    INNER JOIN Booking_Seats bs ON b.booking_id = bs.booking_id
    INNER JOIN Seats se ON bs.seat_id = se.seat_id
    -- LEFT JOIN for payment (may not exist for cancelled bookings)
    LEFT JOIN Payments p ON b.booking_id = p.booking_id
WHERE
    -- Respect soft deletes
    b.is_deleted = FALSE
    AND sh.is_deleted = FALSE
    AND m.is_deleted = FALSE
GROUP BY
    b.booking_id,
    u.name,
    u.email,
    m.title,
    t.name,
    sc.screen_number,
    sh.show_time,
    b.total_amount,
    b.status,
    b.created_at,
    p.payment_status,
    p.payment_method,
    p.created_at;

-- ============================================================================
-- Index Recommendations for Optimal Performance:
-- ============================================================================
-- Required indexes (should exist from 002_create_indexes.sql):
--
-- 1. INDEX idx_booking_user ON Bookings(user_id, is_deleted)
-- 2. INDEX idx_booking_show ON Bookings(show_id, is_deleted)
-- 3. INDEX idx_booking_seats_booking ON Booking_Seats(booking_id)
-- 4. INDEX idx_payment_booking ON Payments(booking_id)
-- 5. INDEX idx_booking_created ON Bookings(created_at)
--
-- These indexes optimize:
-- - User booking history queries
-- - Show-specific booking lookups
-- - Seat aggregation via junction table
-- - Payment status joins
-- - Time-based booking searches
-- ============================================================================

-- ============================================================================
-- Sample Queries and Expected Performance:
-- ============================================================================

-- Query 1: User booking history (Expected: < 100ms for 50 bookings)
-- SELECT booking_id, movie_title, show_time, seat_numbers, total_amount, booking_status
-- FROM vw_booking_summary
-- WHERE user_email = 'john.doe@example.com'
-- ORDER BY booking_time DESC
-- LIMIT 10;

-- Query 2: Specific booking details for receipt (Expected: < 50ms)
-- SELECT
--     booking_id,
--     user_name,
--     movie_title,
--     theatre_name,
--     screen_number,
--     show_time,
--     seat_numbers,
--     total_amount,
--     payment_method,
--     payment_status,
--     booking_time
-- FROM vw_booking_summary
-- WHERE booking_id = 123;

-- Query 3: All bookings for a show (admin use) (Expected: < 150ms for 200 bookings)
-- SELECT user_name, user_email, seat_numbers, total_amount, payment_status
-- FROM vw_booking_summary
-- WHERE show_id = 10 AND booking_status = 'CONFIRMED'
-- ORDER BY seat_numbers ASC;

-- Query 4: Recent bookings across all users (Expected: < 200ms)
-- SELECT booking_id, user_name, movie_title, theatre_name, show_time, total_amount
-- FROM vw_booking_summary
-- WHERE booking_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
-- ORDER BY booking_time DESC;

-- Query 5: Failed payment bookings (Expected: < 100ms)
-- SELECT booking_id, user_email, movie_title, total_amount, booking_time
-- FROM vw_booking_summary
-- WHERE payment_status = 'FAILED'
-- ORDER BY booking_time DESC;

-- Query 6: Revenue by movie (Expected: < 300ms for aggregation)
-- SELECT
--     movie_title,
--     COUNT(DISTINCT booking_id) as total_bookings,
--     SUM(total_amount) as total_revenue
-- FROM vw_booking_summary
-- WHERE booking_status = 'CONFIRMED' AND payment_status = 'SUCCESS'
-- GROUP BY movie_title
-- ORDER BY total_revenue DESC;

-- ============================================================================
-- Notes on GROUP_CONCAT:
-- ============================================================================
-- GROUP_CONCAT has a default limit of 1024 characters. For bookings with
-- many seats (e.g., bulk bookings), increase the limit:
--
-- SET SESSION group_concat_max_len = 10000;
--
-- Or set globally in my.cnf:
-- group_concat_max_len = 10000
--
-- This view assumes typical bookings have < 20 seats (reasonable limit)
-- ============================================================================

-- ============================================================================
-- End of vw_booking_summary
-- ============================================================================
