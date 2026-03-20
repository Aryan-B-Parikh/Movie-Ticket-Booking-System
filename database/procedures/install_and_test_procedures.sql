-- ============================================================================
-- Movie Ticket Booking System - Stored Procedures Installation & Testing
-- File: install_and_test_procedures.sql
-- Purpose: One-script installation and comprehensive testing of all procedures
-- Version: 1.0
-- Date: 2026-03-20
-- ============================================================================

-- ============================================================================
-- SECTION 1: INSTALLATION
-- ============================================================================

-- Load and execute all stored procedures
SOURCE sp_book_tickets.sql;
SOURCE sp_cancel_booking.sql;
SOURCE sp_get_available_seats.sql;

-- Verify procedures are created
SELECT
    ROUTINE_NAME,
    ROUTINE_TYPE,
    CREATED,
    LAST_ALTERED
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
  AND ROUTINE_TYPE = 'PROCEDURE'
  AND ROUTINE_NAME LIKE 'sp_%'
ORDER BY ROUTINE_NAME;

-- ============================================================================
-- SECTION 2: COMPREHENSIVE TEST SUITE
-- ============================================================================

-- Test Setup: Ensure we have test data
-- (Assumes seeds have been run from database/seeds/)

-- ============================================================================
-- TEST SUITE 1: sp_get_available_seats
-- ============================================================================
SELECT '=== TEST SUITE 1: sp_get_available_seats ===' AS test_suite;

-- Test 1.1: Get available seats for show (should show all seats initially)
SELECT '-- Test 1.1: Get all available seats for show 1' AS test_case;
CALL sp_get_available_seats(1);

-- Test 1.2: Invalid show ID (NULL)
SELECT '-- Test 1.2: NULL show_id (should return error)' AS test_case;
CALL sp_get_available_seats(NULL);

-- Test 1.3: Non-existent show
SELECT '-- Test 1.3: Non-existent show_id (should return error)' AS test_case;
CALL sp_get_available_seats(99999);

-- Test 1.4: Check pricing calculation (VIP vs REGULAR)
SELECT '-- Test 1.4: Verify VIP pricing (base + 50.00 premium)' AS test_case;
CALL sp_get_available_seats(1);
-- Manually verify: VIP seats should have price = base_price + 50.00

-- ============================================================================
-- TEST SUITE 2: sp_book_tickets
-- ============================================================================
SELECT '=== TEST SUITE 2: sp_book_tickets ===' AS test_suite;

-- Test 2.1: Successful booking (REGULAR seats)
SELECT '-- Test 2.1: Book REGULAR seats successfully' AS test_case;
CALL sp_book_tickets(1, 1, '1,2,3', 'CREDIT_CARD', 300.00, @booking_id_1, @error_code_1, @error_msg_1);
SELECT @booking_id_1 AS booking_id, @error_code_1 AS error_code, @error_msg_1 AS error_message;

-- Verify booking was created
SELECT 'Verify booking details:' AS verification;
SELECT b.booking_id, b.user_id, b.show_id, b.status, b.total_amount, COUNT(bs.seat_id) AS seat_count
FROM Bookings b
JOIN Booking_Seats bs ON b.booking_id = bs.booking_id
WHERE b.booking_id = @booking_id_1
GROUP BY b.booking_id;

-- Verify payment was recorded
SELECT p.payment_id, p.booking_id, p.amount, p.payment_method, p.payment_status
FROM Payments p
WHERE p.booking_id = @booking_id_1;

-- Verify audit trail
SELECT a.audit_id, a.booking_id, a.action, a.old_status, a.new_status
FROM Audit_Bookings a
WHERE a.booking_id = @booking_id_1;

-- Test 2.2: Verify seats are now unavailable
SELECT '-- Test 2.2: Check seats 1,2,3 are now unavailable' AS test_case;
CALL sp_get_available_seats(1);
-- Manually verify: Seats 1,2,3 should NOT appear in results

-- Test 2.3: Attempt to book already booked seat (should fail)
SELECT '-- Test 2.3: Try to book already booked seat (should fail)' AS test_case;
CALL sp_book_tickets(2, 1, '1', 'DEBIT_CARD', 100.00, @booking_id_2, @error_code_2, @error_msg_2);
SELECT @booking_id_2 AS booking_id, @error_code_2 AS error_code, @error_msg_2 AS error_message;
-- Expected: error_code = 'SEAT_UNAVAILABLE'

