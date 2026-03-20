-- ============================================================================
-- Trigger: trg_prevent_payment_modification
-- Type: BEFORE UPDATE
-- Table: Payments
-- Purpose: Ensure payment records are immutable after creation
-- Business Rule: Payments are financial records and must never be modified
-- Compliance: Audit trail integrity, financial regulations
-- ============================================================================

DELIMITER $$

DROP TRIGGER IF EXISTS trg_prevent_payment_modification$$

CREATE TRIGGER trg_prevent_payment_modification
BEFORE UPDATE ON Payments
FOR EACH ROW
BEGIN
    -- Prevent any updates to payment records
    -- Payments must be immutable for audit compliance
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Payments are immutable: Cannot modify payment records after creation',
        MYSQL_ERRNO = 1646;
END$$

DELIMITER ;

-- ============================================================================
-- Business Rationale:
-- - Payments represent financial transactions and must remain unchanged
-- - Any correction requires creating a new payment record (refund)
-- - Ensures audit trail integrity and compliance with financial regulations
-- - Prevents accidental or malicious modification of payment history
--
-- Alternative Approach for Corrections:
-- - To "cancel" a payment: Create a new payment with negative amount (refund)
-- - To correct amount: Create reversal payment + new correct payment
-- - Never modify existing payment records
--
-- Performance Notes:
-- - Minimal overhead (immediate rejection)
-- - No database lookups required
-- - Prevents data corruption at database level
--
-- Testing:
-- -- Setup: Create a payment
-- INSERT INTO Bookings (user_id, show_id, total_amount, status) VALUES (1, 1, 500.00, 'CONFIRMED');
-- INSERT INTO Payments (booking_id, amount, payment_method, payment_status)
-- VALUES (LAST_INSERT_ID(), 500.00, 'CREDIT_CARD', 'SUCCESS');
--
-- -- Test: Try to modify payment (should fail)
-- UPDATE Payments SET amount = 600.00 WHERE payment_id = 1;
-- -- Expected: ERROR 1646 (45000): Payments are immutable: Cannot modify payment records after creation
--
-- -- Correct approach for refund: Create new negative payment
-- INSERT INTO Payments (booking_id, amount, payment_method, payment_status)
-- VALUES (1, -500.00, 'REFUND', 'SUCCESS');
-- ============================================================================
