-- ============================================================================
-- Trigger: trg_prevent_double_booking
-- Type: BEFORE INSERT
-- Table: Booking_Seats
-- Purpose: Final safety check to prevent double-booking of seats
-- Business Rule: A seat can only be booked once for a CONFIRMED booking in the same show
-- Note: This is a safety net - primary logic should be in stored procedure with SELECT...FOR UPDATE
-- ============================================================================

DELIMITER $$

DROP TRIGGER IF EXISTS trg_prevent_double_booking$$

CREATE TRIGGER trg_prevent_double_booking
BEFORE INSERT ON Booking_Seats
FOR EACH ROW
BEGIN
    DECLARE v_show_id INT;
    DECLARE v_existing_booking INT;

    -- Get the show_id for the new booking
    SELECT show_id INTO v_show_id
    FROM Bookings
    WHERE booking_id = NEW.booking_id;

    -- Check if this seat is already booked for a CONFIRMED booking in the same show
    SELECT COUNT(*) INTO v_existing_booking
    FROM Booking_Seats bs
    INNER JOIN Bookings b ON bs.booking_id = b.booking_id
    WHERE bs.seat_id = NEW.seat_id
      AND b.show_id = v_show_id
      AND b.status = 'CONFIRMED'
      AND b.is_deleted = FALSE;

    -- If seat is already booked, raise error
    IF v_existing_booking > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Double booking prevented: Seat is already booked for this show',
            MYSQL_ERRNO = 1644;
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- Performance Notes:
-- - Uses indexed columns (seat_id, show_id, status) for fast lookup
-- - BEFORE INSERT prevents invalid data from entering the table
-- - Should rarely fire if proper locking is used in stored procedures
--
-- Error Handling:
-- - SQLSTATE '45000' is user-defined error state
-- - MYSQL_ERRNO 1644 indicates constraint violation
-- - Application should catch this and show user-friendly message
--
-- Testing:
-- -- Setup: Create a confirmed booking with seat 1
-- INSERT INTO Bookings (user_id, show_id, total_amount, status) VALUES (1, 1, 500.00, 'CONFIRMED');
-- INSERT INTO Booking_Seats (booking_id, seat_id) VALUES (LAST_INSERT_ID(), 1);
--
-- -- Test: Try to book same seat for same show (should fail)
-- INSERT INTO Bookings (user_id, show_id, total_amount, status) VALUES (2, 1, 500.00, 'CONFIRMED');
-- INSERT INTO Booking_Seats (booking_id, seat_id) VALUES (LAST_INSERT_ID(), 1);
-- -- Expected: ERROR 1644 (45000): Double booking prevented: Seat is already booked for this show
-- ============================================================================