-- Test 2.4: Invalid user ID
SELECT '-- Test 2.4: Book with NULL user_id (should fail)' AS test_case;
CALL sp_book_tickets(NULL, 1, '4,5', 'CREDIT_CARD', 200.00, @booking_id_3, @error_code_3, @error_msg_3);
SELECT @booking_id_3 AS booking_id, @error_code_3 AS error_code, @error_msg_3 AS error_message;
-- Expected: error_code = 'INVALID_USER'

-- Test 2.5: Invalid show ID
SELECT '-- Test 2.5: Book with invalid show_id (should fail)' AS test_case;
CALL sp_book_tickets(1, 99999, '4,5', 'CREDIT_CARD', 200.00, @booking_id_4, @error_code_4, @error_msg_4);
SELECT @booking_id_4 AS booking_id, @error_code_4 AS error_code, @error_msg_4 AS error_message;
-- Expected: error_code = 'SHOW_NOT_FOUND'

-- Test 2.6: Empty seat list
SELECT '-- Test 2.6: Book with empty seat list (should fail)' AS test_case;
CALL sp_book_tickets(1, 1, '', 'CREDIT_CARD', 0.00, @booking_id_5, @error_code_5, @error_msg_5);
SELECT @booking_id_5 AS booking_id, @error_code_5 AS error_code, @error_msg_5 AS error_message;
-- Expected: error_code = 'INVALID_SEATS'

-- Test 2.7: Amount mismatch (security test)
SELECT '-- Test 2.7: Book with wrong amount (should fail)' AS test_case;
CALL sp_book_tickets(1, 1, '4,5', 'CREDIT_CARD', 999.99, @booking_id_6, @error_code_6, @error_msg_6);
SELECT @booking_id_6 AS booking_id, @error_code_6 AS error_code, @error_msg_6 AS error_message;
-- Expected: error_code = 'AMOUNT_MISMATCH'

-- Test 2.8: Successful booking with correct amount
SELECT '-- Test 2.8: Book seats 4,5 with correct amount' AS test_case;
CALL sp_book_tickets(1, 1, '4,5', 'UPI', 200.00, @booking_id_7, @error_code_7, @error_msg_7);
SELECT @booking_id_7 AS booking_id, @error_code_7 AS error_code, @error_msg_7 AS error_message;

-- Test 2.9: Book VIP seats (test premium pricing)
SELECT '-- Test 2.9: Book VIP seats (verify premium pricing)' AS test_case;
-- First find VIP seat IDs
SELECT seat_id, seat_number, seat_type FROM Seats WHERE seat_type = 'VIP' LIMIT 3;
-- Book VIP seats (adjust IDs based on your seed data)
-- CALL sp_book_tickets(1, 2, '91,92', 'CREDIT_CARD', 300.00, @booking_id_8, @error_code_8, @error_msg_8);
-- SELECT @booking_id_8 AS booking_id, @error_code_8 AS error_code, @error_msg_8 AS error_message;

-- Test 2.10: Book multiple seats across seat types
SELECT '-- Test 2.10: Book mixed REGULAR and VIP seats' AS test_case;
-- Requires knowing seat IDs from your seed data

-- ============================================================================
-- TEST SUITE 3: sp_cancel_booking
-- ============================================================================
SELECT '=== TEST SUITE 3: sp_cancel_booking ===' AS test_suite;

-- Test 3.1: Successful cancellation
SELECT '-- Test 3.1: Cancel booking successfully' AS test_case;
CALL sp_cancel_booking(@booking_id_1, 1, @result_1, @message_1);
SELECT @result_1 AS result, @message_1 AS message;

-- Verify booking status changed
SELECT 'Verify booking status:' AS verification;
SELECT booking_id, user_id, status, updated_at
FROM Bookings
WHERE booking_id = @booking_id_1;

-- Verify audit trail for cancellation
SELECT a.audit_id, a.booking_id, a.action, a.old_status, a.new_status
FROM Audit_Bookings a
WHERE a.booking_id = @booking_id_1
ORDER BY a.created_at DESC
LIMIT 2;

-- Test 3.2: Verify seats are available again
SELECT '-- Test 3.2: Check seats 1,2,3 are available again' AS test_case;
CALL sp_get_available_seats(1);
-- Manually verify: Seats 1,2,3 should appear in results again

-- Test 3.3: Attempt to cancel already cancelled booking
SELECT '-- Test 3.3: Try to cancel already cancelled booking (should fail)' AS test_case;
CALL sp_cancel_booking(@booking_id_1, 1, @result_2, @message_2);
SELECT @result_2 AS result, @message_2 AS message;
-- Expected: result = 'ALREADY_CANCELLED'

