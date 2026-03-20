-- ============================================================================
-- Movie Ticket Booking System - Database Initialization Script
-- File: init_database.sql
-- Purpose: Complete database setup - creates database and runs all schema files
-- Version: 2.0
-- Date: 2026-03-20
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Database
-- ============================================================================

-- Drop existing database (CAUTION: This deletes all data!)
-- Comment out in production
DROP DATABASE IF EXISTS movie_booking_db;

-- Create new database
CREATE DATABASE movie_booking_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- Use the database
USE movie_booking_db;

-- ============================================================================
-- STEP 2: Create Tables
-- ============================================================================

-- Users Table
CREATE TABLE Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    role ENUM('USER', 'ADMIN') DEFAULT 'USER' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User accounts with role-based access control';

-- Movies Table
CREATE TABLE Movies (
    movie_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    genre VARCHAR(50),
    duration INT NOT NULL COMMENT 'Duration in minutes',
    language VARCHAR(50),
    release_date DATE,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Movie catalog with soft delete functionality';

-- Theatres Table
CREATE TABLE Theatres (
    theatre_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Theatre locations and cinema halls';

-- Screens Table
CREATE TABLE Screens (
    screen_id INT PRIMARY KEY AUTO_INCREMENT,
    theatre_id INT NOT NULL,
    screen_number INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (theatre_id) REFERENCES Theatres(theatre_id) ON DELETE CASCADE,
    UNIQUE KEY uk_theatre_screen (theatre_id, screen_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Screens within theatres';

-- Seats Table
CREATE TABLE Seats (
    seat_id INT PRIMARY KEY AUTO_INCREMENT,
    screen_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    seat_type ENUM('REGULAR', 'VIP') DEFAULT 'REGULAR' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (screen_id) REFERENCES Screens(screen_id) ON DELETE CASCADE,
    UNIQUE KEY uk_screen_seat (screen_id, seat_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Individual seats with unique seat numbers per screen';

-- Shows Table
CREATE TABLE Shows (
    show_id INT PRIMARY KEY AUTO_INCREMENT,
    movie_id INT NOT NULL,
    screen_id INT NOT NULL,
    show_time DATETIME NOT NULL,
    price DECIMAL(10,2) NOT NULL COMMENT 'Base price for the show',
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (screen_id) REFERENCES Screens(screen_id) ON DELETE CASCADE,
    INDEX idx_movie (movie_id),
    INDEX idx_show_time (show_time),
    INDEX idx_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Movie shows with scheduling and pricing information';

-- Bookings Table
CREATE TABLE Bookings (
    booking_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    show_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('CONFIRMED', 'CANCELLED') DEFAULT 'CONFIRMED' NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (show_id) REFERENCES Shows(show_id),
    INDEX idx_user (user_id),
    INDEX idx_show (show_id),
    INDEX idx_status (status),
    INDEX idx_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Booking records with status tracking';

-- Booking_Seats Junction Table
CREATE TABLE Booking_Seats (
    booking_id INT NOT NULL,
    seat_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (booking_id, seat_id),
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES Seats(seat_id),
    INDEX idx_seat (seat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Junction table linking bookings to seats';

-- Payments Table
CREATE TABLE Payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status ENUM('SUCCESS', 'FAILED') DEFAULT 'SUCCESS' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Payment transaction records';

-- Audit_Bookings Table
CREATE TABLE Audit_Bookings (
    audit_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    user_id INT,
    action VARCHAR(50) NOT NULL COMMENT 'Action type: CREATE, UPDATE, CANCEL',
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    change_details JSON COMMENT 'Detailed change information in JSON format',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_booking (booking_id),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Immutable audit log tracking all booking state changes';

-- ============================================================================
-- STEP 3: Create Additional Indexes
-- ============================================================================

CREATE INDEX idx_bookings_show_status ON Bookings(show_id, status);
CREATE INDEX idx_bookings_user_status ON Bookings(user_id, status);
CREATE INDEX idx_bookings_show_deleted ON Bookings(show_id, is_deleted);
CREATE INDEX idx_movies_deleted_created ON Movies(is_deleted, created_at);
CREATE INDEX idx_shows_deleted_time ON Shows(is_deleted, show_time);
CREATE INDEX idx_screens_theatre_number ON Screens(theatre_id, screen_number);
CREATE INDEX idx_seats_screen_type ON Seats(screen_id, seat_type);
CREATE INDEX idx_shows_screen ON Shows(screen_id);
CREATE INDEX idx_payments_booking ON Payments(booking_id);
CREATE INDEX idx_payments_status ON Payments(payment_status);
CREATE INDEX idx_audit_booking_created ON Audit_Bookings(booking_id, created_at);

-- ============================================================================
-- STEP 4: Create CHECK Constraints
-- ============================================================================

ALTER TABLE Movies ADD CONSTRAINT chk_movie_duration CHECK (duration > 0 AND duration <= 600);
ALTER TABLE Movies ADD CONSTRAINT chk_movie_title CHECK (LENGTH(TRIM(title)) > 0);
ALTER TABLE Shows ADD CONSTRAINT chk_show_price CHECK (price >= 0 AND price <= 10000);
ALTER TABLE Shows ADD CONSTRAINT chk_show_time CHECK (show_time > '2000-01-01');
ALTER TABLE Bookings ADD CONSTRAINT chk_booking_amount CHECK (total_amount >= 0 AND total_amount <= 100000);
ALTER TABLE Payments ADD CONSTRAINT chk_payment_amount CHECK (amount >= 0 AND amount <= 100000);
ALTER TABLE Seats ADD CONSTRAINT chk_seat_number CHECK (LENGTH(TRIM(seat_number)) > 0);
ALTER TABLE Screens ADD CONSTRAINT chk_screen_number CHECK (screen_number > 0 AND screen_number <= 100);
ALTER TABLE Users ADD CONSTRAINT chk_user_name CHECK (LENGTH(TRIM(name)) > 0);
ALTER TABLE Users ADD CONSTRAINT chk_user_email CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');
ALTER TABLE Theatres ADD CONSTRAINT chk_theatre_name CHECK (LENGTH(TRIM(name)) > 0);
ALTER TABLE Theatres ADD CONSTRAINT chk_theatre_location CHECK (LENGTH(TRIM(location)) > 0);

-- ============================================================================
-- STEP 5: Create Triggers
-- ============================================================================

DELIMITER $$

CREATE TRIGGER trg_prevent_reconfirm_cancelled_booking
BEFORE UPDATE ON Bookings
FOR EACH ROW
BEGIN
    IF OLD.status = 'CANCELLED' AND NEW.status = 'CONFIRMED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot reconfirm a cancelled booking';
    END IF;
END$$

CREATE TRIGGER trg_validate_payment_amount
BEFORE INSERT ON Payments
FOR EACH ROW
BEGIN
    DECLARE booking_total DECIMAL(10,2);
    SELECT total_amount INTO booking_total FROM Bookings WHERE booking_id = NEW.booking_id;
    IF NEW.amount != booking_total THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment amount must match booking total amount';
    END IF;
END$$

CREATE TRIGGER trg_audit_booking_update
AFTER UPDATE ON Bookings
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status OR OLD.is_deleted != NEW.is_deleted THEN
        INSERT INTO Audit_Bookings (booking_id, user_id, action, old_status, new_status, change_details, created_at)
        VALUES (NEW.booking_id, NEW.user_id, 'UPDATE', OLD.status, NEW.status,
                JSON_OBJECT('old_status', OLD.status, 'new_status', NEW.status,
                           'old_is_deleted', OLD.is_deleted, 'new_is_deleted', NEW.is_deleted,
                           'total_amount', NEW.total_amount), CURRENT_TIMESTAMP);
    END IF;
END$$

CREATE TRIGGER trg_audit_booking_insert
AFTER INSERT ON Bookings
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Bookings (booking_id, user_id, action, old_status, new_status, change_details, created_at)
    VALUES (NEW.booking_id, NEW.user_id, 'CREATE', NULL, NEW.status,
            JSON_OBJECT('show_id', NEW.show_id, 'total_amount', NEW.total_amount, 'status', NEW.status),
            CURRENT_TIMESTAMP);
END$$

CREATE TRIGGER trg_prevent_deleted_booking_update
BEFORE UPDATE ON Bookings
FOR EACH ROW
BEGIN
    IF OLD.is_deleted = TRUE AND NEW.is_deleted = TRUE THEN
        IF OLD.status != NEW.status OR OLD.total_amount != NEW.total_amount THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot modify a soft-deleted booking';
        END IF;
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- Database initialization complete!
-- ============================================================================

SELECT 'Database movie_booking_db created successfully!' AS Status;
