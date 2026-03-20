-- ============================================================================
-- View: vw_show_occupancy
-- Purpose: Theatre performance analytics with occupancy and revenue metrics
-- ============================================================================
-- Description:
--   Administrative view providing comprehensive show performance metrics
--   including seat occupancy rates, booking statistics, and revenue tracking.
--   Essential for theatre management and business intelligence.
--
-- Usage:
--   1. Get occupancy report for all shows:
--      SELECT * FROM vw_show_occupancy
--      ORDER BY show_time DESC;
--
--   2. Find low-occupancy shows (< 30%):
--      SELECT show_id, movie_title, show_time, occupancy_percentage
--      FROM vw_show_occupancy
--      WHERE occupancy_percentage < 30
--      ORDER BY show_time ASC;
--
--   3. Revenue report by theatre:
--      SELECT theatre_name, SUM(revenue) as total_revenue,
--             AVG(occupancy_percentage) as avg_occupancy
--      FROM vw_show_occupancy
--      GROUP BY theatre_name
--      ORDER BY total_revenue DESC;
--
--   4. High-performing shows (> 80% occupancy):
--      SELECT movie_title, theatre_name, show_time,
--             occupancy_percentage, revenue
--      FROM vw_show_occupancy
--      WHERE occupancy_percentage >= 80
--      ORDER BY revenue DESC;
--
-- Performance Notes:
--   - Uses subqueries for aggregation
--   - Calculates metrics at query time (not pre-computed)
--   - Consider materialized view for large datasets
--   - Indexed on show_id, screen_id, movie_id
--
-- Dependencies:
--   - Shows, Movies, Theatres, Screens, Seats
--   - Bookings, Booking_Seats
--   - Requires aggregation capabilities
-- ============================================================================

DROP VIEW IF EXISTS vw_show_occupancy;

CREATE VIEW vw_show_occupancy AS
SELECT
    sh.show_id,
    m.title AS movie_title,
    t.name AS theatre_name,
    sc.screen_number,
    sh.show_time,
    -- Total seats in the screen
    total_seats.seat_count AS total_seats,
    -- Booked seats count (only CONFIRMED bookings)
    COALESCE(booked_seats.booked_count, 0) AS booked_seats,
    -- Available seats (calculated)
    (total_seats.seat_count - COALESCE(booked_seats.booked_count, 0)) AS available_seats,
    -- Occupancy percentage (rounded to 2 decimals)
    ROUND(
        (COALESCE(booked_seats.booked_count, 0) * 100.0) / total_seats.seat_count,
        2
    ) AS occupancy_percentage,
    -- Revenue calculation (sum of seat prices based on seat type)
    COALESCE(
        booked_seats.regular_count * sh.price +
        booked_seats.vip_count * (sh.price * 1.5),
        0
    ) AS revenue
FROM
    Shows sh
    INNER JOIN Movies m ON sh.movie_id = m.movie_id
    INNER JOIN Screens sc ON sh.screen_id = sc.screen_id
    INNER JOIN Theatres t ON sc.theatre_id = t.theatre_id
    -- Subquery: Count total seats per screen
    INNER JOIN (
        SELECT screen_id, COUNT(*) AS seat_count
        FROM Seats
        GROUP BY screen_id
    ) total_seats ON sc.screen_id = total_seats.screen_id
    -- Subquery: Count booked seats per show with seat type breakdown
    LEFT JOIN (
        SELECT
            b.show_id,
            COUNT(*) AS booked_count,
            SUM(CASE WHEN se.seat_type = 'REGULAR' THEN 1 ELSE 0 END) AS regular_count,
            SUM(CASE WHEN se.seat_type = 'VIP' THEN 1 ELSE 0 END) AS vip_count
        FROM Bookings b
        INNER JOIN Booking_Seats bs ON b.booking_id = bs.booking_id
        INNER JOIN Seats se ON bs.seat_id = se.seat_id
        WHERE b.status = 'CONFIRMED'
          AND b.is_deleted = FALSE
        GROUP BY b.show_id
    ) booked_seats ON sh.show_id = booked_seats.show_id
WHERE
    -- Respect soft deletes
    sh.is_deleted = FALSE
    AND m.is_deleted = FALSE;

-- ============================================================================
-- Index Recommendations for Optimal Performance:
-- ============================================================================
-- Required indexes (from 002_create_indexes.sql):
--
-- 1. INDEX idx_show_screen ON Shows(screen_id, is_deleted)
-- 2. INDEX idx_booking_show_status ON Bookings(show_id, status, is_deleted)
-- 3. INDEX idx_booking_seats_composite ON Booking_Seats(booking_id, seat_id)
-- 4. INDEX idx_seats_screen_type ON Seats(screen_id, seat_type)
-- 5. INDEX idx_show_time ON Shows(show_time)
--
-- These optimize:
-- - Screen-to-show mapping
-- - Booking status filtering
-- - Seat count aggregations
-- - Time-based reporting
-- ============================================================================

