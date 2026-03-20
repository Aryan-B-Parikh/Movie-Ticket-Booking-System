# Data Dictionary
## Movie Ticket Booking System

**Version:** 1.0
**Date:** March 20, 2026
**Database:** MySQL 8.0+
**Schema Normalization:** Third Normal Form (3NF)

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Database Overview](#2-database-overview)
3. [Table Summaries](#3-table-summaries)
4. [Detailed Table Documentation](#4-detailed-table-documentation)
5. [Entity Relationships](#5-entity-relationships)
6. [Constraints and Rules Reference](#6-constraints-and-rules-reference)
7. [Data Types Reference](#7-data-types-reference)
8. [Indexes Reference](#8-indexes-reference)
9. [Business Rules](#9-business-rules)

---

## 1. Introduction

### 1.1 Purpose
This Data Dictionary provides comprehensive documentation for all database objects in the Movie Ticket Booking System. It serves as the authoritative reference for database structure, relationships, constraints, and business rules.

### 1.2 Audience
- **Database Administrators** - Schema maintenance and optimization
- **Backend Developers** - Query development and application integration
- **System Architects** - Design decisions and scaling strategies
- **QA Engineers** - Test data preparation and validation

### 1.3 Conventions
- **Table Names:** PascalCase (e.g., `Users`, `Booking_Seats`)
- **Column Names:** snake_case (e.g., `user_id`, `created_at`)
- **Primary Keys:** `table_name_id` pattern (e.g., `user_id`, `booking_id`)
- **Foreign Keys:** Reference primary keys using same name
- **Timestamps:** All tables include `created_at`; mutable tables include `updated_at`
- **Soft Deletes:** Boolean `is_deleted` flag where applicable

---

## 2. Database Overview

### 2.1 Design Philosophy
The database follows a **backend-centric, relational-first approach** with emphasis on:
- **Data Integrity:** Foreign key constraints enforce referential integrity
- **Normalization:** All tables in 3NF to eliminate redundancy
- **Concurrency:** Transaction-safe operations prevent race conditions
- **Audit Trail:** Immutable logs track critical state changes
- **Soft Deletes:** Preserve historical data for compliance and analytics

### 2.2 Key Characteristics
- **ACID Compliance:** All transactions follow Atomicity, Consistency, Isolation, Durability
- **Cascade Rules:** Strategic use of CASCADE for hierarchical deletions
- **Index Strategy:** Optimized for frequent query patterns
- **Constraint Enforcement:** Database-level validation ensures data quality
- **Timestamp Tracking:** Automated tracking of creation and modification times

---

## 3. Table Summaries

| # | Table Name | Purpose | Record Type | Relationships |
|---|------------|---------|-------------|---------------|
| 1 | **Users** | User accounts and authentication | Core Entity | Parent to Bookings |
| 2 | **Movies** | Movie catalog and details | Core Entity | Parent to Shows |
| 3 | **Theatres** | Cinema location information | Core Entity | Parent to Screens |
| 4 | **Screens** | Screening rooms within theatres | Core Entity | Parent to Seats, Shows |
| 5 | **Seats** | Individual seat inventory | Core Entity | Linked via Booking_Seats |
| 6 | **Shows** | Movie screenings with timing and pricing | Core Entity | Parent to Bookings |
| 7 | **Bookings** | Ticket reservation records | Transactional | Junction between Users, Shows |
| 8 | **Booking_Seats** | Booking-to-Seat associations | Junction Table | Links Bookings and Seats |
| 9 | **Payments** | Payment transaction records | Transactional | Child of Bookings |
| 10 | **Audit_Bookings** | Immutable audit log for bookings | Audit Log | References Bookings |

**Total Tables:** 10
**Core Entities:** 6
**Transactional Tables:** 2
**Junction Tables:** 1
**Audit Tables:** 1

---

## 4. Detailed Table Documentation

### 4.1 Users Table

**Purpose:** Stores user account information for authentication and authorization.

**Business Context:** Maintains customer and administrator accounts with role-based access control. Supports user authentication and links to booking history.

#### Columns

| Column Name | Data Type | Constraints | Description | Business Rules |
|-------------|-----------|-------------|-------------|----------------|
| `user_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier | System-generated sequential ID |
| `name` | VARCHAR(100) | NOT NULL | User's full name | Required for account creation |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL | User's email address | Must be unique across system; used for login |
| `password_hash` | VARCHAR(255) | NOT NULL | Hashed password | Never store plain text; use bcrypt with salt |
| `role` | ENUM('USER', 'ADMIN') | DEFAULT 'USER' | User role for access control | USER = customer, ADMIN = system administrator |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp | Immutable; set automatically on insert |

#### Constraints

**Primary Key:**
```sql
PRIMARY KEY (user_id)
```
- **Why:** Ensures unique identification of each user account

**Unique Constraint:**
```sql
UNIQUE (email)
```
- **Why:** Prevents duplicate accounts; email used as login identifier

#### Indexes
- **Primary Index:** `user_id` (clustered)
- **Unique Index:** `email` (automatic from UNIQUE constraint)

#### Relationships
- **1:N with Bookings** - One user can have many bookings
- **Referenced by:** Bookings(user_id), Audit_Bookings(user_id)

#### Business Rules
1. Email must be validated format (application layer)
2. Password must meet complexity requirements (min 8 chars)
3. ADMIN role can only be assigned through direct database access
4. User accounts cannot be deleted if active bookings exist (application layer check)

#### Example Data
```sql
INSERT INTO Users (name, email, password_hash, role) VALUES
('John Doe', 'john.doe@example.com', '$2b$10$...', 'USER'),
('Admin User', 'admin@cinema.com', '$2b$10$...', 'ADMIN');
```

---

### 4.2 Movies Table

**Purpose:** Maintains catalog of movies available for screening.

**Business Context:** Central repository for movie information used in show scheduling. Supports soft deletes to preserve historical booking data.

#### Columns

| Column Name | Data Type | Constraints | Description | Business Rules |
|-------------|-----------|-------------|-------------|----------------|
| `movie_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique movie identifier | System-generated sequential ID |
| `title` | VARCHAR(150) | NOT NULL | Movie title | Required; displayed to users |
| `genre` | VARCHAR(50) | NULL | Movie genre category | Optional; used for filtering |
| `duration` | INT | NOT NULL | Movie duration in minutes | Required; used for show scheduling |
| `language` | VARCHAR(50) | NULL | Primary language of movie | Optional; used for filtering |
| `release_date` | DATE | NULL | Official release date | Optional; historical reference |
| `is_deleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag | FALSE = active, TRUE = archived |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Movie added timestamp | Immutable; set automatically |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last modification timestamp | Updates automatically on any change |

#### Constraints

**Primary Key:**
```sql
PRIMARY KEY (movie_id)
```
- **Why:** Ensures unique identification of each movie

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| PRIMARY | `movie_id` | Clustered | Primary key index |
| `idx_deleted` | `is_deleted` | Non-clustered | Filter active movies efficiently |

#### Relationships
- **1:N with Shows** - One movie can have many shows
- **Referenced by:** Shows(movie_id)
- **Cascade Rule:** ON DELETE CASCADE (deleting movie removes all associated shows)

#### Business Rules
1. Duration must be positive integer (checked at application layer)
2. Movies should be soft-deleted, not hard-deleted, to preserve booking history
3. Active shows prevent movie deletion (enforced by foreign key)
4. Genre values should follow controlled vocabulary (application layer)

#### Soft Delete Behavior
```sql
-- Soft delete instead of hard delete
UPDATE Movies SET is_deleted = TRUE WHERE movie_id = 1;

-- Filter in queries
SELECT * FROM Movies WHERE is_deleted = FALSE;
```
- **Why:** Preserves referential integrity for historical bookings

#### Example Data
```sql
INSERT INTO Movies (title, genre, duration, language, release_date) VALUES
('The Matrix', 'Sci-Fi', 136, 'English', '1999-03-31'),
('Inception', 'Thriller', 148, 'English', '2010-07-16');
```

---

### 4.3 Theatres Table

**Purpose:** Stores cinema location information.

**Business Context:** Represents physical cinema locations that contain multiple screens.

#### Columns

| Column Name | Data Type | Constraints | Description | Business Rules |
|-------------|-----------|-------------|-------------|----------------|
| `theatre_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique theatre identifier | System-generated sequential ID |
| `name` | VARCHAR(100) | NOT NULL | Theatre name | Required; displayed to users |
| `location` | VARCHAR(150) | NOT NULL | Physical address or area | Required; used for filtering |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Theatre added timestamp | Immutable; set automatically |

#### Constraints

**Primary Key:**
```sql
PRIMARY KEY (theatre_id)
```
- **Why:** Ensures unique identification of each theatre location

#### Indexes
- **Primary Index:** `theatre_id` (clustered)

#### Relationships
- **1:N with Screens** - One theatre can have many screens
- **Referenced by:** Screens(theatre_id)
- **Cascade Rule:** ON DELETE CASCADE (deleting theatre removes all screens)

#### Business Rules
1. Theatre name + location combination should be unique (application layer)
2. Cannot delete theatre with active screens (enforced by CASCADE)
3. Location should be standardized format (city, area)

#### Example Data
```sql
INSERT INTO Theatres (name, location) VALUES
('PVR Cinemas', 'Delhi - Saket'),
('INOX Megaplex', 'Mumbai - Andheri');
```

---

### 4.4 Screens Table

**Purpose:** Defines screening rooms within theatres.

**Business Context:** Represents individual auditoriums where movies are shown. Each screen has unique seating configuration.

#### Columns

| Column Name | Data Type | Constraints | Description | Business Rules |
|-------------|-----------|-------------|-------------|----------------|
| `screen_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique screen identifier | System-generated sequential ID |
| `theatre_id` | INT | NOT NULL, FOREIGN KEY | Parent theatre reference | Must reference existing theatre |
| `screen_number` | INT | NOT NULL | Screen number within theatre | Sequential numbering (1, 2, 3...) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Screen added timestamp | Immutable; set automatically |

#### Constraints

**Primary Key:**
```sql
PRIMARY KEY (screen_id)
```
- **Why:** Ensures unique identification of each screen

**Foreign Key:**
```sql
FOREIGN KEY (theatre_id) REFERENCES Theatres(theatre_id) ON DELETE CASCADE
```
- **Why:** Enforces referential integrity; screen must belong to valid theatre
- **Cascade Rule:** Deleting theatre automatically deletes all its screens

**Unique Constraint:**
```sql
UNIQUE (theatre_id, screen_number)
```
- **Why:** Prevents duplicate screen numbers within same theatre (e.g., two "Screen 1" in same theatre)

#### Indexes
- **Primary Index:** `screen_id` (clustered)
- **Composite Unique Index:** `(theatre_id, screen_number)` (enforces uniqueness)
- **Foreign Key Index:** `theatre_id` (automatic for FK)

#### Relationships
- **N:1 with Theatres** - Many screens belong to one theatre
- **1:N with Seats** - One screen has many seats
- **1:N with Shows** - One screen hosts many shows
- **Referenced by:** Seats(screen_id), Shows(screen_id)
- **Cascade Rule:** ON DELETE CASCADE (deleting screen removes all seats and shows)

#### Business Rules
1. Screen numbers should start from 1 and be sequential
2. Cannot delete screen with active shows (enforced by FK)
3. Seating capacity defined by related Seats records

#### Example Data
```sql
INSERT INTO Screens (theatre_id, screen_number) VALUES
(1, 1), -- PVR Screen 1
(1, 2), -- PVR Screen 2
(2, 1); -- INOX Screen 1
```

---

### 4.5 Seats Table

**Purpose:** Defines individual seat inventory for each screen.

**Business Context:** Represents physical seats that can be booked. Seat type affects pricing.

#### Columns

| Column Name | Data Type | Constraints | Description | Business Rules |
|-------------|-----------|-------------|-------------|----------------|
| `seat_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique seat identifier | System-generated sequential ID |
| `screen_id` | INT | NOT NULL, FOREIGN KEY | Parent screen reference | Must reference existing screen |
| `seat_number` | VARCHAR(10) | NOT NULL | Seat identifier (e.g., A1, B5) | Alphanumeric format (Row + Number) |
| `seat_type` | ENUM('REGULAR', 'VIP') | DEFAULT 'REGULAR' | Seat category | Affects pricing calculation |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Seat added timestamp | Immutable; set automatically |

#### Constraints

**Primary Key:**
```sql
PRIMARY KEY (seat_id)
```
- **Why:** Ensures unique identification of each seat

**Foreign Key:**
```sql
FOREIGN KEY (screen_id) REFERENCES Screens(screen_id) ON DELETE CASCADE
```
- **Why:** Enforces referential integrity; seat must belong to valid screen
- **Cascade Rule:** Deleting screen automatically deletes all its seats

**Unique Constraint:**
```sql
UNIQUE (screen_id, seat_number)
```
- **Why:** Prevents duplicate seat numbers within same screen (e.g., two "A1" seats)

#### Indexes
- **Primary Index:** `seat_id` (clustered)
- **Composite Unique Index:** `(screen_id, seat_number)` (enforces uniqueness)
- **Foreign Key Index:** `screen_id` (automatic for FK)

#### Relationships
- **N:1 with Screens** - Many seats belong to one screen
- **M:N with Bookings** - Many seats linked to many bookings via Booking_Seats
- **Referenced by:** Booking_Seats(seat_id)

#### Business Rules
1. Seat numbers follow standard format: [Row][Number] (e.g., A1, B12, C5)
2. VIP seats typically priced higher than REGULAR seats
3. Cannot delete seats with existing bookings (enforced by FK)
4. Seat layout is fixed per screen (no dynamic seat addition during operations)

#### Pricing Impact
- Base price comes from Shows table
- REGULAR seats: Base price
- VIP seats: Base price × multiplier (defined in application logic)

#### Example Data
```sql
INSERT INTO Seats (screen_id, seat_number, seat_type) VALUES
(1, 'A1', 'REGULAR'),
(1, 'A2', 'REGULAR'),
(1, 'J1', 'VIP'),
(1, 'J2', 'VIP');
```

---

### 4.6 Shows Table

**Purpose:** Schedules movie screenings with timing and pricing.

**Business Context:** Links movies to screens at specific times. Base entity for booking operations. Supports soft deletes for cancelled shows.

#### Columns

| Column Name | Data Type | Constraints | Description | Business Rules |
|-------------|-----------|-------------|-------------|----------------|
| `show_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique show identifier | System-generated sequential ID |
| `movie_id` | INT | NOT NULL, FOREIGN KEY | Movie being screened | Must reference existing movie |
| `screen_id` | INT | NOT NULL, FOREIGN KEY | Screen where movie is shown | Must reference existing screen |
| `show_time` | DATETIME | NOT NULL | Show start date and time | Must be future datetime when created |
| `price` | DECIMAL(10,2) | NOT NULL | Base ticket price | Positive value; modified by seat type |
| `is_deleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag | FALSE = active, TRUE = cancelled |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Show created timestamp | Immutable; set automatically |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last modification timestamp | Updates automatically on any change |

#### Constraints

**Primary Key:**
```sql
PRIMARY KEY (show_id)
```
- **Why:** Ensures unique identification of each show

**Foreign Keys:**
```sql
FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE
```
- **Why:** Enforces referential integrity; show must reference valid movie
- **Cascade Rule:** Deleting movie automatically deletes all its shows

```sql
FOREIGN KEY (screen_id) REFERENCES Screens(screen_id) ON DELETE CASCADE
```
- **Why:** Enforces referential integrity; show must reference valid screen
- **Cascade Rule:** Deleting screen automatically deletes all its shows

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| PRIMARY | `show_id` | Clustered | Primary key index |
| `idx_movie` | `movie_id` | Non-clustered | Filter shows by movie |
| `idx_show_time` | `show_time` | Non-clustered | Filter shows by date/time |
| `idx_deleted` | `is_deleted` | Non-clustered | Filter active shows efficiently |

#### Relationships
- **N:1 with Movies** - Many shows for one movie
- **N:1 with Screens** - Many shows in one screen
- **1:N with Bookings** - One show can have many bookings
- **Referenced by:** Bookings(show_id)

#### Business Rules
1. Shows cannot overlap in same screen (enforced at application layer)
2. Minimum gap between shows: movie duration + 15 minutes cleanup time
3. Price must be positive decimal
4. Soft delete shows instead of hard delete to preserve booking history
5. Show time must be in future when created (validation at application layer)

#### Soft Delete Behavior
```sql
-- Cancel show (soft delete)
UPDATE Shows SET is_deleted = TRUE WHERE show_id = 1;

-- Query active shows only
SELECT * FROM Shows WHERE is_deleted = FALSE;
```
- **Why:** Preserves booking history and referential integrity

#### Example Data
```sql
INSERT INTO Shows (movie_id, screen_id, show_time, price) VALUES
(1, 1, '2026-03-21 14:00:00', 250.00),
(1, 1, '2026-03-21 18:30:00', 300.00),
(2, 2, '2026-03-21 20:00:00', 350.00);
```

---

### 4.7 Bookings Table

**Purpose:** Records ticket reservations made by users.

**Business Context:** Central transactional table linking users to shows with payment information. Supports soft deletes for audit trail preservation.

#### Columns

| Column Name | Data Type | Constraints | Description | Business Rules |
|-------------|-----------|-------------|-------------|----------------|
| `booking_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique booking identifier | System-generated sequential ID |
| `user_id` | INT | NOT NULL, FOREIGN KEY | User who made booking | Must reference existing user |
| `show_id` | INT | NOT NULL, FOREIGN KEY | Show being booked | Must reference existing show |
| `total_amount` | DECIMAL(10,2) | NOT NULL | Total booking amount | Sum of all seat prices |
| `status` | ENUM('CONFIRMED', 'CANCELLED') | DEFAULT 'CONFIRMED' | Booking status | Affects seat availability |
| `is_deleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag | FALSE = active, TRUE = archived |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Booking creation timestamp | Immutable; records transaction time |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Last modification timestamp | Tracks cancellations and updates |

#### Constraints

**Primary Key:**
```sql
PRIMARY KEY (booking_id)
```
- **Why:** Ensures unique identification of each booking

**Foreign Keys:**
```sql
FOREIGN KEY (user_id) REFERENCES Users(user_id)
```
- **Why:** Enforces referential integrity; booking must belong to valid user
- **No Cascade:** User deletion requires handling of booking records first

```sql
FOREIGN KEY (show_id) REFERENCES Shows(show_id)
```
- **Why:** Enforces referential integrity; booking must reference valid show
- **No Cascade:** Show deletion requires handling of booking records first

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| PRIMARY | `booking_id` | Clustered | Primary key index |
| `idx_user` | `user_id` | Non-clustered | Retrieve user booking history |
| `idx_show` | `show_id` | Non-clustered | Retrieve bookings per show |
| `idx_status` | `status` | Non-clustered | Filter by booking status |
| `idx_deleted` | `is_deleted` | Non-clustered | Filter active bookings |

#### Relationships
- **N:1 with Users** - Many bookings by one user
- **N:1 with Shows** - Many bookings for one show
- **1:N with Payments** - One booking can have multiple payment attempts
- **M:N with Seats** - Many bookings for many seats via Booking_Seats
- **Referenced by:** Booking_Seats(booking_id), Payments(booking_id), Audit_Bookings(booking_id)
- **Cascade Rule:** Deleting booking cascades to Booking_Seats and Payments

#### Business Rules
1. Booking only confirmed after successful payment
2. CANCELLED bookings release seats for rebooking
3. Total amount must match sum of booked seat prices
4. Soft delete bookings to maintain audit trail
5. Users cannot book past shows (validation at application layer)
6. Minimum 1 seat required per booking

#### Transaction Safety
```sql
-- Booking transaction must be atomic
START TRANSACTION;
-- Insert booking
INSERT INTO Bookings (user_id, show_id, total_amount, status) VALUES (?, ?, ?, 'CONFIRMED');
-- Link seats (via Booking_Seats)
-- Record payment
-- Commit only if all succeed
COMMIT;
```
- **Why:** Prevents partial bookings and double-booking scenarios

#### Soft Delete Behavior
```sql
-- Soft delete instead of hard delete
UPDATE Bookings SET is_deleted = TRUE WHERE booking_id = 1;

-- Query active bookings only
SELECT * FROM Bookings WHERE is_deleted = FALSE;
```
- **Why:** Preserves transaction history and audit trail

#### Example Data
```sql
INSERT INTO Bookings (user_id, show_id, total_amount, status) VALUES
(1, 1, 500.00, 'CONFIRMED'),
(1, 2, 700.00, 'CONFIRMED'),
(2, 1, 250.00, 'CANCELLED');
```

---

### 4.8 Booking_Seats Table

**Purpose:** Junction table linking bookings to seats (M:N relationship).

**Business Context:** Critical table for seat allocation. Enables multiple seats per booking and tracks which specific seats are booked.

#### Columns

| Column Name | Data Type | Constraints | Description | Business Rules |
|-------------|-----------|-------------|-------------|----------------|
| `booking_id` | INT | NOT NULL, FOREIGN KEY, PRIMARY KEY (composite) | Booking reference | Must reference existing booking |
| `seat_id` | INT | NOT NULL, FOREIGN KEY, PRIMARY KEY (composite) | Seat reference | Must reference existing seat |

#### Constraints

**Composite Primary Key:**
```sql
PRIMARY KEY (booking_id, seat_id)
```
- **Why:** Ensures each seat can only be booked once per booking
- **Prevents:** Duplicate seat assignments within same booking

**Foreign Keys:**
```sql
FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE
```
- **Why:** Enforces referential integrity; link must reference valid booking
- **Cascade Rule:** Deleting booking automatically removes seat associations

```sql
FOREIGN KEY (seat_id) REFERENCES Seats(seat_id)
```
- **Why:** Enforces referential integrity; link must reference valid seat
- **No Cascade:** Seat deletion prevented if bookings exist

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| PRIMARY | `(booking_id, seat_id)` | Clustered | Composite primary key |
| `idx_seat` | `seat_id` | Non-clustered | Find all bookings for a seat |

#### Relationships
- **N:1 with Bookings** - Many seat assignments per booking
- **N:1 with Seats** - Many bookings per seat (over time)
- **Junction:** Resolves M:N relationship between Bookings and Seats

#### Business Rules
1. Same seat cannot be in same booking twice (enforced by PK)
2. Seat availability determined by JOIN with Bookings status
3. Booking transaction must lock seats using SELECT ... FOR UPDATE
4. Minimum 1 seat per booking (enforced at application layer)
5. Maximum seats per booking (business rule, e.g., 10 seats)

#### Critical Query Pattern
```sql
-- Check seat availability (prevents double-booking)
SELECT s.seat_id, s.seat_number
FROM Seats s
WHERE s.screen_id = ?
AND s.seat_id NOT IN (
    SELECT bs.seat_id
    FROM Booking_Seats bs
    JOIN Bookings b ON bs.booking_id = b.booking_id
    WHERE b.show_id = ?
    AND b.status = 'CONFIRMED'
    AND b.is_deleted = FALSE
);
```
- **Why:** Only CONFIRMED non-deleted bookings block seats

#### Transaction Pattern
```sql
START TRANSACTION;
-- Lock seats being booked
SELECT seat_id FROM Seats
WHERE seat_id IN (?, ?, ?)
FOR UPDATE;

-- Insert booking
INSERT INTO Bookings (...) VALUES (...);

-- Link seats to booking
INSERT INTO Booking_Seats (booking_id, seat_id)
VALUES (LAST_INSERT_ID(), ?), (LAST_INSERT_ID(), ?);

COMMIT;
```
- **Why:** Prevents race conditions in concurrent booking scenarios

#### Example Data
```sql
INSERT INTO Booking_Seats (booking_id, seat_id) VALUES
(1, 1), -- Booking 1 includes Seat A1
(1, 2), -- Booking 1 includes Seat A2
(2, 3); -- Booking 2 includes Seat A3
```

---

### 4.9 Payments Table

**Purpose:** Records payment transactions for bookings.

**Business Context:** Immutable financial record of payment attempts. Links payment gateway transactions to bookings.

#### Columns

| Column Name | Data Type | Constraints | Description | Business Rules |
|-------------|-----------|-------------|-------------|----------------|
| `payment_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique payment identifier | System-generated sequential ID |
| `booking_id` | INT | NOT NULL, FOREIGN KEY | Associated booking | Must reference existing booking |
| `amount` | DECIMAL(10,2) | NOT NULL | Payment amount | Should match booking total_amount |
| `payment_method` | VARCHAR(50) | NULL | Payment method used | e.g., 'CREDIT_CARD', 'UPI', 'DEBIT_CARD' |
| `payment_status` | ENUM('SUCCESS', 'FAILED') | DEFAULT 'SUCCESS' | Payment outcome | Only SUCCESS confirms booking |
| `payment_time` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Payment timestamp | Immutable; records transaction time |

#### Constraints

**Primary Key:**
```sql
PRIMARY KEY (payment_id)
```
- **Why:** Ensures unique identification of each payment transaction

**Foreign Key:**
```sql
FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id)
```
- **Why:** Enforces referential integrity; payment must belong to valid booking
- **No Cascade:** Booking deletion requires careful handling of payment records

#### Indexes
- **Primary Index:** `payment_id` (clustered)
- **Foreign Key Index:** `booking_id` (automatic for FK)

#### Relationships
- **N:1 with Bookings** - One booking can have multiple payment attempts
- **Referenced by:** None (leaf table in hierarchy)

#### Business Rules
1. Payment records are **immutable** once created
2. Multiple payment attempts allowed (e.g., retries after failure)
3. Only SUCCESS payments confirm bookings
4. Amount should match Bookings.total_amount
5. Payment method stored for reconciliation and reporting
6. Failed payments should trigger booking cancellation (application logic)

#### Payment Flow
```sql
-- Payment transaction within booking transaction
START TRANSACTION;

-- Create booking
INSERT INTO Bookings (...) VALUES (...);
SET @booking_id = LAST_INSERT_ID();

-- Attempt payment (via payment gateway)
-- Record payment result
INSERT INTO Payments (booking_id, amount, payment_method, payment_status)
VALUES (@booking_id, 500.00, 'CREDIT_CARD', 'SUCCESS');

-- If payment_status = 'FAILED', rollback entire transaction
IF payment_status = 'FAILED' THEN
    ROLLBACK;
ELSE
    COMMIT;
END IF;
```
- **Why:** Ensures booking only confirmed with successful payment

#### Immutability
- **No UPDATE operations** on payment records
- **No DELETE operations** on payment records
- Financial audit trail must be preserved
- Corrections handled via new payment records

#### Example Data
```sql
INSERT INTO Payments (booking_id, amount, payment_method, payment_status, payment_time) VALUES
(1, 500.00, 'CREDIT_CARD', 'SUCCESS', '2026-03-20 10:30:00'),
(2, 700.00, 'UPI', 'SUCCESS', '2026-03-20 11:15:00'),
(3, 250.00, 'DEBIT_CARD', 'FAILED', '2026-03-20 12:00:00');
```

---

### 4.10 Audit_Bookings Table

**Purpose:** Immutable audit log tracking all booking state changes.

**Business Context:** Compliance and dispute resolution. Records complete history of booking modifications for accountability and debugging.

#### Columns

| Column Name | Data Type | Constraints | Description | Business Rules |
|-------------|-----------|-------------|-------------|----------------|
| `audit_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique audit record identifier | System-generated sequential ID |
| `booking_id` | INT | NOT NULL | Booking being audited | References Bookings table |
| `user_id` | INT | NULL | User who made change | NULL for system-generated changes |
| `action` | VARCHAR(50) | NOT NULL | Action performed | e.g., 'CREATE', 'UPDATE', 'CANCEL' |
| `old_status` | VARCHAR(50) | NULL | Status before change | NULL for CREATE actions |
| `new_status` | VARCHAR(50) | NULL | Status after change | NULL for DELETE actions |
| `change_details` | JSON | NULL | Additional change metadata | Flexible field for complex changes |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Audit entry timestamp | Immutable; records when change occurred |

#### Constraints

**Primary Key:**
```sql
PRIMARY KEY (audit_id)
```
- **Why:** Ensures unique identification of each audit entry

**No Foreign Keys:**
- **Why:** Audit log must persist even if referenced records are deleted
- **Design:** Stores denormalized data for historical integrity

#### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| PRIMARY | `audit_id` | Clustered | Primary key index |
| `idx_booking` | `booking_id` | Non-clustered | Retrieve all changes for a booking |
| `idx_user` | `user_id` | Non-clustered | Track user actions |
| `idx_created` | `created_at` | Non-clustered | Time-based queries |

#### Relationships
- **Conceptual N:1 with Bookings** - Many audit entries per booking (no FK constraint)
- **Conceptual N:1 with Users** - Many audit entries per user (no FK constraint)
- **Referenced by:** None (leaf table in hierarchy)

#### Business Rules
1. Audit records are **completely immutable** once created
2. No UPDATE operations allowed
3. No DELETE operations allowed
4. Every booking state change must create audit entry
5. Triggered automatically via database triggers or application layer
6. Preserves historical data even after parent records deleted

#### Audit Triggers
```sql
-- Example trigger for booking creation
CREATE TRIGGER trg_audit_booking_create
AFTER INSERT ON Bookings
FOR EACH ROW
INSERT INTO Audit_Bookings (booking_id, user_id, action, new_status, change_details)
VALUES (NEW.booking_id, NEW.user_id, 'CREATE', NEW.status, JSON_OBJECT('total_amount', NEW.total_amount));

-- Example trigger for booking cancellation
CREATE TRIGGER trg_audit_booking_cancel
AFTER UPDATE ON Bookings
FOR EACH ROW
IF OLD.status != NEW.status THEN
    INSERT INTO Audit_Bookings (booking_id, user_id, action, old_status, new_status)
    VALUES (NEW.booking_id, NEW.user_id, 'CANCEL', OLD.status, NEW.status);
END IF;
```
- **Why:** Automates audit logging without application code

#### JSON Change Details Format
```json
{
  "total_amount": 500.00,
  "seat_count": 2,
  "seat_ids": [1, 2],
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

#### Query Patterns
```sql
-- View complete booking history
SELECT * FROM Audit_Bookings
WHERE booking_id = ?
ORDER BY created_at ASC;

-- Track user activity
SELECT * FROM Audit_Bookings
WHERE user_id = ?
ORDER BY created_at DESC;

-- Time-based audit report
SELECT * FROM Audit_Bookings
WHERE created_at BETWEEN ? AND ?;
```

#### Example Data
```sql
INSERT INTO Audit_Bookings (booking_id, user_id, action, old_status, new_status, change_details) VALUES
(1, 1, 'CREATE', NULL, 'CONFIRMED', '{"seats": [1,2], "amount": 500.00}'),
(1, 1, 'UPDATE', 'CONFIRMED', 'CANCELLED', '{"reason": "user_requested"}'),
(2, 2, 'CREATE', NULL, 'CONFIRMED', '{"seats": [3], "amount": 250.00}');
```

---

## 5. Entity Relationships

### 5.1 Relationship Diagram (Text-Based)

```
┌─────────────┐
│   Users     │
│  (user_id)  │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────▼──────────┐
│   Bookings      │◄────────┐
│  (booking_id)   │         │
└──────┬──────────┘         │ N
       │ 1                  │
       │                    │
       │ N          ┌───────┴────────┐
┌──────▼──────────┐ │ Booking_Seats  │
│     Shows       │ │ (junction)     │
│   (show_id)     │ └───────┬────────┘
└──────┬──────────┘         │ N
       │ N                  │
       │                    │
┌──────┴──────┐    ┌────────▼────────┐
│             │    │                 │
│  1          │ 1  │   1             │
▼             ▼    ▼                 ▼
┌──────────┐  ┌────────────┐  ┌─────────┐
│ Movies   │  │  Screens   │  │  Seats  │
│(movie_id)│  │(screen_id) │  │(seat_id)│
└──────────┘  └─────┬──────┘  └─────────┘
                    │ N
                    │
                    │ 1
              ┌─────▼──────┐
              │ Theatres   │
              │(theatre_id)│
              └────────────┘

┌──────────────┐
│  Payments    │
│(payment_id)  │
└──────────────┘
       ▲
       │ N
       │
       │ 1
┌──────┴──────────┐
│   Bookings      │
│  (booking_id)   │
└─────────────────┘

┌──────────────────┐
│ Audit_Bookings   │
│   (audit_id)     │
└──────────────────┘
       ▲
       │ conceptual link (no FK)
       │
       │
┌──────┴──────────┐
│   Bookings      │
│  (booking_id)   │
└─────────────────┘
```

### 5.2 Relationship Summary

| Parent Table | Child Table | Relationship Type | Cardinality | Cascade Rule |
|--------------|-------------|-------------------|-------------|--------------|
| Users | Bookings | One-to-Many | 1:N | None (manual handling) |
| Movies | Shows | One-to-Many | 1:N | ON DELETE CASCADE |
| Theatres | Screens | One-to-Many | 1:N | ON DELETE CASCADE |
| Screens | Seats | One-to-Many | 1:N | ON DELETE CASCADE |
| Screens | Shows | One-to-Many | 1:N | ON DELETE CASCADE |
| Shows | Bookings | One-to-Many | 1:N | None (manual handling) |
| Bookings | Booking_Seats | One-to-Many | 1:N | ON DELETE CASCADE |
| Seats | Booking_Seats | One-to-Many | 1:N | None (prevents deletion) |
| Bookings | Payments | One-to-Many | 1:N | None (manual handling) |
| Bookings | Seats | Many-to-Many | M:N | Via Booking_Seats junction |

### 5.3 Cascade Behavior Explanation

#### ON DELETE CASCADE (Hierarchical Deletions)
Used when child records are meaningless without parent:

**Theatre → Screens → Seats**
- Deleting theatre removes all screens and their seats
- **Why:** Infrastructure hierarchy; screens can't exist without theatre

**Movies → Shows**
- Deleting movie removes all its shows
- **Why:** Shows can't exist without movie

**Screens → Shows**
- Deleting screen removes all its shows
- **Why:** Shows can't exist without screen

**Bookings → Booking_Seats**
- Deleting booking removes seat associations
- **Why:** Seat links meaningless without booking

#### No CASCADE (Manual Handling Required)
Used when child records have independent value:

**Users → Bookings**
- Must handle bookings before deleting user
- **Why:** Preserve transaction history and audit trail

**Shows → Bookings**
- Must handle bookings before deleting show
- **Why:** Preserve booking records for completed shows

**Seats → Booking_Seats**
- Cannot delete seats with existing bookings
- **Why:** Prevent loss of booking history

**Bookings → Payments**
- Must preserve payment records
- **Why:** Financial audit trail immutability

---

## 6. Constraints and Rules Reference

### 6.1 Primary Key Constraints

| Table | Primary Key | Type | Reason |
|-------|-------------|------|--------|
| Users | `user_id` | Surrogate | System-generated unique identifier |
| Movies | `movie_id` | Surrogate | System-generated unique identifier |
| Theatres | `theatre_id` | Surrogate | System-generated unique identifier |
| Screens | `screen_id` | Surrogate | System-generated unique identifier |
| Seats | `seat_id` | Surrogate | System-generated unique identifier |
| Shows | `show_id` | Surrogate | System-generated unique identifier |
| Bookings | `booking_id` | Surrogate | System-generated unique identifier |
| Booking_Seats | `(booking_id, seat_id)` | Composite | Natural key from relationship |
| Payments | `payment_id` | Surrogate | System-generated unique identifier |
| Audit_Bookings | `audit_id` | Surrogate | System-generated unique identifier |

**Why Surrogate Keys:**
- Stable identifiers (never change)
- Efficient indexing (integer vs composite)
- Simplifies foreign key relationships
- Hides internal structure from APIs

### 6.2 Unique Constraints

| Table | Unique Constraint | Purpose |
|-------|-------------------|---------|
| Users | `email` | Prevent duplicate accounts; used for login |
| Screens | `(theatre_id, screen_number)` | Prevent duplicate screen numbers per theatre |
| Seats | `(screen_id, seat_number)` | Prevent duplicate seat numbers per screen |

**Why These Constraints:**
- **Users.email:** Business rule; one account per email address
- **Screens:** Logical constraint; "Screen 1" unique within theatre
- **Seats:** Physical constraint; "Seat A1" unique within screen

### 6.3 Foreign Key Constraints

#### Detailed Foreign Key Rules

| FK Name | Child Table | Parent Table | ON DELETE | ON UPDATE | Reason |
|---------|-------------|--------------|-----------|-----------|--------|
| `fk_screens_theatre` | Screens | Theatres | CASCADE | CASCADE | Screen meaningless without theatre |
| `fk_seats_screen` | Seats | Screens | CASCADE | CASCADE | Seat meaningless without screen |
| `fk_shows_movie` | Shows | Movies | CASCADE | CASCADE | Show meaningless without movie |
| `fk_shows_screen` | Shows | Screens | CASCADE | CASCADE | Show meaningless without screen |
| `fk_bookings_user` | Bookings | Users | RESTRICT | CASCADE | Preserve booking history |
| `fk_bookings_show` | Bookings | Shows | RESTRICT | CASCADE | Preserve booking history |
| `fk_booking_seats_booking` | Booking_Seats | Bookings | CASCADE | CASCADE | Link meaningless without booking |
| `fk_booking_seats_seat` | Booking_Seats | Seats | RESTRICT | CASCADE | Prevent seat deletion with bookings |
| `fk_payments_booking` | Payments | Bookings | RESTRICT | CASCADE | Preserve payment records |

### 6.4 Check Constraints (Application Layer)

While MySQL ENUM types enforce domain constraints, additional checks recommended:

| Table | Column | Check Rule | Reason |
|-------|--------|------------|--------|
| Movies | `duration` | > 0 | Duration must be positive minutes |
| Shows | `price` | > 0 | Price must be positive value |
| Shows | `show_time` | >= CURRENT_TIMESTAMP | Shows must be scheduled in future |
| Bookings | `total_amount` | > 0 | Amount must be positive value |
| Payments | `amount` | > 0 | Payment amount must be positive |

**Note:** Implemented at application layer due to MySQL version compatibility.

### 6.5 NOT NULL Constraints

#### Critical NOT NULL Fields

| Table | NOT NULL Columns | Reason |
|-------|------------------|--------|
| Users | `name`, `email`, `password_hash` | Essential for authentication |
| Movies | `title`, `duration` | Essential for movie identification |
| Theatres | `name`, `location` | Essential for theatre identification |
| Screens | `theatre_id`, `screen_number` | Essential for screen identification |
| Seats | `screen_id`, `seat_number` | Essential for seat identification |
| Shows | `movie_id`, `screen_id`, `show_time`, `price` | Essential for show definition |
| Bookings | `user_id`, `show_id`, `total_amount` | Essential for booking transaction |
| Booking_Seats | `booking_id`, `seat_id` | Essential for seat allocation |
| Payments | `booking_id`, `amount` | Essential for payment record |
| Audit_Bookings | `booking_id`, `action` | Essential for audit trail |

**Philosophy:** If column value is unknown, question whether record should exist.

---

## 7. Data Types Reference

### 7.1 ENUM Definitions

#### Users.role
```sql
ENUM('USER', 'ADMIN')
```
| Value | Description | Purpose |
|-------|-------------|---------|
| `USER` | Standard customer | Default role; can browse and book tickets |
| `ADMIN` | System administrator | Full system access; manage movies, theatres, shows |

**Business Rules:**
- New registrations default to 'USER'
- 'ADMIN' assigned manually via database
- Role determines access control in application layer

#### Seats.seat_type
```sql
ENUM('REGULAR', 'VIP')
```
| Value | Description | Pricing Impact |
|-------|-------------|----------------|
| `REGULAR` | Standard seating | Base show price |
| `VIP` | Premium seating | Base price × VIP multiplier (e.g., 1.5x) |

**Business Rules:**
- Seat type affects pricing calculation
- VIP seats typically in preferred locations (center, back rows)
- Pricing multiplier defined in application configuration

#### Bookings.status
```sql
ENUM('CONFIRMED', 'CANCELLED')
```
| Value | Description | Seat Availability Impact |
|-------|-------------|--------------------------|
| `CONFIRMED` | Active booking | Seats blocked from availability |
| `CANCELLED` | Cancelled booking | Seats released for rebooking |

**Business Rules:**
- Only 'CONFIRMED' bookings block seats
- 'CANCELLED' bookings retain history but free seats
- Status transitions logged in Audit_Bookings

#### Payments.payment_status
```sql
ENUM('SUCCESS', 'FAILED')
```
| Value | Description | Booking Impact |
|-------|-------------|----------------|
| `SUCCESS` | Payment completed | Booking confirmed |
| `FAILED` | Payment failed | Booking rolled back or cancelled |

**Business Rules:**
- Only 'SUCCESS' payments confirm bookings
- 'FAILED' payments trigger transaction rollback
- Multiple payment attempts allowed (retries)

### 7.2 Numeric Types

| Data Type | Tables Used | Purpose | Range |
|-----------|-------------|---------|-------|
| `INT` | All ID columns | Primary and foreign keys | -2,147,483,648 to 2,147,483,647 |
| `DECIMAL(10,2)` | Shows.price, Bookings.total_amount, Payments.amount | Monetary values | Precision: 10 digits, Scale: 2 decimals |
| `BOOLEAN` | Movies.is_deleted, Shows.is_deleted, Bookings.is_deleted | Soft delete flags | 0 (FALSE) or 1 (TRUE) |

**Why DECIMAL for Money:**
- Exact precision (no floating-point errors)
- Standard for financial calculations
- 10,2 allows up to 99,999,999.99

### 7.3 String Types

| Data Type | Usage | Reason | Examples |
|-----------|-------|--------|----------|
| `VARCHAR(100)` | Users.name, Users.email, Theatres.name | Variable-length text | Names, emails |
| `VARCHAR(150)` | Movies.title, Theatres.location | Longer variable text | Movie titles, addresses |
| `VARCHAR(255)` | Users.password_hash | Hashed passwords | bcrypt output |
| `VARCHAR(50)` | Movies.genre, Movies.language, Payments.payment_method | Short descriptive text | Categories, methods |
| `VARCHAR(10)` | Seats.seat_number | Alphanumeric codes | A1, B12, J5 |

**Why VARCHAR:**
- Efficient storage (only uses needed space)
- Flexible length within limit
- Better than CHAR for variable content

### 7.4 Date/Time Types

| Data Type | Usage | Behavior | Purpose |
|-----------|-------|----------|---------|
| `DATE` | Movies.release_date | Date only (YYYY-MM-DD) | Historical reference |
| `DATETIME` | Shows.show_time | Date and time | Precise show scheduling |
| `TIMESTAMP` | *_at columns | Date, time, timezone | Automatic timestamp tracking |

**TIMESTAMP vs DATETIME:**
- `TIMESTAMP`: Auto-updates, timezone-aware, range 1970-2038
- `DATETIME`: Manual updates, no timezone, range 1000-9999

**Timestamp Columns:**
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP (immutable)
- `updated_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP (auto-updates)

### 7.5 JSON Type

| Column | Table | Purpose | Example |
|--------|-------|---------|---------|
| `change_details` | Audit_Bookings | Flexible metadata storage | `{"seats": [1,2], "amount": 500.00}` |

**Why JSON:**
- Flexible schema for audit details
- No predefined structure needed
- Queryable with MySQL JSON functions
- Future-proof for additional fields

---

## 8. Indexes Reference

### 8.1 Index Strategy

#### Primary Indexes (Clustered)
Every table has clustered index on primary key:
- **Performance:** Fast row lookup by ID
- **Uniqueness:** Enforces primary key constraint
- **Storage:** Data physically ordered by PK

#### Secondary Indexes (Non-Clustered)
Additional indexes for frequent query patterns.

### 8.2 Table-by-Table Index Summary

#### Users
| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| PRIMARY | Clustered | `user_id` | Primary key lookup |
| UNIQUE | Non-clustered | `email` | Login queries, duplicate prevention |

**Query Patterns:**
```sql
SELECT * FROM Users WHERE email = ?;  -- Uses email index
SELECT * FROM Users WHERE user_id = ?;  -- Uses primary index
```

#### Movies
| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| PRIMARY | Clustered | `movie_id` | Primary key lookup |
| `idx_deleted` | Non-clustered | `is_deleted` | Filter active movies |

**Query Patterns:**
```sql
SELECT * FROM Movies WHERE is_deleted = FALSE;  -- Uses idx_deleted
```

#### Theatres
| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| PRIMARY | Clustered | `theatre_id` | Primary key lookup |

**Note:** Small table; primary index sufficient.

#### Screens
| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| PRIMARY | Clustered | `screen_id` | Primary key lookup |
| UNIQUE | Non-clustered | `(theatre_id, screen_number)` | Uniqueness constraint, theatre queries |
| FK | Non-clustered | `theatre_id` | Foreign key joins |

**Query Patterns:**
```sql
SELECT * FROM Screens WHERE theatre_id = ?;  -- Uses composite index
```

#### Seats
| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| PRIMARY | Clustered | `seat_id` | Primary key lookup |
| UNIQUE | Non-clustered | `(screen_id, seat_number)` | Uniqueness constraint, screen queries |
| FK | Non-clustered | `screen_id` | Foreign key joins |

**Query Patterns:**
```sql
SELECT * FROM Seats WHERE screen_id = ?;  -- Uses composite index
```

#### Shows
| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| PRIMARY | Clustered | `show_id` | Primary key lookup |
| `idx_movie` | Non-clustered | `movie_id` | Filter shows by movie |
| `idx_show_time` | Non-clustered | `show_time` | Filter shows by date/time |
| `idx_deleted` | Non-clustered | `is_deleted` | Filter active shows |
| FK | Non-clustered | `movie_id`, `screen_id` | Foreign key joins |

**Query Patterns:**
```sql
SELECT * FROM Shows WHERE movie_id = ? AND is_deleted = FALSE;  -- Uses idx_movie
SELECT * FROM Shows WHERE show_time BETWEEN ? AND ?;  -- Uses idx_show_time
```

#### Bookings
| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| PRIMARY | Clustered | `booking_id` | Primary key lookup |
| `idx_user` | Non-clustered | `user_id` | User booking history |
| `idx_show` | Non-clustered | `show_id` | Show occupancy queries |
| `idx_status` | Non-clustered | `status` | Filter by status |
| `idx_deleted` | Non-clustered | `is_deleted` | Filter active bookings |
| FK | Non-clustered | `user_id`, `show_id` | Foreign key joins |

**Query Patterns:**
```sql
SELECT * FROM Bookings WHERE user_id = ? AND is_deleted = FALSE;  -- Uses idx_user
SELECT * FROM Bookings WHERE show_id = ? AND status = 'CONFIRMED';  -- Uses idx_show
```

#### Booking_Seats
| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| PRIMARY | Clustered | `(booking_id, seat_id)` | Composite primary key |
| `idx_seat` | Non-clustered | `seat_id` | Find bookings for a seat |
| FK | Non-clustered | `booking_id`, `seat_id` | Foreign key joins |

**Query Patterns:**
```sql
SELECT * FROM Booking_Seats WHERE seat_id = ?;  -- Uses idx_seat
SELECT * FROM Booking_Seats WHERE booking_id = ?;  -- Uses primary index
```

#### Payments
| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| PRIMARY | Clustered | `payment_id` | Primary key lookup |
| FK | Non-clustered | `booking_id` | Foreign key joins |

**Query Patterns:**
```sql
SELECT * FROM Payments WHERE booking_id = ?;  -- Uses FK index
```

#### Audit_Bookings
| Index Name | Type | Columns | Purpose |
|------------|------|---------|---------|
| PRIMARY | Clustered | `audit_id` | Primary key lookup |
| `idx_booking` | Non-clustered | `booking_id` | Booking audit history |
| `idx_user` | Non-clustered | `user_id` | User action tracking |
| `idx_created` | Non-clustered | `created_at` | Time-based queries |

**Query Patterns:**
```sql
SELECT * FROM Audit_Bookings WHERE booking_id = ? ORDER BY created_at;  -- Uses idx_booking
SELECT * FROM Audit_Bookings WHERE created_at BETWEEN ? AND ?;  -- Uses idx_created
```

### 8.3 Composite Index Candidates (Future Optimization)

| Table | Columns | Purpose | When to Add |
|-------|---------|---------|-------------|
| Shows | `(movie_id, show_time, is_deleted)` | Filtered movie listings | High query volume |
| Bookings | `(user_id, status, is_deleted)` | Active user bookings | Frequent status checks |
| Bookings | `(show_id, status, is_deleted)` | Show occupancy | Real-time availability queries |

**Note:** Add composite indexes when EXPLAIN shows full table scans on frequent queries.

---

## 9. Business Rules

### 9.1 Data Integrity Rules

#### Rule Category: Referential Integrity

| Rule | Enforcement | Description |
|------|-------------|-------------|
| FK-01 | Foreign Key | All foreign keys must reference existing parent records |
| FK-02 | Foreign Key | Cascade deletions follow infrastructure hierarchy |
| FK-03 | Foreign Key | Transaction records cannot cascade delete (preserve history) |

#### Rule Category: Uniqueness

| Rule | Enforcement | Description |
|------|-------------|-------------|
| UNQ-01 | Unique Constraint | Email addresses unique across all users |
| UNQ-02 | Unique Constraint | Screen numbers unique within each theatre |
| UNQ-03 | Unique Constraint | Seat numbers unique within each screen |
| UNQ-04 | Composite PK | Booking-seat pairs unique (no duplicate assignments) |

#### Rule Category: Data Validity

| Rule | Enforcement | Description |
|------|-------------|-------------|
| VAL-01 | NOT NULL | Critical fields cannot be null |
| VAL-02 | ENUM | Status fields restricted to defined values |
| VAL-03 | Application | Positive values for prices, amounts, durations |
| VAL-04 | Application | Dates/times in valid ranges |

### 9.2 Booking Rules

#### Seat Availability

| Rule ID | Description | Enforcement |
|---------|-------------|-------------|
| BK-01 | Only CONFIRMED bookings block seats | Query filter (status = 'CONFIRMED') |
| BK-02 | Only active bookings block seats | Query filter (is_deleted = FALSE) |
| BK-03 | Cancelled bookings release seats | Update status to 'CANCELLED' |
| BK-04 | Same seat cannot be booked twice for same show | Transaction + SELECT FOR UPDATE |

#### Booking Transaction

| Rule ID | Description | Enforcement |
|---------|-------------|-------------|
| BK-05 | Booking requires successful payment | Atomic transaction (booking + payment) |
| BK-06 | Failed payment cancels booking | Transaction rollback |
| BK-07 | Minimum 1 seat per booking | Application validation |
| BK-08 | Maximum seats per booking | Application validation (e.g., 10) |
| BK-09 | Total amount matches seat prices | Calculated field validation |

#### Concurrency Control

| Rule ID | Description | Enforcement |
|---------|-------------|-------------|
| BK-10 | Prevent double-booking | SELECT ... FOR UPDATE on seats |
| BK-11 | Atomic booking transaction | START TRANSACTION ... COMMIT |
| BK-12 | Isolation level for bookings | REPEATABLE READ or SERIALIZABLE |
| BK-13 | Deadlock retry logic | Application layer retry mechanism |

### 9.3 Show Management Rules

| Rule ID | Description | Enforcement |
|---------|-------------|-------------|
| SH-01 | Shows cannot overlap in same screen | Application validation |
| SH-02 | Minimum gap between shows | Duration + 15 minutes cleanup |
| SH-03 | Shows must be scheduled in future | Application validation (created_at) |
| SH-04 | Cannot delete shows with confirmed bookings | Foreign key prevents deletion |
| SH-05 | Cancelled shows marked as deleted | Soft delete (is_deleted = TRUE) |

### 9.4 Audit Rules

| Rule ID | Description | Enforcement |
|---------|-------------|-------------|
| AUD-01 | All booking state changes logged | Trigger or application layer |
| AUD-02 | Audit records are immutable | No UPDATE/DELETE operations |
| AUD-03 | Audit retains data after parent deletion | No foreign key constraints |
| AUD-04 | Timestamp automatically recorded | DEFAULT CURRENT_TIMESTAMP |

### 9.5 Soft Delete Rules

| Rule ID | Description | Application |
|---------|-------------|-------------|
| SD-01 | Movies use soft delete | Preserve show history |
| SD-02 | Shows use soft delete | Preserve booking history |
| SD-03 | Bookings use soft delete | Preserve audit trail |
| SD-04 | All queries filter is_deleted = FALSE | Standard WHERE clause |
| SD-05 | Soft deleted records excluded from counts | Aggregation filters |

### 9.6 Payment Rules

| Rule ID | Description | Enforcement |
|---------|-------------|-------------|
| PAY-01 | Payment records are immutable | No UPDATE/DELETE operations |
| PAY-02 | Multiple payment attempts allowed | New record per attempt |
| PAY-03 | Only SUCCESS confirms booking | Transaction commit condition |
| PAY-04 | Amount matches booking total | Validation before insert |
| PAY-05 | Payment method recorded | For reconciliation and reporting |

### 9.7 Security Rules

| Rule ID | Description | Enforcement |
|---------|-------------|-------------|
| SEC-01 | Passwords must be hashed | bcrypt with salt |
| SEC-02 | No plain text passwords stored | Application layer validation |
| SEC-03 | Parameterized queries only | Prevent SQL injection |
| SEC-04 | Role-based access control | Application layer authorization |
| SEC-05 | Session management | Application layer security |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-20 | Development Team | Initial comprehensive data dictionary |

---

## Quick Reference

### Most Frequently Used Queries

#### 1. Get Available Seats for a Show
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

#### 2. Get User Booking History
```sql
SELECT b.booking_id, m.title, t.name AS theatre_name,
       sh.show_time, b.total_amount, b.status
FROM Bookings b
JOIN Shows sh ON b.show_id = sh.show_id
JOIN Movies m ON sh.movie_id = m.movie_id
JOIN Screens sc ON sh.screen_id = sc.screen_id
JOIN Theatres t ON sc.theatre_id = t.theatre_id
WHERE b.user_id = ? AND b.is_deleted = FALSE
ORDER BY b.created_at DESC;
```

#### 3. Book Tickets (Transaction)
```sql
START TRANSACTION;

-- Lock seats
SELECT seat_id FROM Seats WHERE seat_id IN (?, ?, ?) FOR UPDATE;

-- Create booking
INSERT INTO Bookings (user_id, show_id, total_amount, status)
VALUES (?, ?, ?, 'CONFIRMED');
SET @booking_id = LAST_INSERT_ID();

-- Link seats
INSERT INTO Booking_Seats (booking_id, seat_id)
VALUES (@booking_id, ?), (@booking_id, ?);

-- Record payment
INSERT INTO Payments (booking_id, amount, payment_method, payment_status)
VALUES (@booking_id, ?, ?, 'SUCCESS');

COMMIT;
```

---

**End of Data Dictionary**
