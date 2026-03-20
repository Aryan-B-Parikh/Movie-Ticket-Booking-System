-- ============================================================================
-- Movie Ticket Booking System - Stored Procedure: Cancel Booking
-- File: sp_cancel_booking.sql
-- Purpose: Cancel booking with user authorization and audit trail
-- Version: 1.0
-- Date: 2026-03-20
-- ============================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_cancel_booking$$

CREATE PROCEDURE sp_cancel_booking(
    IN p_booking_id INT,
    IN p_user_id INT,
    OUT p_result VARCHAR(50),
    OUT p_message VARCHAR(255)
)
cancel_proc: BEGIN
    -- ========================================================================
    -- Variable Declarations
    -- ========================================================================
    DECLARE v_booking_exists INT DEFAULT 0;
    DECLARE v_booking_user_id INT;
    DECLARE v_booking_status VARCHAR(20);
    DECLARE v_is_deleted BOOLEAN;
    DECLARE v_show_id INT;
    DECLARE v_total_amount DECIMAL(10,2);
    DECLARE v_seat_count INT;

    -- ========================================================================
    -- Error Handler Declaration
    -- ========================================================================
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = 'ERROR';
        SET p_message = 'Database error occurred during cancellation';
    END;

    -- ========================================================================
    -- Initialize Output Variables
    -- ========================================================================
    SET p_result = NULL;
    SET p_message = NULL;

    -- ========================================================================
    -- Input Validation
    -- ========================================================================

    -- Validate booking_id
    IF p_booking_id IS NULL OR p_booking_id <= 0 THEN
        SET p_result = 'INVALID_INPUT';
        SET p_message = 'Invalid booking ID provided';
        LEAVE cancel_proc;
    END IF;

    -- Validate user_id
    IF p_user_id IS NULL OR p_user_id <= 0 THEN
        SET p_result = 'INVALID_INPUT';
        SET p_message = 'Invalid user ID provided';
        LEAVE cancel_proc;
    END IF;

    -- ========================================================================
    -- Start Transaction
    -- ========================================================================
    START TRANSACTION;

    -- ========================================================================
    -- Validate Booking Exists and Retrieve Details
    -- Lock the booking row to prevent concurrent modifications
    -- ========================================================================
    SELECT
        COUNT(*),
        user_id,
        status,
        is_deleted,
        show_id,
        total_amount
    INTO
        v_booking_exists,
        v_booking_user_id,
        v_booking_status,
        v_is_deleted,
        v_show_id,
        v_total_amount
    FROM Bookings
    WHERE booking_id = p_booking_id
    FOR UPDATE
    GROUP BY user_id, status, is_deleted, show_id, total_amount;

    -- Check if booking exists
    IF v_booking_exists = 0 THEN
        ROLLBACK;
        SET p_result = 'NOT_FOUND';
        SET p_message = 'Booking not found';
        LEAVE cancel_proc;
    END IF;

    -- ========================================================================
    -- Authorization Check
    -- Verify that the user requesting cancellation owns this booking
    -- ========================================================================
    IF v_booking_user_id != p_user_id THEN
        ROLLBACK;
        SET p_result = 'UNAUTHORIZED';
        SET p_message = 'You are not authorized to cancel this booking';
        LEAVE cancel_proc;
    END IF;

    -- ========================================================================
    -- Validate Booking Status
    -- Can only cancel CONFIRMED bookings
    -- ========================================================================
    IF v_booking_status = 'CANCELLED' THEN
        ROLLBACK;
        SET p_result = 'ALREADY_CANCELLED';
        SET p_message = 'This booking has already been cancelled';
        LEAVE cancel_proc;
    END IF;

    IF v_booking_status != 'CONFIRMED' THEN
        ROLLBACK;
        SET p_result = 'INVALID_STATUS';
        SET p_message = CONCAT('Cannot cancel booking with status: ', v_booking_status);
        LEAVE cancel_proc;
    END IF;

    -- ========================================================================
    -- Check if Booking is Deleted
    -- ========================================================================
    IF v_is_deleted = TRUE THEN
        ROLLBACK;
        SET p_result = 'BOOKING_DELETED';
        SET p_message = 'This booking has been deleted';
        LEAVE cancel_proc;
    END IF;

    -- ========================================================================
    -- Get Seat Count for Audit Details
    -- ========================================================================
    SELECT COUNT(*)
    INTO v_seat_count
    FROM Booking_Seats
    WHERE booking_id = p_booking_id;

    -- ========================================================================
    -- Update Booking Status to CANCELLED
    -- Note: Seats automatically become available for other bookings
    -- because sp_get_available_seats and sp_book_tickets only check
    -- for CONFIRMED status bookings
    -- ========================================================================
    UPDATE Bookings
    SET status = 'CANCELLED',
        updated_at = CURRENT_TIMESTAMP
    WHERE booking_id = p_booking_id;

    -- ========================================================================
    -- Create Audit Trail
    -- Log the cancellation with detailed information
    -- ========================================================================
    INSERT INTO Audit_Bookings (
        booking_id,
        user_id,
        action,
        old_status,
        new_status,
        change_details
    )
    VALUES (
        p_booking_id,
        p_user_id,
        'CANCEL',
        'CONFIRMED',
        'CANCELLED',
        JSON_OBJECT(
            'show_id', v_show_id,
            'seat_count', v_seat_count,
            'total_amount', v_total_amount,
            'cancelled_at', NOW()
        )
    );

    -- ========================================================================
    -- Commit Transaction
    -- ========================================================================
    COMMIT;

    -- Set success result
    SET p_result = 'SUCCESS';
    SET p_message = CONCAT('Booking ', p_booking_id, ' cancelled successfully. ', v_seat_count, ' seats released.');

