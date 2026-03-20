-- ============================================================================
-- Seed Data Verification Script
-- File: verify_seeds.sql
-- Purpose: Verify all seed data has been loaded correctly
-- Usage: mysql -u [user] -p [database] < verify_seeds.sql
-- ============================================================================

SELECT '========================================' AS '';
SELECT 'Seed Data Verification Report' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';

-- 1. Users Verification
SELECT '1. USERS' AS '';
SELECT '----------------------------------------' AS '';
SELECT
    COUNT(*) AS total_users,
    SUM(CASE WHEN role = 'USER' THEN 1 ELSE 0 END) AS regular_users,
    SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) AS admin_users
FROM Users;
SELECT '' AS '';

-- 2. Theatres Verification
SELECT '2. THEATRES' AS '';
SELECT '----------------------------------------' AS '';
SELECT COUNT(*) AS total_theatres FROM Theatres;
SELECT theatre_id, name, location FROM Theatres;
SELECT '' AS '';

-- 3. Screens Verification
SELECT '3. SCREENS' AS '';
SELECT '----------------------------------------' AS '';
SELECT
    COUNT(*) AS total_screens,
    COUNT(DISTINCT theatre_id) AS theatres_with_screens
FROM Screens;
SELECT '' AS '';

-- 4. Seats Verification
SELECT '4. SEATS' AS '';
SELECT '----------------------------------------' AS '';
SELECT
    COUNT(*) AS total_seats,
    SUM(CASE WHEN seat_type = 'REGULAR' THEN 1 ELSE 0 END) AS regular_seats,
    SUM(CASE WHEN seat_type = 'VIP' THEN 1 ELSE 0 END) AS vip_seats,
    ROUND(SUM(CASE WHEN seat_type = 'REGULAR' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS regular_percent,
    ROUND(SUM(CASE WHEN seat_type = 'VIP' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS vip_percent
FROM Seats;

-- Seats per screen
SELECT
    screen_id,
    COUNT(*) AS seats_per_screen,
    SUM(CASE WHEN seat_type = 'REGULAR' THEN 1 ELSE 0 END) AS regular,
    SUM(CASE WHEN seat_type = 'VIP' THEN 1 ELSE 0 END) AS vip
FROM Seats
GROUP BY screen_id
ORDER BY screen_id;
SELECT '' AS '';

-- 5. Movies Verification
SELECT '5. MOVIES' AS '';
SELECT '----------------------------------------' AS '';
SELECT COUNT(*) AS total_movies FROM Movies WHERE is_deleted = FALSE;
SELECT
    genre,
    COUNT(*) AS count,
    GROUP_CONCAT(title SEPARATOR ', ') AS titles
FROM Movies
WHERE is_deleted = FALSE
GROUP BY genre
ORDER BY count DESC;
SELECT '' AS '';

-- 6. Shows Verification
SELECT '6. SHOWS' AS '';
SELECT '----------------------------------------' AS '';
SELECT
    COUNT(*) AS total_shows,
    COUNT(DISTINCT movie_id) AS unique_movies,
    COUNT(DISTINCT screen_id) AS screens_used,
    MIN(show_time) AS earliest_show,
    MAX(show_time) AS latest_show
FROM Shows
WHERE is_deleted = FALSE;

-- Shows per day
SELECT
    DATE(show_time) AS show_date,
    COUNT(*) AS shows_count
FROM Shows
WHERE is_deleted = FALSE
GROUP BY DATE(show_time)
ORDER BY show_date;
SELECT '' AS '';

-- 7. Referential Integrity Check
SELECT '7. REFERENTIAL INTEGRITY' AS '';
SELECT '----------------------------------------' AS '';

-- Check orphaned records (should all return 0)
SELECT
    (SELECT COUNT(*) FROM Screens WHERE theatre_id NOT IN (SELECT theatre_id FROM Theatres)) AS orphaned_screens,
    (SELECT COUNT(*) FROM Seats WHERE screen_id NOT IN (SELECT screen_id FROM Screens)) AS orphaned_seats,
    (SELECT COUNT(*) FROM Shows WHERE movie_id NOT IN (SELECT movie_id FROM Movies)) AS orphaned_shows_by_movie,
    (SELECT COUNT(*) FROM Shows WHERE screen_id NOT IN (SELECT screen_id FROM Screens)) AS orphaned_shows_by_screen;
SELECT '' AS '';

-- 8. Unique Constraints Check
SELECT '8. UNIQUE CONSTRAINTS' AS '';
SELECT '----------------------------------------' AS '';

-- Check for duplicate emails (should return 0)
SELECT 'Duplicate Emails' AS check_name, COUNT(*) - COUNT(DISTINCT email) AS violations
FROM Users
UNION ALL
-- Check for duplicate seat numbers per screen (should return 0)
SELECT 'Duplicate Seat Numbers' AS check_name, COUNT(*) - COUNT(DISTINCT CONCAT(screen_id, '-', seat_number)) AS violations
FROM Seats
UNION ALL
-- Check for duplicate screen numbers per theatre (should return 0)
SELECT 'Duplicate Screen Numbers' AS check_name, COUNT(*) - COUNT(DISTINCT CONCAT(theatre_id, '-', screen_number)) AS violations
FROM Screens;
SELECT '' AS '';

-- 9. Data Quality Checks
SELECT '9. DATA QUALITY' AS '';
SELECT '----------------------------------------' AS '';

-- Check for NULL values in critical fields
SELECT
    'Users with NULL name' AS check_name,
    COUNT(*) AS issues
FROM Users
WHERE name IS NULL OR name = ''
UNION ALL
SELECT
    'Movies with invalid duration' AS check_name,
    COUNT(*) AS issues
FROM Movies
WHERE duration <= 0 OR duration > 300
UNION ALL
SELECT
    'Shows with negative price' AS check_name,
    COUNT(*) AS issues
FROM Shows
WHERE price < 0
UNION ALL
SELECT
    'Shows in the past' AS check_name,
    COUNT(*) AS issues
FROM Shows
WHERE show_time < NOW() AND is_deleted = FALSE;
SELECT '' AS '';

-- 10. Sample Data Preview
SELECT '10. SAMPLE DATA PREVIEW' AS '';
SELECT '----------------------------------------' AS '';
SELECT 'Upcoming Shows (First 5):' AS '';
SELECT
    s.show_id,
    m.title AS movie,
    t.name AS theatre,
    sc.screen_number AS screen,
    s.show_time,
    CONCAT('$', s.price) AS price
FROM Shows s
JOIN Movies m ON s.movie_id = m.movie_id
JOIN Screens sc ON s.screen_id = sc.screen_id
JOIN Theatres t ON sc.theatre_id = t.theatre_id
WHERE s.is_deleted = FALSE
AND s.show_time >= NOW()
ORDER BY s.show_time
LIMIT 5;
SELECT '' AS '';

-- Summary
SELECT '========================================' AS '';
SELECT 'Verification Complete!' AS '';
SELECT '========================================' AS '';
SELECT 'Expected vs Actual:' AS '';
SELECT
    'Users: 7' AS expected,
    CONCAT('Actual: ', (SELECT COUNT(*) FROM Users)) AS actual
UNION ALL
SELECT 'Theatres: 3', CONCAT('Actual: ', (SELECT COUNT(*) FROM Theatres))
UNION ALL
SELECT 'Screens: 9', CONCAT('Actual: ', (SELECT COUNT(*) FROM Screens))
UNION ALL
SELECT 'Seats: 450', CONCAT('Actual: ', (SELECT COUNT(*) FROM Seats))
UNION ALL
SELECT 'Movies: 10', CONCAT('Actual: ', (SELECT COUNT(*) FROM Movies WHERE is_deleted = FALSE))
UNION ALL
SELECT 'Shows: 30', CONCAT('Actual: ', (SELECT COUNT(*) FROM Shows WHERE is_deleted = FALSE));
