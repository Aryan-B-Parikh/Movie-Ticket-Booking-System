-- ============================================================================
-- Movie Ticket Booking System - Index Creation
-- File: 002_create_indexes.sql
-- Purpose: Create additional indexes for query optimization
-- Version: 2.0
-- Date: 2026-03-20
-- ============================================================================
-- NOTE: Primary indexes are already created in 001_create_tables.sql
-- This file contains additional composite indexes and performance optimizations
-- ============================================================================

-- ============================================================================
-- COMPOSITE INDEXES FOR QUERY OPTIMIZATION
-- ============================================================================

-- Composite index for booking queries filtering by show and status
-- Used in: Available seats query, show occupancy reports
CREATE INDEX idx_bookings_show_status
ON Bookings(show_id, status);

-- Composite index for booking queries filtering by user and status
-- Used in: User booking history with status filter
CREATE INDEX idx_bookings_user_status
ON Bookings(user_id, status);

-- Composite index for booking queries with soft delete filter
-- Used in: Most booking queries that exclude deleted records
CREATE INDEX idx_bookings_show_deleted
ON Bookings(show_id, is_deleted);

-- Composite index for movie queries with soft delete filter
-- Used in: Active movie listings
CREATE INDEX idx_movies_deleted_created
ON Movies(is_deleted, created_at);

-- Composite index for show queries with soft delete and time filter
-- Used in: Upcoming shows listing
CREATE INDEX idx_shows_deleted_time
ON Shows(is_deleted, show_time);

-- Composite index for screen lookup within theatre
-- Used in: Theatre screen management queries
CREATE INDEX idx_screens_theatre_number
ON Screens(theatre_id, screen_number);

-- ============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- ============================================================================

-- Index on screen_id for faster seat lookups
-- Used in: Seat availability queries
CREATE INDEX idx_seats_screen_type
ON Seats(screen_id, seat_type);

-- Index on show_id for faster screen lookup
-- Used in: Show details with screen information
CREATE INDEX idx_shows_screen
ON Shows(screen_id);

-- Index on booking_id for payment lookups
-- Used in: Payment history and verification
CREATE INDEX idx_payments_booking
ON Payments(booking_id);

-- Index on payment status for transaction monitoring
-- Used in: Failed payment reports
CREATE INDEX idx_payments_status
ON Payments(payment_status);

-- Composite index for audit queries by booking and time
-- Used in: Booking audit trail retrieval
CREATE INDEX idx_audit_booking_created
ON Audit_Bookings(booking_id, created_at);

-- ============================================================================
-- FULL-TEXT INDEXES (Optional - for advanced search)
-- ============================================================================
-- Uncomment if full-text search on movie titles is needed

-- CREATE FULLTEXT INDEX idx_movies_title
-- ON Movies(title);

-- CREATE FULLTEXT INDEX idx_theatres_name_location
-- ON Theatres(name, location);

-- ============================================================================
-- INDEX USAGE NOTES
-- ============================================================================
--
-- Primary Indexes (AUTO_INCREMENT PRIMARY KEY):
-- - Users(user_id)
-- - Movies(movie_id)
-- - Theatres(theatre_id)
-- - Screens(screen_id)
-- - Seats(seat_id)
-- - Shows(show_id)
-- - Bookings(booking_id)
-- - Payments(payment_id)
-- - Audit_Bookings(audit_id)
--
-- Unique Indexes:
-- - Users(email) - UNIQUE constraint
-- - Screens(theatre_id, screen_number) - Composite UNIQUE
-- - Seats(screen_id, seat_number) - Composite UNIQUE
-- - Booking_Seats(booking_id, seat_id) - Composite PRIMARY KEY
--
-- Foreign Key Indexes (automatically indexed):
-- - Screens(theatre_id)
-- - Seats(screen_id)
-- - Shows(movie_id, screen_id)
-- - Bookings(user_id, show_id)
-- - Booking_Seats(booking_id, seat_id)
-- - Payments(booking_id)
--
-- Inline Indexes from Table Creation:
-- - Movies(is_deleted)
-- - Shows(movie_id, show_time, is_deleted)
-- - Bookings(user_id, show_id, status, is_deleted)
-- - Booking_Seats(seat_id)
-- - Audit_Bookings(booking_id, user_id, created_at)
--
-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================
-- Use these queries to monitor index usage:
--
-- 1. Check index statistics:
-- SELECT * FROM INFORMATION_SCHEMA.STATISTICS
-- WHERE TABLE_SCHEMA = 'movie_booking_db'
-- ORDER BY TABLE_NAME, INDEX_NAME;
--
-- 2. Analyze query performance:
-- EXPLAIN SELECT ... FROM ... WHERE ...;
--
-- 3. Check index cardinality:
-- SHOW INDEX FROM table_name;
--
-- 4. Monitor slow queries:
-- SET GLOBAL slow_query_log = 'ON';
-- SET GLOBAL long_query_time = 2;
--
-- ============================================================================
-- End of index creation
-- ============================================================================
