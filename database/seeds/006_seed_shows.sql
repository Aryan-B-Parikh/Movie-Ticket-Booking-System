-- ============================================================================
-- Seed Data: Shows
-- File: 006_seed_shows.sql
-- Purpose: Create 30 shows across all screens for the next 7 days
-- Showtimes: 10:00, 13:00, 16:00, 19:00, 22:00
-- Base Price: $10.00 (REGULAR), $15.00 (premium shows)
-- No overlapping shows in the same screen (considers movie duration)
-- ============================================================================

-- Truncate table to allow re-seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Shows;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert 30 shows strategically distributed across screens and dates
-- Format: (show_id, movie_id, screen_id, show_time, price, is_deleted)
-- Date range: 2026-03-20 to 2026-03-26 (7 days from today)

INSERT INTO Shows (show_id, movie_id, screen_id, show_time, price, is_deleted) VALUES
-- ========== Day 1: 2026-03-20 (Today) ==========
-- Screen 1 (Grand Cinema Plaza - Screen 1)
(1, 1, 1, '2026-03-20 10:00:00', 10.00, FALSE),  -- The Last Guardian
(2, 3, 1, '2026-03-20 16:00:00', 10.00, FALSE),  -- Echoes of Tomorrow
(3, 6, 1, '2026-03-20 22:00:00', 12.00, FALSE),  -- Quantum Horizon (premium)

-- Screen 2 (Grand Cinema Plaza - Screen 2)
(4, 8, 2, '2026-03-20 10:00:00', 10.00, FALSE),  -- Journey to the Stars
(5, 5, 2, '2026-03-20 13:00:00', 10.00, FALSE),  -- The Misadventure Club
(6, 2, 2, '2026-03-20 19:00:00', 10.00, FALSE),  -- Shadow Protocol

-- Screen 3 (Grand Cinema Plaza - Screen 3)
(7, 9, 3, '2026-03-20 13:00:00', 10.00, FALSE),  -- Namaste Mumbai
(8, 7, 3, '2026-03-20 19:00:00', 10.00, FALSE),  -- The Haunting Hour

-- ========== Day 2: 2026-03-21 ==========
-- Screen 4 (Star Multiplex - Screen 1)
(9, 4, 4, '2026-03-21 13:00:00', 10.00, FALSE),  -- Love in Paris
(10, 10, 4, '2026-03-21 19:00:00', 10.00, FALSE), -- Dragon Legacy

-- Screen 5 (Star Multiplex - Screen 2)
(11, 1, 5, '2026-03-21 10:00:00', 10.00, FALSE), -- The Last Guardian
(12, 6, 5, '2026-03-21 16:00:00', 12.00, FALSE), -- Quantum Horizon

-- Screen 6 (Star Multiplex - Screen 3)
(13, 8, 6, '2026-03-21 10:00:00', 10.00, FALSE), -- Journey to the Stars
(14, 2, 6, '2026-03-21 16:00:00', 10.00, FALSE), -- Shadow Protocol

-- ========== Day 3: 2026-03-22 ==========
-- Screen 7 (Royal Cinema - Screen 1)
(15, 3, 7, '2026-03-22 13:00:00', 10.00, FALSE), -- Echoes of Tomorrow
(16, 7, 7, '2026-03-22 19:00:00', 10.00, FALSE), -- The Haunting Hour

-- Screen 8 (Royal Cinema - Screen 2)
(17, 9, 8, '2026-03-22 10:00:00', 10.00, FALSE), -- Namaste Mumbai
(18, 5, 8, '2026-03-22 16:00:00', 10.00, FALSE), -- The Misadventure Club
(19, 10, 8, '2026-03-22 22:00:00', 10.00, FALSE), -- Dragon Legacy

-- Screen 9 (Royal Cinema - Screen 3)
(20, 6, 9, '2026-03-22 13:00:00', 12.00, FALSE), -- Quantum Horizon
(21, 4, 9, '2026-03-22 19:00:00', 10.00, FALSE), -- Love in Paris

-- ========== Day 4: 2026-03-23 ==========
-- Screen 1
(22, 2, 1, '2026-03-23 13:00:00', 10.00, FALSE), -- Shadow Protocol
(23, 8, 1, '2026-03-23 19:00:00', 10.00, FALSE), -- Journey to the Stars

-- Screen 4
(24, 1, 4, '2026-03-23 10:00:00', 10.00, FALSE), -- The Last Guardian
(25, 7, 4, '2026-03-23 16:00:00', 10.00, FALSE), -- The Haunting Hour

-- ========== Day 5: 2026-03-24 ==========
-- Screen 2
(26, 3, 2, '2026-03-24 13:00:00', 10.00, FALSE), -- Echoes of Tomorrow

-- Screen 5
(27, 9, 5, '2026-03-24 10:00:00', 10.00, FALSE), -- Namaste Mumbai
(28, 5, 5, '2026-03-24 19:00:00', 10.00, FALSE), -- The Misadventure Club

-- ========== Day 6: 2026-03-25 ==========
-- Screen 6
(29, 10, 6, '2026-03-25 16:00:00', 10.00, FALSE), -- Dragon Legacy

-- ========== Day 7: 2026-03-26 ==========
-- Screen 7
(30, 6, 7, '2026-03-26 19:00:00', 15.00, FALSE); -- Quantum Horizon (weekend premium)

-- Verify insertion
SELECT
    s.show_id,
    m.title AS movie,
    t.name AS theatre,
    sc.screen_number,
    s.show_time,
    s.price,
    m.duration
FROM Shows s
JOIN Movies m ON s.movie_id = m.movie_id
JOIN Screens sc ON s.screen_id = sc.screen_id
JOIN Theatres t ON sc.theatre_id = t.theatre_id
WHERE s.is_deleted = FALSE
ORDER BY s.show_time, t.theatre_id, sc.screen_number;

-- Shows per screen
SELECT
    t.name AS theatre,
    sc.screen_number,
    COUNT(*) AS show_count
FROM Shows s
JOIN Screens sc ON s.screen_id = sc.screen_id
JOIN Theatres t ON sc.theatre_id = t.theatre_id
WHERE s.is_deleted = FALSE
GROUP BY t.theatre_id, sc.screen_number
ORDER BY t.theatre_id, sc.screen_number;

-- Shows per day
SELECT
    DATE(show_time) AS show_date,
    COUNT(*) AS shows_count
FROM Shows
WHERE is_deleted = FALSE
GROUP BY DATE(show_time)
ORDER BY show_date;