END$$

DELIMITER ;

-- ============================================================================
-- Usage Examples and Test Cases
-- ============================================================================

-- Test Case 1: Successful cancellation
-- First, create a booking:
-- CALL sp_book_tickets(1, 1, '15,16', 'CREDIT_CARD', 200.00, @booking_id, @error_code, @error_msg);
-- Then cancel it:
-- CALL sp_cancel_booking(@booking_id, 1, @result, @message);
-- SELECT @result AS result, @message AS message;

-- Test Case 2: Invalid booking ID
-- CALL sp_cancel_booking(NULL, 1, @result, @message);
-- SELECT @result AS result, @message AS message;

-- Test Case 3: Booking not found
-- CALL sp_cancel_booking(99999, 1, @result, @message);
-- SELECT @result AS result, @message AS message;

-- Test Case 4: Unauthorized cancellation (different user)
-- CALL sp_book_tickets(1, 1, '17,18', 'CREDIT_CARD', 200.00, @booking_id, @error_code, @error_msg);
-- CALL sp_cancel_booking(@booking_id, 2, @result, @message);
-- SELECT @result AS result, @message AS message;

-- Test Case 5: Already cancelled booking
-- CALL sp_book_tickets(1, 1, '19,20', 'UPI', 200.00, @booking_id, @error_code, @error_msg);
-- CALL sp_cancel_booking(@booking_id, 1, @result1, @message1);
-- Attempt second cancellation:
-- CALL sp_cancel_booking(@booking_id, 1, @result2, @message2);
-- SELECT @result2 AS result, @message2 AS message;

-- Test Case 6: Invalid user ID
-- CALL sp_cancel_booking(1, -1, @result, @message);
-- SELECT @result AS result, @message AS message;

-- ============================================================================
-- Verify Cancellation Results
-- ============================================================================
-- Check booking status after cancellation:
-- SELECT booking_id, user_id, show_id, status, total_amount, updated_at
-- FROM Bookings
-- WHERE booking_id = @booking_id;

