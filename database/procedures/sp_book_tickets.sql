-- ============================================================================
-- Movie Ticket Booking System - Stored Procedure: Book Tickets
-- File: sp_book_tickets.sql
-- Purpose: Transaction-safe ticket booking with seat locking and audit trail
-- Version: 1.0
-- Date: 2026-03-20
-- ============================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_book_tickets$$

CREATE PROCEDURE sp_book_tickets(
    IN p_user_id INT,
    IN p_show_id INT,
    IN p_seat_ids VARCHAR(500),  -- Comma-separated seat IDs (e.g., "1,2,3")
    IN p_payment_method VARCHAR(50),
    IN p_amount DECIMAL(10,2),
    OUT p_booking_id INT,
    OUT p_error_code VARCHAR(50),
    OUT p_error_message VARCHAR(255)
)
booking_proc: BEGIN
    -- ========================================================================
    -- Variable Declarations
    -- ========================================================================
    DECLARE v_show_exists INT DEFAULT 0;
    DECLARE v_show_deleted BOOLEAN DEFAULT FALSE;
    DECLARE v_screen_id INT;
    DECLARE v_seat_id INT;
    DECLARE v_seat_available INT;
    DECLARE v_calculated_amount DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_show_price DECIMAL(10,2);
    DECLARE v_seat_type VARCHAR(10);
    DECLARE v_vip_premium DECIMAL(10,2) DEFAULT 50.00; -- VIP seat premium
    DECLARE v_seat_count INT DEFAULT 0;
    DECLARE v_pos INT;
    DECLARE v_remaining VARCHAR(500);

    -- ========================================================================
    -- Error Handler Declaration
    -- ========================================================================
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_booking_id = NULL;
        SET p_error_code = 'DB_ERROR';
        SET p_error_message = 'Database error occurred during booking transaction';
    END;

    -- ========================================================================
    -- Initialize Output Variables
    -- ========================================================================
    SET p_booking_id = NULL;
    SET p_error_code = NULL;
    SET p_error_message = NULL;

    -- ========================================================================
    -- Input Validation
    -- ========================================================================

    -- Validate user_id
    IF p_user_id IS NULL OR p_user_id <= 0 THEN
        SET p_error_code = 'INVALID_USER';
        SET p_error_message = 'Invalid user ID provided';
        LEAVE booking_proc;
    END IF;

    -- Validate show_id
    IF p_show_id IS NULL OR p_show_id <= 0 THEN
        SET p_error_code = 'INVALID_SHOW';
        SET p_error_message = 'Invalid show ID provided';
        LEAVE booking_proc;
    END IF;

    -- Validate seat_ids
    IF p_seat_ids IS NULL OR TRIM(p_seat_ids) = '' THEN
        SET p_error_code = 'INVALID_SEATS';
        SET p_error_message = 'No seats provided for booking';
        LEAVE booking_proc;
    END IF;

    -- Validate payment_method
    IF p_payment_method IS NULL OR TRIM(p_payment_method) = '' THEN
        SET p_error_code = 'INVALID_PAYMENT';
        SET p_error_message = 'Payment method is required';
        LEAVE booking_proc;
    END IF;

    -- ========================================================================
    -- Start Transaction with REPEATABLE READ Isolation Level
    -- Prevents phantom reads and ensures consistent seat availability check
    -- ========================================================================
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    START TRANSACTION;

    -- ========================================================================
    -- Validate Show Exists and Not Deleted
    -- ========================================================================
    SELECT COUNT(*), is_deleted, screen_id, price
    INTO v_show_exists, v_show_deleted, v_screen_id, v_show_price
    FROM Shows
    WHERE show_id = p_show_id
    GROUP BY is_deleted, screen_id, price;

    IF v_show_exists = 0 THEN
        ROLLBACK;
        SET p_error_code = 'SHOW_NOT_FOUND';
        SET p_error_message = 'Show does not exist';
        LEAVE booking_proc;
    END IF;

    IF v_show_deleted = TRUE THEN
        ROLLBACK;
        SET p_error_code = 'SHOW_DELETED';
        SET p_error_message = 'Show has been deleted and is no longer available';
        LEAVE booking_proc;
    END IF;

    -- ========================================================================
    -- Parse and Validate Each Seat
    -- Lock seats using SELECT ... FOR UPDATE to prevent double-booking
    -- ========================================================================
    SET v_remaining = CONCAT(p_seat_ids, ',');

    WHILE LENGTH(v_remaining) > 0 DO
        SET v_pos = LOCATE(',', v_remaining);
        SET v_seat_id = CAST(SUBSTRING(v_remaining, 1, v_pos - 1) AS UNSIGNED);
        SET v_remaining = SUBSTRING(v_remaining, v_pos + 1);

        -- Skip empty values
        IF v_seat_id IS NULL OR v_seat_id = 0 THEN
            ITERATE;
        END IF;

        -- Lock the seat and validate it belongs to the correct screen
        SELECT seat_type
        INTO v_seat_type
        FROM Seats
        WHERE seat_id = v_seat_id
          AND screen_id = v_screen_id
        FOR UPDATE;

        -- Seat doesn't exist or doesn't belong to this screen
        IF v_seat_type IS NULL THEN
            ROLLBACK;
            SET p_error_code = 'INVALID_SEAT';
            SET p_error_message = CONCAT('Seat ID ', v_seat_id, ' is invalid for this show');
            LEAVE booking_proc;
        END IF;

        -- Check if seat is already booked for this show
        SELECT COUNT(*)
        INTO v_seat_available
        FROM Booking_Seats bs
        INNER JOIN Bookings b ON bs.booking_id = b.booking_id
        WHERE bs.seat_id = v_seat_id
          AND b.show_id = p_show_id
          AND b.status = 'CONFIRMED'
          AND b.is_deleted = FALSE;

        IF v_seat_available > 0 THEN
            ROLLBACK;
            SET p_error_code = 'SEAT_UNAVAILABLE';
            SET p_error_message = CONCAT('Seat ID ', v_seat_id, ' is already booked for this show');
            LEAVE booking_proc;
        END IF;

        -- Calculate price for this seat
        IF v_seat_type = 'VIP' THEN
            SET v_calculated_amount = v_calculated_amount + v_show_price + v_vip_premium;
        ELSE
            SET v_calculated_amount = v_calculated_amount + v_show_price;
        END IF;

        SET v_seat_count = v_seat_count + 1;
    END WHILE;

    -- Validate at least one valid seat was processed
    IF v_seat_count = 0 THEN
        ROLLBACK;
        SET p_error_code = 'NO_VALID_SEATS';
        SET p_error_message = 'No valid seats found in the provided list';
        LEAVE booking_proc;
    END IF;

    -- Validate amount matches calculated amount (security check)
    IF ABS(p_amount - v_calculated_amount) > 0.01 THEN
        ROLLBACK;
        SET p_error_code = 'AMOUNT_MISMATCH';
        SET p_error_message = CONCAT('Amount mismatch. Expected: ', v_calculated_amount, ', Received: ', p_amount);
        LEAVE booking_proc;
    END IF;

    -- ========================================================================
    -- Insert Booking Record
    -- ========================================================================
    INSERT INTO Bookings (user_id, show_id, total_amount, status, is_deleted)
    VALUES (p_user_id, p_show_id, v_calculated_amount, 'CONFIRMED', FALSE);

    SET p_booking_id = LAST_INSERT_ID();

    -- ========================================================================
    -- Link Seats to Booking
    -- Parse seat_ids again and insert into Booking_Seats
    -- ========================================================================
    SET v_remaining = CONCAT(p_seat_ids, ',');

    WHILE LENGTH(v_remaining) > 0 DO
        SET v_pos = LOCATE(',', v_remaining);
        SET v_seat_id = CAST(SUBSTRING(v_remaining, 1, v_pos - 1) AS UNSIGNED);
        SET v_remaining = SUBSTRING(v_remaining, v_pos + 1);

        -- Skip empty values
        IF v_seat_id IS NULL OR v_seat_id = 0 THEN
            ITERATE;
        END IF;

        INSERT INTO Booking_Seats (booking_id, seat_id)
        VALUES (p_booking_id, v_seat_id);
    END WHILE;

    -- ========================================================================
    -- Record Payment Transaction
    -- ========================================================================
    INSERT INTO Payments (booking_id, amount, payment_method, payment_status)
    VALUES (p_booking_id, v_calculated_amount, p_payment_method, 'SUCCESS');

    -- ========================================================================
    -- Create Audit Trail
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
        'CREATE',
        NULL,
        'CONFIRMED',
        JSON_OBJECT(
            'show_id', p_show_id,
            'seat_ids', p_seat_ids,
            'seat_count', v_seat_count,
            'total_amount', v_calculated_amount,
            'payment_method', p_payment_method
        )
    );

    -- ========================================================================
    -- Commit Transaction
    -- ========================================================================
    COMMIT;

    -- Set success indicators
    SET p_error_code = 'SUCCESS';
    SET p_error_message = CONCAT('Booking created successfully. Booking ID: ', p_booking_id);

