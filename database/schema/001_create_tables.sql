-- ============================================================================
-- Movie Ticket Booking System - Database Schema
-- File: 001_create_tables.sql
-- Purpose: Create all core tables with proper constraints and relationships
-- Version: 2.0
-- Date: 2026-03-20
-- ============================================================================

-- Drop existing tables in reverse dependency order (for clean re-creation)
DROP TABLE IF EXISTS Audit_Bookings;
DROP TABLE IF EXISTS Payments;
DROP TABLE IF EXISTS Booking_Seats;
DROP TABLE IF EXISTS Bookings;
DROP TABLE IF EXISTS Shows;
DROP TABLE IF EXISTS Seats;
DROP TABLE IF EXISTS Screens;
DROP TABLE IF EXISTS Theatres;
DROP TABLE IF EXISTS Movies;
DROP TABLE IF EXISTS Users;

-- ============================================================================
-- TABLE: Users
-- Description: Stores user accounts for customers and administrators
-- Relationships: 1:N with Bookings
-- ============================================================================
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

-- ============================================================================
-- TABLE: Movies
-- Description: Movie catalog with details and soft delete support
-- Relationships: 1:N with Shows
-- ============================================================================
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

-- ============================================================================
-- TABLE: Theatres
-- Description: Theatre locations/cinema halls
-- Relationships: 1:N with Screens
-- ============================================================================
CREATE TABLE Theatres (
    theatre_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Theatre locations and cinema halls';

-- ============================================================================
-- TABLE: Screens
-- Description: Screening rooms within theatres
-- Relationships: N:1 with Theatres, 1:N with Seats, 1:N with Shows
-- ============================================================================
CREATE TABLE Screens (
    screen_id INT PRIMARY KEY AUTO_INCREMENT,
    theatre_id INT NOT NULL,
    screen_number INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (theatre_id) REFERENCES Theatres(theatre_id) ON DELETE CASCADE,
    UNIQUE KEY uk_theatre_screen (theatre_id, screen_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Screens within theatres - each screen has unique number per theatre';

-- ============================================================================
-- TABLE: Seats
-- Description: Individual seats in screens with type categorization
-- Relationships: N:1 with Screens, M:N with Bookings (via Booking_Seats)
-- ============================================================================
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

-- ============================================================================
-- TABLE: Shows
-- Description: Movie screenings scheduled in screens with pricing
-- Relationships: N:1 with Movies, N:1 with Screens, 1:N with Bookings
-- ============================================================================
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

-- ============================================================================
-- TABLE: Bookings
-- Description: Ticket booking records with status tracking and soft delete
-- Relationships: N:1 with Users, N:1 with Shows, M:N with Seats (via Booking_Seats), 1:N with Payments
-- CRITICAL: Used in transaction control for preventing double-booking
-- ============================================================================
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
COMMENT='Booking records with status tracking - CRITICAL for transaction control';

-- ============================================================================
-- TABLE: Booking_Seats
-- Description: Junction table for many-to-many relationship between Bookings and Seats
-- Relationships: N:1 with Bookings, N:1 with Seats
-- CRITICAL: Core of seat reservation system
-- ============================================================================
CREATE TABLE Booking_Seats (
    booking_id INT NOT NULL,
    seat_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (booking_id, seat_id),
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES Seats(seat_id),
    INDEX idx_seat (seat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Junction table linking bookings to seats - prevents double booking';

-- ============================================================================
-- TABLE: Payments
-- Description: Payment transaction records (immutable after creation)
-- Relationships: N:1 with Bookings
-- ============================================================================
CREATE TABLE Payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status ENUM('SUCCESS', 'FAILED') DEFAULT 'SUCCESS' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Payment transaction records - immutable audit trail';

-- ============================================================================
-- TABLE: Audit_Bookings
-- Description: Immutable audit log for all booking state changes
-- Purpose: Compliance, dispute resolution, and tracking booking lifecycle
-- ============================================================================
CREATE TABLE Audit_Bookings (
    audit_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    user_id INT,
    action VARCHAR(50) NOT NULL COMMENT 'Action type: CREATE, UPDATE, CANCEL, etc.',
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
-- End of table creation
-- ============================================================================
