-- ============================================================================
-- Trigger: trg_validate_show_time
-- Type: BEFORE INSERT, BEFORE UPDATE
-- Table: Shows
-- Purpose: Prevent overlapping shows in the same screen
-- Business Rule: Shows in same screen must not overlap (movie duration + 30min buffer)
-- ============================================================================

DELIMITER $$

-- Trigger for INSERT
DROP TRIGGER IF EXISTS trg_validate_show_time_insert$$

CREATE TRIGGER trg_validate_show_time_insert
BEFORE INSERT ON Shows
FOR EACH ROW
BEGIN
    DECLARE v_movie_duration INT;
    DECLARE v_show_end_time DATETIME;
    DECLARE v_overlap_count INT;

    -- Get the movie duration
    SELECT duration INTO v_movie_duration
    FROM Movies
    WHERE movie_id = NEW.movie_id;

    -- Calculate show end time (duration + 30 min buffer for cleaning)
    SET v_show_end_time = DATE_ADD(NEW.show_time, INTERVAL (v_movie_duration + 30) MINUTE);

    -- Check for overlapping shows in the same screen
    -- A show overlaps if:
    -- 1. It starts before this show ends, AND
    -- 2. It ends after this show starts
    SELECT COUNT(*) INTO v_overlap_count
    FROM Shows s
    INNER JOIN Movies m ON s.movie_id = m.movie_id
    WHERE s.screen_id = NEW.screen_id
      AND s.is_deleted = FALSE
      AND (
          -- Existing show starts before new show ends
          s.show_time < v_show_end_time
          AND
          -- Existing show ends after new show starts
          DATE_ADD(s.show_time, INTERVAL (m.duration + 30) MINUTE) > NEW.show_time
      );

    -- Raise error if overlap detected
    IF v_overlap_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Show time conflict: Overlapping show exists in this screen',
            MYSQL_ERRNO = 1645;
    END IF;
END$$

-- Trigger for UPDATE
DROP TRIGGER IF EXISTS trg_validate_show_time_update$$

CREATE TRIGGER trg_validate_show_time_update
BEFORE UPDATE ON Shows
FOR EACH ROW
BEGIN
    DECLARE v_movie_duration INT;
    DECLARE v_show_end_time DATETIME;
    DECLARE v_overlap_count INT;

    -- Only validate if show_time, screen_id, or movie_id changed
    IF NEW.show_time != OLD.show_time
       OR NEW.screen_id != OLD.screen_id
       OR NEW.movie_id != OLD.movie_id THEN

        -- Get the movie duration
        SELECT duration INTO v_movie_duration
        FROM Movies
        WHERE movie_id = NEW.movie_id;

        -- Calculate show end time (duration + 30 min buffer)
        SET v_show_end_time = DATE_ADD(NEW.show_time, INTERVAL (v_movie_duration + 30) MINUTE);

        -- Check for overlapping shows (excluding current show)
        SELECT COUNT(*) INTO v_overlap_count
        FROM Shows s
        INNER JOIN Movies m ON s.movie_id = m.movie_id
        WHERE s.screen_id = NEW.screen_id
          AND s.show_id != NEW.show_id  -- Exclude current show
          AND s.is_deleted = FALSE
          AND (
              s.show_time < v_show_end_time
              AND
              DATE_ADD(s.show_time, INTERVAL (m.duration + 30) MINUTE) > NEW.show_time
          );

        -- Raise error if overlap detected
        IF v_overlap_count > 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Show time conflict: Overlapping show exists in this screen',
                MYSQL_ERRNO = 1645;
        END IF;
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- Performance Notes:
-- - Uses indexes on screen_id, show_time, and is_deleted
-- - Only checks overlaps in the same screen (WHERE s.screen_id = NEW.screen_id)
-- - UPDATE trigger only validates if relevant fields changed
-- - JOIN with Movies table to get duration (cached by InnoDB)
--
-- Overlap Logic:
-- Show A overlaps with Show B if:
-- - Show A starts before Show B ends, AND
-- - Show A ends after Show B starts
-- - Buffer time: 30 minutes after movie end for screen cleaning
--
-- Testing:
-- -- Setup: Insert a show at 6:00 PM (movie duration 120 min)
-- INSERT INTO Shows (movie_id, screen_id, show_time, price)
-- VALUES (1, 1, '2026-03-20 18:00:00', 250.00);
--
-- -- Test 1: Try to insert overlapping show at 7:00 PM (should fail)
-- INSERT INTO Shows (movie_id, screen_id, show_time, price)
-- VALUES (1, 1, '2026-03-20 19:00:00', 250.00);
-- -- Expected: ERROR 1645 (45000): Show time conflict: Overlapping show exists in this screen
--
-- -- Test 2: Insert non-overlapping show at 9:00 PM (should succeed)
-- INSERT INTO Shows (movie_id, screen_id, show_time, price)
-- VALUES (1, 1, '2026-03-20 21:00:00', 250.00);
-- -- Expected: Success (6:00 PM show ends at ~8:30 PM with buffer)
-- ============================================================================
