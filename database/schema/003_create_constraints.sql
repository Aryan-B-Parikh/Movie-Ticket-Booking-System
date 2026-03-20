-- ============================================================================
-- Movie Ticket Booking System - Additional Constraints
-- File: 003_create_constraints.sql
-- Purpose: Create additional CHECK constraints and validation rules
-- Version: 2.0
-- Date: 2026-03-20
-- ============================================================================
-- NOTE: Foreign keys and unique constraints are in 001_create_tables.sql
-- This file contains CHECK constraints and advanced validation rules
-- ============================================================================

-- ============================================================================
-- CHECK CONSTRAINTS FOR DATA VALIDATION
-- ============================================================================

-- Movies table constraints
ALTER TABLE Movies
ADD CONSTRAINT chk_movie_duration
CHECK (duration > 0 AND duration <= 600);

ALTER TABLE Movies
ADD CONSTRAINT chk_movie_title
CHECK (LENGTH(TRIM(title)) > 0);

-- Shows table constraints
ALTER TABLE Shows
ADD CONSTRAINT chk_show_price
CHECK (price >= 0 AND price <= 10000);

ALTER TABLE Shows
ADD CONSTRAINT chk_show_time
CHECK (show_time > '2000-01-01');

-- Bookings table constraints
ALTER TABLE Bookings
ADD CONSTRAINT chk_booking_amount
CHECK (total_amount >= 0 AND total_amount <= 100000);

-- Payments table constraints
ALTER TABLE Payments
ADD CONSTRAINT chk_payment_amount
CHECK (amount >= 0 AND amount <= 100000);

-- Seats table constraints
ALTER TABLE Seats
ADD CONSTRAINT chk_seat_number
CHECK (LENGTH(TRIM(seat_number)) > 0);

-- Screens table constraints
ALTER TABLE Screens
ADD CONSTRAINT chk_screen_number
CHECK (screen_number > 0 AND screen_number <= 100);

-- Users table constraints
ALTER TABLE Users
ADD CONSTRAINT chk_user_name
CHECK (LENGTH(TRIM(name)) > 0);

ALTER TABLE Users
ADD CONSTRAINT chk_user_email
CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');

-- Theatres table constraints
ALTER TABLE Theatres
ADD CONSTRAINT chk_theatre_name
CHECK (LENGTH(TRIM(name)) > 0);

ALTER TABLE Theatres
ADD CONSTRAINT chk_theatre_location
CHECK (LENGTH(TRIM(location)) > 0);

-- ============================================================================
-- ADDITIONAL VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure payment amount matches booking total_amount
-- Note: This is a logical constraint, enforced at application level
-- or through triggers (see trigger examples below)

-- ============================================================================
-- BUSINESS RULE CONSTRAINTS (via CHECK or application logic)
-- ============================================================================

-- 1. Show times should not overlap in the same screen
--    Enforced at application level or via trigger

-- 2. Bookings must have at least one seat in Booking_Seats
--    Enforced at application level via transaction

-- 3. Cannot book seats that are already confirmed for the same show
--    Enforced at application level via transaction with SELECT FOR UPDATE

-- 4. Cancelled bookings cannot have their status changed back to CONFIRMED
--    Enforced at application level or via trigger

-- ============================================================================
-- EXAMPLE TRIGGERS FOR ADVANCED VALIDATION (Optional)
-- ============================================================================
-- These triggers enforce business rules at the database level
-- Uncomment and modify as needed
-- ============================================================================

-- Trigger: Prevent booking status change from CANCELLED to CONFIRMED
DELIMITER $$

CREATE TRIGGER trg_prevent_reconfirm_cancelled_booking
BEFORE UPDATE ON Bookings
FOR EACH ROW
BEGIN
    IF OLD.status = 'CANCELLED' AND NEW.status = 'CONFIRMED' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot reconfirm a cancelled booking';
    END IF;
END$$

DELIMITER ;

-- Trigger: Validate payment amount matches booking amount
DELIMITER $$

CREATE TRIGGER trg_validate_payment_amount
BEFORE INSERT ON Payments
FOR EACH ROW
BEGIN
    DECLARE booking_total DECIMAL(10,2);

    SELECT total_amount INTO booking_total
    FROM Bookings
    WHERE booking_id = NEW.booking_id;

    IF NEW.amount != booking_total THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Payment amount must match booking total amount';
    END IF;
END$$

DELIMITER ;

-- Trigger: Auto-create audit log entry on booking status change
DELIMITER $$

