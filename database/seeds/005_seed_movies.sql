-- ============================================================================
-- Seed Data: Movies
-- File: 005_seed_movies.sql
-- Purpose: Create 10 diverse movies with different genres and languages
-- Duration Range: 90-180 minutes
-- ============================================================================

-- Truncate table to allow re-seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Movies;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert 10 diverse movies with realistic data
INSERT INTO Movies (movie_id, title, genre, duration, language, release_date, is_deleted) VALUES
-- Action/Thriller
(1, 'The Last Guardian', 'Action', 142, 'English', '2026-03-01', FALSE),
(2, 'Shadow Protocol', 'Thriller', 128, 'English', '2026-02-20', FALSE),

-- Drama/Romance
(3, 'Echoes of Tomorrow', 'Drama', 135, 'English', '2026-03-10', FALSE),
(4, 'Love in Paris', 'Romance', 105, 'French', '2026-02-14', FALSE),

-- Comedy
(5, 'The Misadventure Club', 'Comedy', 98, 'English', '2026-03-05', FALSE),

-- Science Fiction
(6, 'Quantum Horizon', 'Sci-Fi', 156, 'English', '2026-03-15', FALSE),

-- Horror
(7, 'The Haunting Hour', 'Horror', 92, 'English', '2026-03-18', FALSE),

-- Animation/Family
(8, 'Journey to the Stars', 'Animation', 102, 'English', '2026-02-28', FALSE),

-- International
(9, 'Namaste Mumbai', 'Drama', 148, 'Hindi', '2026-03-08', FALSE),
(10, 'Dragon Legacy', 'Action', 138, 'Mandarin', '2026-03-12', FALSE);

-- Verify insertion
SELECT movie_id, title, genre, duration, language, release_date
FROM Movies
WHERE is_deleted = FALSE
ORDER BY release_date DESC, movie_id;

-- Genre distribution
SELECT genre, COUNT(*) AS movie_count
FROM Movies
WHERE is_deleted = FALSE
GROUP BY genre
ORDER BY movie_count DESC;
