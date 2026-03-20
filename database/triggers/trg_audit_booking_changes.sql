-- ============================================================================
-- Trigger: trg_audit_booking_changes
-- Type: AFTER UPDATE
-- Table: Bookings
-- Purpose: Automatically log all booking status changes to Audit_Bookings
-- Business Rule: Every status change must be tracked for compliance and dispute resolution
-- ============================================================================

DELIMITER $$

DROP TRIGGER IF EXISTS trg_audit_booking_changes$$

CREATE TRIGGER trg_audit_booking_changes
AFTER UPDATE ON Bookings
FOR EACH ROW
BEGIN
    -- Only log when status actually changes (not on other field updates)
    IF OLD.status != NEW.status THEN
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
                'old_total_amount', OLD.total_amount,
                'new_total_amount', NEW.total_amount,
                'old_is_deleted', OLD.is_deleted,
                'new_is_deleted', NEW.is_deleted,
                'show_id', NEW.show_id
            ),
            NOW()
        );
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- Performance Notes:
-- - Trigger only fires on UPDATE operations (not on every SELECT)
-- - IF condition prevents unnecessary audit logs when only non-status fields change
-- - JSON_OBJECT provides structured change tracking
-- - Indexed on booking_id for fast audit retrieval
--
-- Testing:
-- UPDATE Bookings SET status = 'CANCELLED' WHERE booking_id = 1;
-- SELECT * FROM Audit_Bookings WHERE booking_id = 1;
-- ============================================================================