-- Test 3.4: Unauthorized cancellation (different user)
SELECT '-- Test 3.4: Try to cancel another users booking (should fail)' AS test_case;
CALL sp_cancel_booking(@booking_id_7, 2, @result_3, @message_3);
SELECT @result_3 AS result, @message_3 AS message;
-- Expected: result = 'UNAUTHORIZED'

-- Test 3.5: Cancel non-existent booking
SELECT '-- Test 3.5: Try to cancel non-existent booking (should fail)' AS test_case;
CALL sp_cancel_booking(99999, 1, @result_4, @message_4);
SELECT @result_4 AS result, @message_4 AS message;
-- Expected: result = 'NOT_FOUND'

-- Test 3.6: Invalid booking ID
SELECT '-- Test 3.6: Cancel with NULL booking_id (should fail)' AS test_case;
CALL sp_cancel_booking(NULL, 1, @result_5, @message_5);
SELECT @result_5 AS result, @message_5 AS message;
-- Expected: result = 'INVALID_INPUT'

-- Test 3.7: Invalid user ID
SELECT '-- Test 3.7: Cancel with invalid user_id (should fail)' AS test_case;
CALL sp_cancel_booking(1, -1, @result_6, @message_6);
SELECT @result_6 AS result, @message_6 AS message;
-- Expected: result = 'INVALID_INPUT'

-- ============================================================================
-- TEST SUITE 4: INTEGRATION TESTS (End-to-End Workflows)
-- ============================================================================
SELECT '=== TEST SUITE 4: Integration Tests ===' AS test_suite;

-- Test 4.1: Complete booking lifecycle (Book → Cancel → Re-book)
SELECT '-- Test 4.1: Complete booking lifecycle' AS test_case;

-- Step 1: Check available seats
CALL sp_get_available_seats(2);

-- Step 2: Book seats
CALL sp_book_tickets(2, 2, '51,52,53', 'CREDIT_CARD', 300.00, @booking_id_int1, @error_code_int1, @error_msg_int1);
SELECT @booking_id_int1 AS booking_id, @error_code_int1 AS status;

-- Step 3: Verify seats unavailable
CALL sp_get_available_seats(2);

-- Step 4: Cancel booking
CALL sp_cancel_booking(@booking_id_int1, 2, @result_int1, @message_int1);
SELECT @result_int1 AS cancel_result;

-- Step 5: Verify seats available again
CALL sp_get_available_seats(2);

-- Step 6: Re-book same seats (should succeed)
CALL sp_book_tickets(3, 2, '51,52,53', 'UPI', 300.00, @booking_id_int2, @error_code_int2, @error_msg_int2);
SELECT @booking_id_int2 AS rebooking_id, @error_code_int2 AS status;

-- Test 4.2: Concurrent booking attempt simulation
SELECT '-- Test 4.2: Concurrent booking simulation (second should fail)' AS test_case;

-- User A books seats 61-63
CALL sp_book_tickets(1, 3, '61,62,63', 'CREDIT_CARD', 300.00, @booking_concurrent_a, @error_concurrent_a, @msg_concurrent_a);

-- User B tries to book seat 62 (should fail)
CALL sp_book_tickets(2, 3, '62', 'DEBIT_CARD', 100.00, @booking_concurrent_b, @error_concurrent_b, @msg_concurrent_b);

SELECT 'User A result:' AS user, @booking_concurrent_a AS booking_id, @error_concurrent_a AS status
UNION ALL
SELECT 'User B result:', @booking_concurrent_b, @error_concurrent_b;

-- ============================================================================
-- TEST SUITE 5: PERFORMANCE TESTS
-- ============================================================================
SELECT '=== TEST SUITE 5: Performance Tests ===' AS test_suite;

-- Test 5.1: Query execution time for sp_get_available_seats
SELECT '-- Test 5.1: Measure sp_get_available_seats performance' AS test_case;
SET @start_time = NOW(6);
CALL sp_get_available_seats(1);
SET @end_time = NOW(6);
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, @end_time) / 1000 AS execution_time_ms;
-- Expected: < 50ms for typical screen with 100 seats

-- Test 5.2: Query execution time for sp_book_tickets
SELECT '-- Test 5.2: Measure sp_book_tickets performance' AS test_case;
SET @start_time = NOW(6);
CALL sp_book_tickets(1, 4, '71,72', 'CREDIT_CARD', 200.00, @booking_perf, @error_perf, @msg_perf);
SET @end_time = NOW(6);
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, @end_time) / 1000 AS execution_time_ms;
-- Expected: < 100ms for typical booking with 2-5 seats