-- ============================================================================
-- Sample Queries and Expected Performance:
-- ============================================================================

-- Query 1: Today's show occupancy (Expected: < 150ms for 50 shows)
-- SELECT show_id, movie_title, theatre_name, show_time,
--        total_seats, booked_seats, occupancy_percentage, revenue
-- FROM vw_show_occupancy
-- WHERE DATE(show_time) = CURDATE()
-- ORDER BY show_time ASC;

-- Query 2: Weekly revenue by theatre (Expected: < 300ms)
-- SELECT
--     theatre_name,
--     COUNT(*) as total_shows,
--     SUM(booked_seats) as total_tickets_sold,
--     SUM(revenue) as total_revenue,
--     AVG(occupancy_percentage) as avg_occupancy
-- FROM vw_show_occupancy
-- WHERE show_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
-- GROUP BY theatre_name
-- ORDER BY total_revenue DESC;

-- Query 3: Low-performing shows requiring attention (Expected: < 200ms)
-- SELECT show_id, movie_title, theatre_name, show_time,
--        occupancy_percentage, available_seats
-- FROM vw_show_occupancy
-- WHERE occupancy_percentage < 25
--   AND show_time > NOW()
-- ORDER BY show_time ASC;

-- Query 4: Movie performance comparison (Expected: < 250ms)
-- SELECT
--     movie_title,
--     COUNT(*) as num_shows,
--     SUM(booked_seats) as total_seats_sold,
--     AVG(occupancy_percentage) as avg_occupancy,
--     SUM(revenue) as total_revenue
-- FROM vw_show_occupancy
-- GROUP BY movie_title
-- ORDER BY total_revenue DESC;

-- Query 5: Sold-out shows (100% occupancy) (Expected: < 100ms)
-- SELECT show_id, movie_title, theatre_name, show_time, revenue
-- FROM vw_show_occupancy
-- WHERE occupancy_percentage = 100
-- ORDER BY show_time DESC;

-- Query 6: Screen utilization report (Expected: < 200ms)
-- SELECT
--     theatre_name,
--     screen_number,
--     COUNT(*) as shows_scheduled,
--     AVG(occupancy_percentage) as avg_occupancy,
--     SUM(revenue) as total_revenue
-- FROM vw_show_occupancy
-- WHERE show_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
-- GROUP BY theatre_name, screen_number
-- ORDER BY theatre_name, screen_number;

-- Query 7: Peak hours analysis (Expected: < 300ms)
-- SELECT
--     HOUR(show_time) as show_hour,
--     COUNT(*) as num_shows,
--     AVG(occupancy_percentage) as avg_occupancy,
--     SUM(revenue) as total_revenue
-- FROM vw_show_occupancy
-- WHERE show_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
-- GROUP BY HOUR(show_time)
-- ORDER BY show_hour;

-- ============================================================================
-- Business Intelligence Use Cases:
-- ============================================================================
--
-- 1. Dynamic Pricing: Use occupancy_percentage to adjust future show prices
--    - Low occupancy (< 50%): Consider discounts or promotions
--    - High occupancy (> 80%): Consider premium pricing
--
-- 2. Show Scheduling: Analyze peak hours and occupancy patterns
--    - Schedule popular movies during high-occupancy time slots
--    - Optimize screen allocation based on historical performance
--
-- 3. Revenue Forecasting: Use historical revenue data
--    - Project future earnings based on booking trends
--    - Identify underperforming shows early
--
-- 4. Capacity Planning: Track screen utilization
--    - Identify screens with consistently low occupancy
--    - Optimize theatre layout and screen count
--
-- 5. Marketing Decisions: Target low-occupancy shows
--    - Create targeted campaigns for specific shows/times
--    - Measure marketing campaign effectiveness
--
-- ============================================================================

-- ============================================================================
-- Performance Optimization Tips:
-- ============================================================================
--
-- For high-traffic scenarios, consider:
--
-- 1. Materialized View (MySQL 8.0+):
--    - Create a table that mirrors this view
--    - Refresh periodically (e.g., every 5 minutes)
--    - Significantly faster queries at cost of slight staleness
--
-- 2. Cached Results:
--    - Cache view results in application layer (Redis, Memcached)
--    - Invalidate cache on new bookings
--    - TTL: 1-5 minutes depending on requirements
--
-- 3. Partitioning:
--    - Partition Shows table by show_time (monthly)
--    - Improves query performance for recent shows
--    - Historical data queries remain isolated
--
-- 4. Summary Tables:
--    - Pre-compute daily/weekly occupancy summaries
--    - Use triggers to update on booking changes
--    - Trade storage for query speed
--
-- ============================================================================

-- ============================================================================
-- End of vw_show_occupancy
-- ============================================================================