CREATE TRIGGER trg_audit_booking_update
AFTER UPDATE ON Bookings
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status OR OLD.is_deleted != NEW.is_deleted THEN
        INSERT INTO Audit_Bookings (
            booking_id,
            user_id,
            action,
            old_status,
            new_status,
            change_details,
            created_at
        ) VALUES (
            NEW.booking_id,
            NEW.user_id,
            'UPDATE',
            OLD.status,
            NEW.status,
            JSON_OBJECT(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'old_is_deleted', OLD.is_deleted,
                'new_is_deleted', NEW.is_deleted,
                'total_amount', NEW.total_amount
            ),
            CURRENT_TIMESTAMP
        );
    END IF;
END$$

DELIMITER ;

-- Trigger: Auto-create audit log entry on booking creation
DELIMITER $$

CREATE TRIGGER trg_audit_booking_insert
AFTER INSERT ON Bookings
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Bookings (
        booking_id,
        user_id,
        action,
        old_status,
        new_status,
        change_details,
        created_at
    ) VALUES (
        NEW.booking_id,
        NEW.user_id,
        'CREATE',
        NULL,
        NEW.status,
        JSON_OBJECT(
            'show_id', NEW.show_id,
            'total_amount', NEW.total_amount,
            'status', NEW.status
        ),
        CURRENT_TIMESTAMP
    );
END$$

DELIMITER ;

-- Trigger: Prevent soft-deleted bookings from being updated (except is_deleted flag)
DELIMITER $$

CREATE TRIGGER trg_prevent_deleted_booking_update
BEFORE UPDATE ON Bookings
FOR EACH ROW
BEGIN
    IF OLD.is_deleted = TRUE AND NEW.is_deleted = TRUE THEN
        IF OLD.status != NEW.status OR OLD.total_amount != NEW.total_amount THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot modify a soft-deleted booking';
        END IF;
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- CONSTRAINT VERIFICATION QUERIES
-- ============================================================================
-- Use these queries to verify constraints are working:
--
-- 1. Test invalid movie duration:
-- INSERT INTO Movies (title, duration, language) VALUES ('Test', -10, 'English');
-- Expected: Error due to chk_movie_duration
--
-- 2. Test invalid email:
-- INSERT INTO Users (name, email, password_hash) VALUES ('Test', 'invalid-email', 'hash');
-- Expected: Error due to chk_user_email
--
-- 3. Test booking reconfirmation:
-- UPDATE Bookings SET status = 'CONFIRMED' WHERE booking_id = X AND status = 'CANCELLED';
-- Expected: Error from trigger trg_prevent_reconfirm_cancelled_booking
--
-- 4. Check all constraints:
-- SELECT
--     TABLE_NAME,
--     CONSTRAINT_NAME,
--     CONSTRAINT_TYPE
-- FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
-- WHERE TABLE_SCHEMA = 'movie_booking_db'
-- ORDER BY TABLE_NAME, CONSTRAINT_TYPE;
--
-- ============================================================================
-- CONSTRAINT MAINTENANCE NOTES
-- ============================================================================
--
-- Adding new constraints to existing tables:
-- 1. Ensure existing data complies with the new constraint
-- 2. Clean up non-compliant data before adding constraint
-- 3. Test constraint in development environment first
-- 4. Use ALTER TABLE ... ADD CONSTRAINT syntax
--
-- Dropping constraints:
-- ALTER TABLE table_name DROP CONSTRAINT constraint_name;
--
-- Disabling constraints (MySQL doesn't support this directly):
-- - Must drop and recreate constraints
-- - Or use triggers to conditionally enforce rules
--
-- ============================================================================
-- REFERENTIAL INTEGRITY NOTES
-- ============================================================================
--
-- Cascade Rules:
-- - Screens ON DELETE CASCADE from Theatres
-- - Seats ON DELETE CASCADE from Screens
-- - Shows ON DELETE CASCADE from Movies and Screens
-- - Booking_Seats ON DELETE CASCADE from Bookings
--
-- No Cascade (Prevent deletion):
-- - Bookings references Users (prevent user deletion with active bookings)
-- - Bookings references Shows (prevent show deletion with bookings)
-- - Payments references Bookings (prevent booking deletion with payments)
--
-- Application-level enforcement needed for:
-- - Preventing overlapping shows in same screen
-- - Ensuring at least one seat per booking
-- - Validating show_time is in the future when creating shows
-- - Preventing bookings for past shows
--
-- ============================================================================
-- End of constraints creation
-- ============================================================================
