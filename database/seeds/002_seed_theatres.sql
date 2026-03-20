-- ============================================================================
-- Seed Data: Theatres
-- File: 002_seed_theatres.sql
-- Purpose: Create 3 theatres in different locations
-- ============================================================================

-- Truncate table to allow re-seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Theatres;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert theatres with realistic names and locations
INSERT INTO Theatres (theatre_id, name, location) VALUES
(1, 'Grand Cinema Plaza', '123 Main Street, Downtown, New York, NY 10001'),
(2, 'Star Multiplex Theatre', '456 Oak Avenue, Westside, Los Angeles, CA 90028'),
(3, 'Royal Cinema Complex', '789 Park Boulevard, Midtown, Chicago, IL 60611');

-- Verify insertion
SELECT theatre_id, name, location FROM Theatres ORDER BY theatre_id;
