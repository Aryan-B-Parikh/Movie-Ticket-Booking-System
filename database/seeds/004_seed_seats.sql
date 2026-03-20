-- ============================================================================
-- Seed Data: Seats
-- File: 004_seed_seats.sql
-- Purpose: Create 50 seats per screen (450 total seats)
-- Layout: Rows A-E, seats 1-10 per row (5 rows × 10 seats = 50 seats)
-- Distribution: REGULAR (70% = 35 seats), VIP (30% = 15 seats)
-- VIP Seats: Rows D and E (premium back rows) + center seats in Row C (C4-C7)
-- ============================================================================

-- Truncate table to allow re-seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Seats;
SET FOREIGN_KEY_CHECKS = 1;

-- Helper procedure to generate seats for a screen
DELIMITER $$

CREATE PROCEDURE GenerateSeatsForScreen(IN p_screen_id INT)
BEGIN
    DECLARE v_row CHAR(1);
    DECLARE v_seat_num INT;
    DECLARE v_seat_type VARCHAR(10);
    DECLARE v_rows VARCHAR(5) DEFAULT 'ABCDE';
    DECLARE v_row_idx INT DEFAULT 1;

    WHILE v_row_idx <= 5 DO
        SET v_row = SUBSTRING(v_rows, v_row_idx, 1);
        SET v_seat_num = 1;

        WHILE v_seat_num <= 10 DO
            -- Determine seat type:
            -- VIP: Rows D, E (all seats) and Row C center seats (C4-C7)
            -- REGULAR: Rows A, B and Row C edge seats
            IF v_row IN ('D', 'E') OR (v_row = 'C' AND v_seat_num BETWEEN 4 AND 7) THEN
                SET v_seat_type = 'VIP';
            ELSE
                SET v_seat_type = 'REGULAR';
            END IF;

            INSERT INTO Seats (screen_id, seat_number, seat_type)
            VALUES (p_screen_id, CONCAT(v_row, v_seat_num), v_seat_type);

            SET v_seat_num = v_seat_num + 1;
        END WHILE;

        SET v_row_idx = v_row_idx + 1;
    END WHILE;
END$$

DELIMITER ;

-- Generate seats for all 9 screens
CALL GenerateSeatsForScreen(1);
CALL GenerateSeatsForScreen(2);
CALL GenerateSeatsForScreen(3);
CALL GenerateSeatsForScreen(4);
CALL GenerateSeatsForScreen(5);
CALL GenerateSeatsForScreen(6);
CALL GenerateSeatsForScreen(7);
CALL GenerateSeatsForScreen(8);
CALL GenerateSeatsForScreen(9);

-- Drop the helper procedure
DROP PROCEDURE IF EXISTS GenerateSeatsForScreen;

-- Verify insertion
SELECT
    screen_id,
    COUNT(*) AS total_seats,
    SUM(CASE WHEN seat_type = 'REGULAR' THEN 1 ELSE 0 END) AS regular_seats,
    SUM(CASE WHEN seat_type = 'VIP' THEN 1 ELSE 0 END) AS vip_seats
FROM Seats
GROUP BY screen_id
ORDER BY screen_id;

-- Overall summary
SELECT
    COUNT(*) AS total_seats,
    SUM(CASE WHEN seat_type = 'REGULAR' THEN 1 ELSE 0 END) AS total_regular,
    SUM(CASE WHEN seat_type = 'VIP' THEN 1 ELSE 0 END) AS total_vip
FROM Seats;