-- Check seats are released (should appear in available seats):
-- CALL sp_get_available_seats(1, @seat_list);
-- SELECT @seat_list;

-- ============================================================================
-- Check Audit Trail
-- ============================================================================
-- SELECT audit_id, booking_id, user_id, action, old_status, new_status,
--        change_details, created_at
-- FROM Audit_Bookings
-- WHERE booking_id = @booking_id
-- ORDER BY created_at DESC;

-- ============================================================================
-- Verify Seat Availability After Cancellation
-- ============================================================================
-- After cancelling booking for show_id = 1, seats should be available again:
-- SELECT s.seat_id, s.seat_number, s.seat_type
-- FROM Seats s
-- WHERE s.screen_id = (SELECT screen_id FROM Shows WHERE show_id = 1)
-- AND s.seat_id NOT IN (
--     SELECT bs.seat_id
--     FROM Booking_Seats bs
--     JOIN Bookings b ON bs.booking_id = b.booking_id
--     WHERE b.show_id = 1
--     AND b.status = 'CONFIRMED'
--     AND b.is_deleted = FALSE
-- );

-- ============================================================================
-- Performance Notes
-- ============================================================================
-- 1. Uses SELECT ... FOR UPDATE to lock booking row during cancellation
-- 2. Single UPDATE statement for status change (no loops)
-- 3. Minimal transaction duration (quick execution)
-- 4. Indexes used: booking_id (primary key), user_id (indexed)
-- 5. Expected execution time: < 50ms
-- 6. No cascade delete needed - seats remain in Booking_Seats for audit

-- ============================================================================
-- Result Code Reference
-- ============================================================================
-- SUCCESS              - Booking cancelled successfully
-- INVALID_INPUT        - Booking ID or User ID is null or invalid
-- NOT_FOUND            - Booking does not exist
-- UNAUTHORIZED         - User does not own this booking
-- ALREADY_CANCELLED    - Booking was already cancelled
-- INVALID_STATUS       - Booking status is not CONFIRMED
-- BOOKING_DELETED      - Booking has been soft deleted
-- ERROR                - Generic database error (rollback executed)

-- ============================================================================
-- Business Logic Notes
-- ============================================================================
-- 1. Only CONFIRMED bookings can be cancelled
-- 2. Only the booking owner can cancel their booking
-- 3. Cancelled bookings remain in database (no hard delete)
-- 4. Seats automatically become available when status = CANCELLED
-- 5. Payment records remain unchanged (for accounting purposes)
-- 6. Full audit trail maintained for all cancellations
-- 7. Soft-deleted bookings cannot be cancelled (already inactive)

-- ============================================================================
-- Security Features
-- ============================================================================
-- 1. Authorization check prevents unauthorized cancellations
-- 2. No dynamic SQL - prevents SQL injection
-- 3. Row-level locking prevents concurrent modification
-- 4. All inputs validated before transaction
-- 5. Comprehensive audit logging for accountability
-- 6. User can only cancel their own bookings (not others')

-- ============================================================================
-- Integration with sp_book_tickets
-- ============================================================================
-- When a booking is cancelled:
-- 1. Status changes from CONFIRMED to CANCELLED
-- 2. Seats in Booking_Seats table remain (for audit)
-- 3. sp_book_tickets will NOT see these seats as unavailable because:
--    - It checks: b.status = 'CONFIRMED'
--    - Cancelled bookings have status = 'CANCELLED'
-- 4. sp_get_available_seats will show these seats as available again

-- ============================================================================
-- Refund Processing Note
-- ============================================================================
-- This procedure only cancels the booking status.
-- Payment refund processing should be handled separately:
-- 1. Check Payment table for original payment details
-- 2. Process refund through payment gateway
-- 3. Create refund record (requires separate Refunds table)
-- 4. Update payment_status if needed

-- ============================================================================
-- End of sp_cancel_booking.sql
-- ============================================================================
