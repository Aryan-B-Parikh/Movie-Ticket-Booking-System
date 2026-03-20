-- ============================================================================
-- Master Seed Script
-- File: run_all_seeds.sql
-- Purpose: Execute all seed data scripts in correct order
-- Usage: mysql -u [user] -p [database] < run_all_seeds.sql
-- ============================================================================

-- Display start message
SELECT '========================================' AS '';
SELECT 'Starting Database Seeding Process...' AS '';
SELECT '========================================' AS '';

-- 1. Seed Users
SELECT 'Step 1/6: Seeding Users...' AS '';
SOURCE 001_seed_users.sql;

-- 2. Seed Theatres
SELECT 'Step 2/6: Seeding Theatres...' AS '';
SOURCE 002_seed_theatres.sql;

-- 3. Seed Screens
SELECT 'Step 3/6: Seeding Screens...' AS '';
SOURCE 003_seed_screens.sql;

-- 4. Seed Seats (This may take a few seconds - 450 seats total)
SELECT 'Step 4/6: Seeding Seats (450 seats)...' AS '';
SOURCE 004_seed_seats.sql;

-- 5. Seed Movies
SELECT 'Step 5/6: Seeding Movies...' AS '';
SOURCE 005_seed_movies.sql;

-- 6. Seed Shows
SELECT 'Step 6/6: Seeding Shows...' AS '';
SOURCE 006_seed_shows.sql;

-- Display completion summary
SELECT '========================================' AS '';
SELECT 'Database Seeding Completed!' AS '';
SELECT '========================================' AS '';

-- Final summary query
SELECT 'Database Summary:' AS '';
SELECT
    (SELECT COUNT(*) FROM Users) AS total_users,
    (SELECT COUNT(*) FROM Users WHERE role = 'ADMIN') AS admin_users,
    (SELECT COUNT(*) FROM Theatres) AS theatres,
    (SELECT COUNT(*) FROM Screens) AS screens,
    (SELECT COUNT(*) FROM Seats) AS seats,
    (SELECT COUNT(*) FROM Movies WHERE is_deleted = FALSE) AS active_movies,
    (SELECT COUNT(*) FROM Shows WHERE is_deleted = FALSE) AS active_shows;
