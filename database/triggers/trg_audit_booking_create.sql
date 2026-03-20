-- ============================================================================
-- Trigger: trg_audit_booking_create
-- Type: AFTER INSERT
-- Table: Bookings
-- Purpose: Log booking creation to Audit_Bookings for complete audit trail
-- Business Rule: All bookings must be tracked from creation to completion
-- ============================================================================

DELIMITER $$

DROP TRIGGER IF EXISTS trg_audit_booking_create$$

CREATE TRIGGER trg_audit_booking_create
AFTER INSERT ON Bookings
FOR EACH ROW
BEGIN
    -- Log the creation of a new booking
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
        NULL,  -- No old status on creation
        NEW.status,
        JSON_OBJECT(
            'booking_id', NEW.booking_id,
            'show_id', NEW.show_id,
            'total_amount', NEW.total_amount,
            'status', NEW.status,
            'is_deleted', NEW.is_deleted
        ),
        NOW()
    );
END$$

DELIMITER ;

-- ============================================================================
-- Performance Notes:
-- - Fires only once per INSERT (minimal overhead)
-- - Provides complete lifecycle tracking from creation
-- - JSON contains initial booking state
--
-- Testing:
-- INSERT INTO Bookings (user_id, show_id, total_amount, status)
-- VALUES (1, 1, 500.00, 'CONFIRMED');
-- SELECT * FROM Audit_Bookings WHERE action = 'CREATE' ORDER BY created_at DESC LIMIT 1;
-- ============================================================================
