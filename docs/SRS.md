# Software Requirements Specification (SRS)
## Movie Ticket Booking System

**Version:** 2.0
**Date:** March 20, 2026
**Prepared by:** Development Team

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Features](#3-system-features)
4. [External Interface Requirements](#4-external-interface-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Database Requirements](#6-database-requirements)
7. [Advanced Database Features](#7-advanced-database-features)
8. [Appendix](#8-appendix)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) document defines the functional and non-functional requirements for a Movie Ticket Booking System. The system is designed as a **backend-centric application** with MySQL as the core database, focusing on:
- Movie listings and show management
- Theatre and screen management
- Real-time seat booking and availability tracking
- Payment processing and booking records
- Robust relational database with optimized queries

### 1.2 Scope
The Movie Ticket Booking System will:
- Allow users to browse movies and show timings
- Enable seat selection and booking with real-time availability
- Maintain booking history and transaction records
- Provide admin capabilities for theatre management
- Ensure data integrity through proper database design
- Prevent double-booking through transaction control

**Frontend:** Minimal (simple web interface)
**Backend:** MySQL-driven with strong emphasis on database design and optimization

### 1.3 Definitions, Acronyms, and Abbreviations
- **SRS:** Software Requirements Specification
- **DBMS:** Database Management System
- **CRUD:** Create, Read, Update, Delete
- **FK:** Foreign Key
- **PK:** Primary Key
- **3NF:** Third Normal Form
- **ACID:** Atomicity, Consistency, Isolation, Durability

### 1.4 References
- MySQL Documentation: https://dev.mysql.com/doc/
- Database Normalization Standards
- ACID Transaction Properties

### 1.5 Overview
The remainder of this document describes the system requirements in detail, including functional requirements, data requirements, and design constraints.

---

## 2. Overall Description

### 2.1 Product Perspective
This is a standalone database-centric booking system designed to manage:
- Movie catalog and scheduling
- Theatre infrastructure (theatres, screens, seats)
- User bookings and payments
- Real-time seat availability

The system emphasizes:
- Strong data integrity through relational design
- Concurrent booking handling
- Query optimization for performance

### 2.2 Product Functions
**User Functions:**
- User registration and authentication
- Browse movies and show timings
- View seat availability in real-time
- Select and book multiple seats
- Make payments
- View booking history
- Cancel bookings (where applicable)

**Admin Functions:**
- Add, update, and delete movies
- Manage theatres and screens
- Configure seat layouts
- Schedule shows
- Monitor bookings and system usage
- Generate reports

### 2.3 User Classes and Characteristics
**End Users (Customers):**
- Primary users who book tickets
- Need simple interface to browse and book
- Expect real-time seat availability
- Require secure payment processing

**Administrators:**
- Manage the entire system
- Configure movies, theatres, shows
- Monitor system performance
- Generate business reports

**Database Administrators:**
- Maintain database health
- Optimize queries and indexes
- Ensure data backup and recovery
- Monitor concurrent access

### 2.4 Operating Environment
- **Database:** MySQL 8.0 or higher
- **Server OS:** Linux/Windows
- **Backend Runtime:** Node.js/Python/Java (to be implemented)
- **Client Interface:** Web browser or CLI

### 2.5 Design and Implementation Constraints
- Must use MySQL as the database
- Must maintain normalization (3NF)
- Must prevent double-booking through transactions
- Schema changes require migration planning
- Must support concurrent users

### 2.6 Assumptions and Dependencies
- Users have stable internet connection
- MySQL database is properly configured
- Adequate server resources for concurrent operations
- Payment gateway integration (external dependency)

---

## 3. System Features

### 3.1 User Management

#### 3.1.1 User Registration
**Priority:** High
**Description:** Users can create accounts with email and password.

**Functional Requirements:**
- FR-UM-01: System shall store user name, email, and hashed password
- FR-UM-02: Email must be unique across all users
- FR-UM-03: Passwords must be hashed using industry-standard algorithm
- FR-UM-04: System shall assign default role 'USER' to new registrations
- FR-UM-05: Admins can only be created through database-level operations

#### 3.1.2 User Authentication
**Priority:** High
**Description:** Users can log in using their credentials.

**Functional Requirements:**
- FR-UA-01: System shall verify email and password combination
- FR-UA-02: System shall maintain session state after login
- FR-UA-03: System shall provide role-based access control
- FR-UA-04: Failed login attempts shall be logged

### 3.2 Movie Management

#### 3.2.1 Movie Catalog
**Priority:** High
**Description:** System maintains a catalog of movies with details.

**Functional Requirements:**
- FR-MC-01: System shall store movie title, genre, duration, language, release date
- FR-MC-02: Admins can add new movies to the catalog
- FR-MC-03: Admins can update movie details
- FR-MC-04: Admins can remove movies (with constraint checks)
- FR-MC-05: Users can browse available movies
- FR-MC-06: Users can search movies by title, genre, or language

### 3.3 Theatre Management

#### 3.3.1 Theatre Configuration
**Priority:** High
**Description:** System manages theatre locations and screens.

**Functional Requirements:**
- FR-TC-01: System shall store theatre name and location
- FR-TC-02: Each theatre can have multiple screens
- FR-TC-03: Admins can add, update, or remove theatres
- FR-TC-04: Removing a theatre requires handling dependent screens

#### 3.3.2 Screen and Seat Configuration
**Priority:** High
**Description:** System configures screens and their seat layouts.

**Functional Requirements:**
- FR-SS-01: Each screen belongs to exactly one theatre
- FR-SS-02: Each screen has a unique screen number within its theatre
- FR-SS-03: Each screen has multiple seats with unique seat numbers
- FR-SS-04: Seats have types (REGULAR, VIP) affecting pricing
- FR-SS-05: Seat numbers must be unique within a screen
- FR-SS-06: Admins can configure seat layouts

### 3.4 Show Scheduling

#### 3.4.1 Show Management
**Priority:** High
**Description:** System schedules movie shows in screens.

**Functional Requirements:**
- FR-SM-01: Each show associates a movie with a screen and time
- FR-SM-02: Show includes base price information
- FR-SM-03: Multiple shows can be scheduled for same movie
- FR-SM-04: Shows cannot overlap in the same screen (business rule)
- FR-SM-05: Admins can create, update, or cancel shows
- FR-SM-06: Users can view shows by movie, theatre, or date

### 3.5 Seat Booking

#### 3.5.1 Seat Availability
**Priority:** Critical
**Description:** System provides real-time seat availability for shows.

**Functional Requirements:**
- FR-SA-01: System shall show available seats for selected show
- FR-SA-02: Booked seats shall be marked unavailable
- FR-SA-03: Cancelled booking seats shall become available again
- FR-SA-04: System shall refresh availability in real-time
- FR-SA-05: Availability check must consider seat lock during booking process

#### 3.5.2 Booking Process
**Priority:** Critical
**Description:** Users can book multiple seats for a show.

**Functional Requirements:**
- FR-BP-01: Users can select multiple seats in single booking
- FR-BP-02: System shall lock selected seats during booking transaction
- FR-BP-03: System shall prevent double-booking using database transactions
- FR-BP-04: Booking creates a record with user, show, and timestamp
- FR-BP-05: System calculates total amount based on seat types and show price
- FR-BP-06: Booking status shall be tracked (CONFIRMED, CANCELLED)
- FR-BP-07: Failed payment shall rollback the entire booking transaction

#### 3.5.3 Booking Management
**Priority:** High
**Description:** Users can view and manage their bookings.

**Functional Requirements:**
- FR-BM-01: Users can view their booking history
- FR-BM-02: Users can view booking details (show, seats, amount)
- FR-BM-03: Users can cancel bookings (if allowed by business rules)
- FR-BM-04: Cancelled bookings shall update seat availability

### 3.6 Payment Processing

#### 3.6.1 Payment Recording
**Priority:** High
**Description:** System records payment transactions.

**Functional Requirements:**
- FR-PR-01: Each booking must have associated payment record
- FR-PR-02: Payment stores amount, method, and status
- FR-PR-03: Payment status can be SUCCESS or FAILED
- FR-PR-04: Failed payments shall prevent booking confirmation
- FR-PR-05: Payment records are immutable after creation

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- **Minimal UI:** Simple web interface or CLI for user interactions
- **Clear error messages:** Display validation and system errors
- **Responsive design:** Basic responsive layout (if web-based)

### 4.2 Hardware Interfaces
- Standard server hardware capable of running MySQL
- Adequate storage for database growth
- Network connectivity for multi-user access

### 4.3 Software Interfaces
- **MySQL Database:** Version 8.0 or higher
- **Backend Framework:** To be determined (Node.js/Python/Java)
- **Payment Gateway:** External API integration (future)

### 4.4 Communications Interfaces
- HTTP/HTTPS for client-server communication
- TCP/IP for database connections
- Secure connections for payment processing

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements
- **Response Time:** Database queries shall complete within 200ms for typical operations
- **Throughput:** Support minimum 100 concurrent users
- **Seat Availability:** Real-time updates with < 1 second latency
- **Transaction Time:** Booking transaction shall complete within 3 seconds

### 5.2 Safety Requirements
- **Data Backup:** Daily automated backups
- **Transaction Rollback:** Failed operations shall not leave partial data
- **Error Logging:** All errors shall be logged for debugging

### 5.3 Security Requirements
- **Password Security:** Passwords must be hashed using bcrypt or similar
- **SQL Injection Prevention:** All queries must use parameterized statements
- **Authentication:** Session-based or token-based authentication required
- **Authorization:** Role-based access control (USER vs ADMIN)
- **Data Privacy:** User information must be protected

### 5.4 Software Quality Attributes

#### 5.4.1 Reliability
- **Availability:** 99% uptime target
- **ACID Compliance:** All critical transactions must be ACID-compliant
- **Data Integrity:** Foreign key constraints must be enforced

#### 5.4.2 Maintainability
- **Schema Documentation:** All tables and relationships documented
- **Code Comments:** Complex queries shall include explanatory comments
- **Modular Design:** Database schema follows normalization principles

#### 5.4.3 Scalability
- **Database Design:** Normalized schema (3NF) to support growth
- **Indexing Strategy:** Proper indexes on frequently queried columns
- **Partitioning Ready:** Schema designed to support future partitioning

#### 5.4.4 Usability
- **Clear Error Messages:** User-friendly error messages
- **Intuitive Flow:** Simple booking process
- **Help Documentation:** Basic user guide available

---

## 6. Database Requirements

### 6.1 Data Model

#### 6.1.1 Core Entities
1. **Users** - User accounts and authentication
2. **Movies** - Movie catalog
3. **Theatres** - Cinema locations
4. **Screens** - Screening rooms within theatres
5. **Seats** - Individual seats in screens
6. **Shows** - Movie screenings with timing
7. **Bookings** - Ticket booking records
8. **Booking_Seats** - Junction table for bookings and seats
9. **Payments** - Payment transaction records

#### 6.1.2 Relationships
- Users 1:N Bookings
- Movies 1:N Shows
- Theatres 1:N Screens
- Screens 1:N Seats
- Screens 1:N Shows
- Shows 1:N Bookings
- Bookings M:N Seats (via Booking_Seats)
- Bookings 1:N Payments

### 6.2 Data Integrity Constraints
- **Primary Keys:** All tables must have primary keys
- **Foreign Keys:** All relationships must use foreign key constraints
- **Unique Constraints:** Email (Users), seat_number per screen (Seats)
- **Check Constraints:** ENUM types for status fields
- **NOT NULL:** Critical fields must not allow NULL values

### 6.3 Transaction Requirements
- **Booking Transaction:** Must be atomic (all or nothing)
- **Isolation Level:** REPEATABLE READ or SERIALIZABLE for bookings
- **Lock Strategy:** SELECT ... FOR UPDATE for seat selection
- **Deadlock Handling:** Proper deadlock detection and retry logic

### 6.4 Indexing Requirements
- Index on Shows(movie_id)
- Index on Shows(show_time)
- Index on Bookings(user_id)
- Index on Bookings(show_id)
- Index on Booking_Seats(seat_id)
- Composite index on Screens(theatre_id, screen_number)

### 6.5 Normalization
- All tables must be in Third Normal Form (3NF)
- No transitive dependencies
- No partial dependencies
- Atomic values only

---

## 7. Advanced Database Features

### 7.1 Views for Performance Optimization

**vw_available_seats**
- Real-time view of available seats per show
- Excludes CONFIRMED bookings automatically
- Used by API endpoints to avoid N+1 queries

**vw_booking_summary**
- Complete booking details with all nested information
- Includes theatre, screen, movie, and seat details
- Optimized for booking history queries

**vw_show_occupancy**
- Admin reporting view showing seat utilization
- Displays available vs booked count per show
- Used for occupancy analytics

### 7.2 Database Audit Logging

**Audit_Bookings Table**
- Immutable log of all booking state changes
- Tracks: user_id, booking_id, action (CREATE/UPDATE/CANCEL), change_details, timestamp
- Used for compliance and dispute resolution

### 7.3 Soft Deletes Strategy

Instead of hard deletes, use `is_deleted` flag on:
- **Bookings:** Allows audit trail preservation
- **Shows:** Prevents loss of historical data
- **Movies:** Maintains referential integrity

Example: `WHERE is_deleted = FALSE` in all queries

### 7.4 Stored Procedures (Phase 2)

**sp_book_tickets(user_id, show_id, seat_ids, payment_method)**
- Atomic transaction handling
- Validates seat availability
- Prevents double-booking with SELECT FOR UPDATE
- Returns booking_id on success or error code on failure

**sp_cancel_booking(booking_id, user_id)**
- User authorization validation
- Updates booking status to CANCELLED
- Creates audit log entry
- Seat availability recalculation

**sp_get_available_seats(show_id)**
- Optimized single query avoiding N+1 patterns
- Returns complete seat details with availability

### 7.5 Database Triggers (Phase 2)

**trg_seat_availability_cache**
- Auto-updates cached seat count on booking status change
- Improves performance of availability checks

**trg_audit_booking_changes**
- Logs all booking state changes to Audit_Bookings
- Maintains non-reputable audit trail

### 7.6 Database Partitioning (Scaling Phase)

For datasets exceeding 1M records:
- Partition Bookings by booking_time (monthly or quarterly)
- Partition Booking_Seats by booking_id
- Improves query performance on historical data
- Simplifies backup/restore operations

---

## 8. Appendix

### 7.1 Sample Database Schema

```sql
-- Users Table
CREATE TABLE Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('USER', 'ADMIN') DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Movies Table
CREATE TABLE Movies (
    movie_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    genre VARCHAR(50),
    duration INT NOT NULL,
    language VARCHAR(50),
    release_date DATE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_deleted (is_deleted)
);

-- Theatres Table
CREATE TABLE Theatres (
    theatre_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Screens Table
CREATE TABLE Screens (
    screen_id INT PRIMARY KEY AUTO_INCREMENT,
    theatre_id INT NOT NULL,
    screen_number INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (theatre_id) REFERENCES Theatres(theatre_id) ON DELETE CASCADE,
    UNIQUE(theatre_id, screen_number)
);

-- Seats Table
CREATE TABLE Seats (
    seat_id INT PRIMARY KEY AUTO_INCREMENT,
    screen_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    seat_type ENUM('REGULAR', 'VIP') DEFAULT 'REGULAR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (screen_id) REFERENCES Screens(screen_id) ON DELETE CASCADE,
    UNIQUE(screen_id, seat_number)
);

-- Shows Table
CREATE TABLE Shows (
    show_id INT PRIMARY KEY AUTO_INCREMENT,
    movie_id INT NOT NULL,
    screen_id INT NOT NULL,
    show_time DATETIME NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (screen_id) REFERENCES Screens(screen_id) ON DELETE CASCADE,
    INDEX idx_movie (movie_id),
    INDEX idx_show_time (show_time),
    INDEX idx_deleted (is_deleted)
);

-- Bookings Table
CREATE TABLE Bookings (
    booking_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    show_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('CONFIRMED', 'CANCELLED') DEFAULT 'CONFIRMED',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (show_id) REFERENCES Shows(show_id),
    INDEX idx_user (user_id),
    INDEX idx_show (show_id),
    INDEX idx_status (status),
    INDEX idx_deleted (is_deleted)
);

-- Booking_Seats Junction Table
CREATE TABLE Booking_Seats (
    booking_id INT NOT NULL,
    seat_id INT NOT NULL,
    PRIMARY KEY (booking_id, seat_id),
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES Seats(seat_id),
    INDEX idx_seat (seat_id)
);

-- Payments Table
CREATE TABLE Payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status ENUM('SUCCESS', 'FAILED') DEFAULT 'SUCCESS',
    payment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id)
);

-- Audit_Bookings Table (Immutable Audit Log)
CREATE TABLE Audit_Bookings (
    audit_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    change_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_booking (booking_id),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
);
```

### 8.2 Sample Queries

**Available Seats for a Show (with soft deletes):**
```sql
SELECT s.seat_id, s.seat_number, s.seat_type
FROM Seats s
WHERE s.screen_id = (SELECT screen_id FROM Shows WHERE show_id = ? AND is_deleted = FALSE)
AND s.seat_id NOT IN (
    SELECT bs.seat_id
    FROM Booking_Seats bs
    JOIN Bookings b ON bs.booking_id = b.booking_id
    WHERE b.show_id = ? AND b.status = 'CONFIRMED' AND b.is_deleted = FALSE
);
```

**User Booking History (with soft deletes and updated fields):**
```sql
SELECT
    b.booking_id,
    m.title,
    t.name AS theatre_name,
    sh.show_time,
    b.total_amount,
    b.status,
    b.created_at,
    b.updated_at
FROM Bookings b
JOIN Shows sh ON b.show_id = sh.show_id
JOIN Movies m ON sh.movie_id = m.movie_id
JOIN Screens sc ON sh.screen_id = sc.screen_id
JOIN Theatres t ON sc.theatre_id = t.theatre_id
WHERE b.user_id = ? AND b.is_deleted = FALSE
ORDER BY b.created_at DESC;
```

**Booking Audit Trail:**
```sql
SELECT
    audit_id,
    action,
    old_status,
    new_status,
    change_details,
    created_at
FROM Audit_Bookings
WHERE booking_id = ?
ORDER BY created_at DESC;
```
```

### 8.3 Glossary
- **Show:** A scheduled screening of a movie at a specific time
- **Booking:** A reservation of seats for a show
- **Seat Type:** Classification of seats (REGULAR, VIP) affecting pricing
- **Transaction:** ACID-compliant database operation
- **Double Booking:** Scenario where same seat is booked by multiple users (to be prevented)

---

**Document History:**
- Version 2.0 - Advanced features (Views, Audit logging, Soft deletes, Timestamps, Partitioning) - March 20, 2026
- Version 1.0 - Initial release - March 20, 2026
