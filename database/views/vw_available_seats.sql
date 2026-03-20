-- ============================================================================
-- View: vw_available_seats
-- Purpose: Real-time seat availability for each show with pricing
-- ============================================================================
-- Description:
--   Provides a complete view of seat availability per show, combining
--   show details with seat information and pricing calculations.
--
-- Usage:
--   1. Get all available seats for a specific show:
--      SELECT * FROM vw_available_seats WHERE show_id = 1 AND is_available = TRUE;
--
--   2. Count available seats by type:
--      SELECT show_id, seat_type, COUNT(*) as available_count
--      FROM vw_available_seats
--      WHERE is_available = TRUE
--      GROUP BY show_id, seat_type;
--
--   3. Get cheapest available seats:
--      SELECT * FROM vw_available_seats
--      WHERE show_id = 1 AND is_available = TRUE
--      ORDER BY price ASC
--      LIMIT 5;
--
-- Performance Notes:
--   - Uses indexed columns (show_id, seat_id, screen_id)
--   - Efficient LEFT JOIN to check booking status
--   - Filters out soft-deleted records at database level
--   - Consider materializing for high-traffic shows
--
-- Dependencies:
--   - Shows, Movies, Theatres, Screens, Seats tables
--   - Bookings, Booking_Seats junction table
--   - Requires indexes on: show_id, seat_id, screen_id, is_deleted
-- ============================================================================

DROP VIEW IF EXISTS vw_available_seats;

CREATE VIEW vw_available_seats AS
SELECT
    sh.show_id,
    m.title AS movie_title,
    t.name AS theatre_name,
    sc.screen_number,
    sh.show_time,
    se.seat_id,
    se.seat_number,
    se.seat_type,
    -- Calculate availability: TRUE if seat NOT in any CONFIRMED booking for this show
    CASE
        WHEN bs.seat_id IS NULL THEN TRUE
        ELSE FALSE
    END AS is_available,
    -- Calculate price: base price + VIP premium (50% extra for VIP seats)
    CASE
        WHEN se.seat_type = 'VIP' THEN sh.price * 1.5
        ELSE sh.price
    END AS price
FROM
    Shows sh
    INNER JOIN Movies m ON sh.movie_id = m.movie_id
    INNER JOIN Screens sc ON sh.screen_id = sc.screen_id
    INNER JOIN Theatres t ON sc.theatre_id = t.theatre_id
    INNER JOIN Seats se ON sc.screen_id = se.screen_id
    -- LEFT JOIN to identify booked seats
    LEFT JOIN (
        SELECT DISTINCT bs.seat_id, b.show_id
        FROM Booking_Seats bs
        INNER JOIN Bookings b ON bs.booking_id = b.booking_id
        WHERE b.status = 'CONFIRMED'
          AND b.is_deleted = FALSE
    ) bs ON se.seat_id = bs.seat_id AND sh.show_id = bs.show_id
WHERE
    -- Respect soft deletes
    sh.is_deleted = FALSE
    AND m.is_deleted = FALSE;

-- ============================================================================
-- Index Recommendations for Optimal Performance:
-- ============================================================================
-- The following indexes should exist (already created in 002_create_indexes.sql):
--
-- 1. INDEX idx_show_deleted ON Shows(is_deleted, show_id)
-- 2. INDEX idx_movie_deleted ON Movies(is_deleted, movie_id)
-- 3. INDEX idx_booking_status_deleted ON Bookings(status, is_deleted, show_id)
-- 4. INDEX idx_booking_seats_composite ON Booking_Seats(seat_id, booking_id)
--
-- These indexes ensure:
-- - Fast filtering of active (non-deleted) shows and movies
-- - Efficient booking status lookups
-- - Quick seat availability checks via junction table
-- ============================================================================

-- ============================================================================
-- Sample Queries and Expected Performance:
-- ============================================================================

-- Query 1: Get all available seats for a show (Expected: < 50ms for 100 seats)
-- SELECT * FROM vw_available_seats
-- WHERE show_id = 1 AND is_available = TRUE;

-- Query 2: Get available VIP seats only (Expected: < 30ms)
-- SELECT * FROM vw_available_seats
-- WHERE show_id = 1 AND is_available = TRUE AND seat_type = 'VIP';

-- Query 3: Get available seats sorted by price (Expected: < 60ms)
-- SELECT seat_number, seat_type, price
-- FROM vw_available_seats
-- WHERE show_id = 1 AND is_available = TRUE
-- ORDER BY price ASC;

-- Query 4: Count available vs booked seats (Expected: < 40ms)
-- SELECT
--     show_id,
--     movie_title,
--     COUNT(*) as total_seats,
--     SUM(CASE WHEN is_available = TRUE THEN 1 ELSE 0 END) as available_seats,
--     SUM(CASE WHEN is_available = FALSE THEN 1 ELSE 0 END) as booked_seats
-- FROM vw_available_seats
-- WHERE show_id = 1
-- GROUP BY show_id, movie_title;

-- ============================================================================
-- End of vw_available_seats
-- ============================================================================
