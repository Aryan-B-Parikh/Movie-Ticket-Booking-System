-- Movie Ticket Booking System
-- Core schema (MySQL 8.0+, InnoDB)

CREATE DATABASE IF NOT EXISTS movie_ticket_booking
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE movie_ticket_booking;

CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movies (
  movie_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  genre VARCHAR(80) NOT NULL,
  language VARCHAR(50) NOT NULL DEFAULT 'English',
  certificate VARCHAR(10) DEFAULT NULL,
  release_date DATE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (movie_id),
  CONSTRAINT chk_movies_duration CHECK (duration_minutes BETWEEN 30 AND 400)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS theaters (
  theater_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  location VARCHAR(200) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (theater_id),
  UNIQUE KEY uq_theaters_name_location (name, location)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS screens (
  screen_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  theater_id BIGINT UNSIGNED NOT NULL,
  screen_name VARCHAR(60) NOT NULL,
  capacity SMALLINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (screen_id),
  UNIQUE KEY uq_screens_name_per_theater (theater_id, screen_name),
  CONSTRAINT fk_screens_theater
    FOREIGN KEY (theater_id) REFERENCES theaters(theater_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT chk_screens_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seats (
  seat_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  screen_id BIGINT UNSIGNED NOT NULL,
  seat_number VARCHAR(10) NOT NULL,
  seat_type ENUM('REGULAR', 'PREMIUM', 'RECLINER') NOT NULL DEFAULT 'REGULAR',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (seat_id),
  UNIQUE KEY uq_seats_per_screen (screen_id, seat_number),
  CONSTRAINT fk_seats_screen
    FOREIGN KEY (screen_id) REFERENCES screens(screen_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shows (
  show_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  movie_id BIGINT UNSIGNED NOT NULL,
  screen_id BIGINT UNSIGNED NOT NULL,
  show_time DATETIME NOT NULL,
  end_time DATETIME DEFAULT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  status ENUM('SCHEDULED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (show_id),
  UNIQUE KEY uq_shows_screen_start (screen_id, show_time),
  CONSTRAINT fk_shows_movie
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_shows_screen
    FOREIGN KEY (screen_id) REFERENCES screens(screen_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_shows_price CHECK (base_price > 0),
  CONSTRAINT chk_shows_time_order CHECK (end_time IS NULL OR end_time > show_time)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  booking_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  show_id BIGINT UNSIGNED NOT NULL,
  booking_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  seat_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  cancelled_time DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (booking_id),
  KEY idx_bookings_user (user_id),
  KEY idx_bookings_show (show_id),
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_show
    FOREIGN KEY (show_id) REFERENCES shows(show_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_bookings_total CHECK (total_amount >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_seats (
  booking_id BIGINT UNSIGNED NOT NULL,
  show_id BIGINT UNSIGNED NOT NULL,
  seat_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (booking_id, seat_id),
  UNIQUE KEY uq_booking_seats_show_seat (show_id, seat_id),
  KEY idx_booking_seats_show_booking (show_id, booking_id),
  CONSTRAINT fk_booking_seats_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_booking_seats_show
    FOREIGN KEY (show_id) REFERENCES shows(show_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_booking_seats_seat
    FOREIGN KEY (seat_id) REFERENCES seats(seat_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  payment_method ENUM('UPI', 'CARD', 'NETBANKING', 'WALLET', 'CASH') DEFAULT NULL,
  transaction_ref VARCHAR(120) DEFAULT NULL,
  payment_time DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY uq_payments_booking (booking_id),
  UNIQUE KEY uq_payments_txn_ref (transaction_ref),
  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT chk_payments_amount CHECK (amount > 0)
) ENGINE=InnoDB;

-- Availability view reused by the API (indexes intentionally omitted for the demo)
CREATE OR REPLACE VIEW v_show_seat_availability AS
SELECT
  sh.show_id,
  sh.show_time,
  sh.end_time,
  se.seat_id,
  se.seat_number,
  se.seat_type,
  CASE
    WHEN b.booking_id IS NULL THEN 'AVAILABLE'
    ELSE 'BOOKED'
  END AS availability
FROM shows sh
INNER JOIN seats se
  ON se.screen_id = sh.screen_id
LEFT JOIN booking_seats bs
  ON bs.show_id = sh.show_id
 AND bs.seat_id = se.seat_id
LEFT JOIN bookings b
  ON b.booking_id = bs.booking_id
 AND b.status IN ('PENDING', 'CONFIRMED')
WHERE sh.status = 'SCHEDULED';
