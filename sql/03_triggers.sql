-- Movie Ticket Booking System
-- Trigger layer for business rule enforcement

USE movie_ticket_booking;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_shows_validate_bi$$
CREATE TRIGGER trg_shows_validate_bi
BEFORE INSERT ON shows
FOR EACH ROW
BEGIN
  DECLARE v_duration SMALLINT UNSIGNED;

  IF NEW.end_time IS NULL THEN
    SELECT m.duration_minutes
      INTO v_duration
    FROM movies m
    WHERE m.movie_id = NEW.movie_id;

    IF v_duration IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid movie reference while deriving show end time.';
    END IF;

    SET NEW.end_time = DATE_ADD(NEW.show_time, INTERVAL v_duration MINUTE);
  END IF;

  IF NEW.end_time <= NEW.show_time THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Show end_time must be after show_time.';
  END IF;

  IF NEW.status = 'SCHEDULED' AND EXISTS (
    SELECT 1
    FROM shows s
    WHERE s.screen_id = NEW.screen_id
      AND s.status = 'SCHEDULED'
      AND NEW.show_time < s.end_time
      AND NEW.end_time > s.show_time
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Show timing overlaps with an existing scheduled show on the same screen.';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_shows_validate_bu$$
CREATE TRIGGER trg_shows_validate_bu
BEFORE UPDATE ON shows
FOR EACH ROW
BEGIN
  DECLARE v_duration SMALLINT UNSIGNED;

  IF NEW.end_time IS NULL THEN
    SELECT m.duration_minutes
      INTO v_duration
    FROM movies m
    WHERE m.movie_id = NEW.movie_id;

    IF v_duration IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid movie reference while deriving show end time.';
    END IF;

    SET NEW.end_time = DATE_ADD(NEW.show_time, INTERVAL v_duration MINUTE);
  END IF;

  IF NEW.end_time <= NEW.show_time THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Show end_time must be after show_time.';
  END IF;

  IF NEW.status = 'SCHEDULED' AND EXISTS (
    SELECT 1
    FROM shows s
    WHERE s.screen_id = NEW.screen_id
      AND s.status = 'SCHEDULED'
      AND s.show_id <> OLD.show_id
      AND NEW.show_time < s.end_time
      AND NEW.end_time > s.show_time
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Updated show timing overlaps with an existing scheduled show on the same screen.';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_booking_seats_validate_bi$$
CREATE TRIGGER trg_booking_seats_validate_bi
BEFORE INSERT ON booking_seats
FOR EACH ROW
BEGIN
  DECLARE v_booking_show_id BIGINT UNSIGNED;
  DECLARE v_booking_status VARCHAR(20);
  DECLARE v_show_screen_id BIGINT UNSIGNED;
  DECLARE v_seat_screen_id BIGINT UNSIGNED;

  SELECT b.show_id, b.status
    INTO v_booking_show_id, v_booking_status
  FROM bookings b
  WHERE b.booking_id = NEW.booking_id;

  IF v_booking_show_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Booking does not exist for the provided booking_id.';
  END IF;

  IF NEW.show_id <> v_booking_show_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'booking_seats.show_id must match bookings.show_id.';
  END IF;

  IF v_booking_status NOT IN ('PENDING', 'CONFIRMED') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Seat assignment is allowed only for PENDING or CONFIRMED bookings.';
  END IF;

  SELECT s.screen_id
    INTO v_show_screen_id
  FROM shows s
  WHERE s.show_id = NEW.show_id;

  SELECT st.screen_id
    INTO v_seat_screen_id
  FROM seats st
  WHERE st.seat_id = NEW.seat_id;

  IF v_show_screen_id IS NULL OR v_seat_screen_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid show or seat reference during seat assignment.';
  END IF;

  IF v_show_screen_id <> v_seat_screen_id THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Selected seat does not belong to the screen assigned to this show.';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_bookings_set_cancelled_time_bu$$
CREATE TRIGGER trg_bookings_set_cancelled_time_bu
BEFORE UPDATE ON bookings
FOR EACH ROW
BEGIN
  IF NEW.status = 'CANCELLED' AND OLD.status <> 'CANCELLED' AND NEW.cancelled_time IS NULL THEN
    SET NEW.cancelled_time = NOW();
  END IF;
END$$

DELIMITER ;
