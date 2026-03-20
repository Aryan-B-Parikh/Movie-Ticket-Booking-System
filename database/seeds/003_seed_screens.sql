-- ============================================================================
-- Seed Data: Screens
-- File: 003_seed_screens.sql
-- Purpose: Create 3 screens per theatre (9 total screens)
-- ============================================================================

-- Truncate table to allow re-seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Screens;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert screens: 3 screens per theatre
-- Theatre 1: Grand Cinema Plaza (screens 1-3)
-- Theatre 2: Star Multiplex Theatre (screens 1-3)
-- Theatre 3: Royal Cinema Complex (screens 1-3)
INSERT INTO Screens (screen_id, theatre_id, screen_number) VALUES
-- Grand Cinema Plaza (theatre_id = 1)
(1, 1, 1),
(2, 1, 2),
(3, 1, 3),

-- Star Multiplex Theatre (theatre_id = 2)
(4, 2, 1),
(5, 2, 2),
(6, 2, 3),

-- Royal Cinema Complex (theatre_id = 3)
(7, 3, 1),
(8, 3, 2),
(9, 3, 3);

-- Verify insertion
SELECT s.screen_id, t.name AS theatre_name, s.screen_number
FROM Screens s
JOIN Theatres t ON s.theatre_id = t.theatre_id
ORDER BY t.theatre_id, s.screen_number;