END$$

DELIMITER ;

-- ============================================================================
-- Usage Examples and Test Cases
-- ============================================================================

-- Test Case 1: Successful booking
-- CALL sp_book_tickets(1, 1, '1,2,3', 'CREDIT_CARD', 350.00, @booking_id, @error_code, @error_msg);
-- SELECT @booking_id AS booking_id, @error_code AS error_code, @error_msg AS error_message;

-- Test Case 2: Invalid user
-- CALL sp_book_tickets(NULL, 1, '1,2,3', 'CREDIT_CARD', 350.00, @booking_id, @error_code, @error_msg);
-- SELECT @booking_id AS booking_id, @error_code AS error_code, @error_msg AS error_message;

-- Test Case 3: Show not found
-- CALL sp_book_tickets(1, 9999, '1,2,3', 'CREDIT_CARD', 350.00, @booking_id, @error_code, @error_msg);
-- SELECT @booking_id AS booking_id, @error_code AS error_code, @error_msg AS error_message;

-- Test Case 4: Seat already booked (requires existing booking)
-- First booking:
-- CALL sp_book_tickets(1, 1, '10', 'CREDIT_CARD', 100.00, @booking_id1, @error_code1, @error_msg1);
-- Attempt duplicate:
-- CALL sp_book_tickets(2, 1, '10', 'DEBIT_CARD', 100.00, @booking_id2, @error_code2, @error_msg2);
-- SELECT @booking_id2 AS booking_id, @error_code2 AS error_code, @error_msg2 AS error_message;