-- Test 5.3: Query execution time for sp_cancel_booking
SELECT '-- Test 5.3: Measure sp_cancel_booking performance' AS test_case;
SET @start_time = NOW(6);
CALL sp_cancel_booking(@booking_perf, 1, @result_perf, @msg_perf);
SET @end_time = NOW(6);
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, @end_time) / 1000 AS execution_time_ms;
-- Expected: < 50ms

-- ============================================================================
-- TEST SUITE 6: DATA INTEGRITY TESTS
-- ============================================================================
SELECT '=== TEST SUITE 6: Data Integrity Tests ===' AS test_suite;

-- Test 6.1: Verify no orphaned records in Booking_Seats
SELECT '-- Test 6.1: Check for orphaned booking_seats records' AS test_case;
SELECT COUNT(*) AS orphaned_count
FROM Booking_Seats bs
LEFT JOIN Bookings b ON bs.booking_id = b.booking_id
WHERE b.booking_id IS NULL;
-- Expected: 0

-- Test 6.2: Verify all bookings have payments
SELECT '-- Test 6.2: Check all bookings have payment records' AS test_case;
SELECT COUNT(*) AS bookings_without_payment
FROM Bookings b
LEFT JOIN Payments p ON b.booking_id = p.booking_id
WHERE p.payment_id IS NULL
  AND b.status = 'CONFIRMED';
-- Expected: 0

-- Test 6.3: Verify audit trail completeness
SELECT '-- Test 6.3: Check all bookings have audit trail' AS test_case;
SELECT COUNT(*) AS bookings_without_audit
FROM Bookings b
LEFT JOIN Audit_Bookings a ON b.booking_id = a.booking_id
WHERE a.audit_id IS NULL;
-- Expected: 0

-- Test 6.4: Verify no double-booking
SELECT '-- Test 6.4: Check for double-booked seats (critical test)' AS test_case;
SELECT
    b.show_id,
    bs.seat_id,
    COUNT(*) AS booking_count
FROM Booking_Seats bs
JOIN Bookings b ON bs.booking_id = b.booking_id
WHERE b.status = 'CONFIRMED'
  AND b.is_deleted = FALSE
GROUP BY b.show_id, bs.seat_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no double-bookings)

-- ============================================================================
-- SECTION 3: CLEANUP (Optional - for repeatable testing)
-- ============================================================================
SELECT '=== Cleanup Section (Optional) ===' AS cleanup;

-- Uncomment to clean up test bookings:
-- DELETE FROM Audit_Bookings WHERE booking_id IN (SELECT booking_id FROM Bookings WHERE user_id IN (1,2,3));
-- DELETE FROM Payments WHERE booking_id IN (SELECT booking_id FROM Bookings WHERE user_id IN (1,2,3));
-- DELETE FROM Booking_Seats WHERE booking_id IN (SELECT booking_id FROM Bookings WHERE user_id IN (1,2,3));
-- DELETE FROM Bookings WHERE user_id IN (1,2,3);

-- ============================================================================
-- SECTION 4: SUMMARY REPORT
-- ============================================================================
SELECT '=== Test Summary Report ===' AS summary;

-- Count total bookings
SELECT 'Total Bookings:' AS metric, COUNT(*) AS count FROM Bookings
UNION ALL
SELECT 'Confirmed Bookings:', COUNT(*) FROM Bookings WHERE status = 'CONFIRMED'
UNION ALL
SELECT 'Cancelled Bookings:', COUNT(*) FROM Bookings WHERE status = 'CANCELLED'
UNION ALL
SELECT 'Total Payments:', COUNT(*) FROM Payments
UNION ALL
SELECT 'Successful Payments:', COUNT(*) FROM Payments WHERE payment_status = 'SUCCESS'
UNION ALL
SELECT 'Total Audit Records:', COUNT(*) FROM Audit_Bookings
UNION ALL
SELECT 'Total Booking_Seats:', COUNT(*) FROM Booking_Seats;

-- Show recent bookings
SELECT 'Recent bookings:' AS info;
SELECT
    b.booking_id,
    b.user_id,
    b.show_id,
    b.status,
    b.total_amount,
    COUNT(bs.seat_id) AS seat_count,
    b.created_at
FROM Bookings b
LEFT JOIN Booking_Seats bs ON b.booking_id = bs.booking_id
GROUP BY b.booking_id
ORDER BY b.created_at DESC
LIMIT 10;

-- ============================================================================
-- End of install_and_test_procedures.sql
-- ============================================================================