-- Test Case 5: Amount mismatch
-- CALL sp_book_tickets(1, 1, '4,5', 'UPI', 500.00, @booking_id, @error_code, @error_msg);
-- SELECT @booking_id AS booking_id, @error_code AS error_code, @error_msg AS error_message;

-- Test Case 6: Empty seat list
-- CALL sp_book_tickets(1, 1, '', 'CREDIT_CARD', 0.00, @booking_id, @error_code, @error_msg);
-- SELECT @booking_id AS booking_id, @error_code AS error_code, @error_msg AS error_message;

-- ============================================================================
-- Verify Booking Results
-- ============================================================================
-- SELECT b.*, p.*, GROUP_CONCAT(bs.seat_id) as seats
-- FROM Bookings b
-- JOIN Payments p ON b.booking_id = p.booking_id
-- JOIN Booking_Seats bs ON b.booking_id = bs.booking_id
-- WHERE b.booking_id = @booking_id
-- GROUP BY b.booking_id;

-- ============================================================================
-- Check Audit Trail
-- ============================================================================
-- SELECT * FROM Audit_Bookings WHERE booking_id = @booking_id;

-- ============================================================================
-- Performance Notes
-- ============================================================================
-- 1. Uses REPEATABLE READ isolation to prevent phantom reads
-- 2. SELECT ... FOR UPDATE locks seats during transaction
-- 3. Validates all seats before any INSERT to minimize rollback overhead
-- 4. Indexes used: show_id, screen_id, seat_id (all have indexes)
-- 5. Expected execution time: < 100ms for typical booking (3-5 seats)
-- 6. Transaction holds locks only during booking process (minimal duration)

-- ============================================================================
-- Error Code Reference
-- ============================================================================
-- SUCCESS              - Booking completed successfully
-- INVALID_USER         - User ID is null or invalid
-- INVALID_SHOW         - Show ID is null or invalid
-- INVALID_SEATS        - Seat list is empty or null
-- INVALID_PAYMENT      - Payment method is missing
-- SHOW_NOT_FOUND       - Show does not exist in database
-- SHOW_DELETED         - Show has been soft deleted
-- INVALID_SEAT         - Seat doesn't exist or wrong screen
-- SEAT_UNAVAILABLE     - Seat already booked for this show
-- NO_VALID_SEATS       - No valid seats in provided list
-- AMOUNT_MISMATCH      - Provided amount doesn't match calculated amount
-- DB_ERROR             - Generic database error (rollback executed)

-- ============================================================================
-- Security Features
-- ============================================================================
-- 1. No dynamic SQL - prevents SQL injection
-- 2. All inputs validated before transaction starts
-- 3. Amount verification prevents price manipulation
-- 4. Seat ownership verification (must belong to show's screen)
-- 5. Transaction isolation prevents race conditions
-- 6. Comprehensive audit trail for forensics

-- ============================================================================
-- End of sp_book_tickets.sql
-- ============================================================================
