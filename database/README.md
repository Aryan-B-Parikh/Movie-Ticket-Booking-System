# Database Layer - Movie Ticket Booking System

This directory contains all database-related files for the Movie Ticket Booking System. The database is the **core** of this project, designed with a focus on data integrity, transaction safety, and query performance.

---

## Table of Contents
- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Setup Instructions](#setup-instructions)
- [Schema Design](#schema-design)
- [Usage](#usage)
- [Best Practices](#best-practices)

---

## Overview

**Database Engine**: MySQL 8.0+
**Design Philosophy**: Database-first, ACID-compliant, optimized for concurrent operations

### Key Features
- **Normalized Schema**: 3NF compliant
- **Referential Integrity**: Foreign key constraints on all relationships
- **Transaction Safety**: SELECT FOR UPDATE locking for bookings
- **Query Optimization**: Strategic indexes on high-traffic columns
- **Audit Trail**: Complete transaction logging

---

## Directory Structure

```
database/
├── schema/                          # DDL Scripts (Data Definition Language)
│   ├── 001_create_tables.sql       # Core tables (Users, Movies, Theatres, etc.)
│   ├── 002_create_indexes.sql      # Performance indexes
│   ├── 003_create_constraints.sql  # Foreign keys & constraints
│   └── 004_create_audit_tables.sql # Audit logging tables
│
├── migrations/                      # Schema Versioning
│   ├── up/                          # Forward migrations
│   │   ├── 001_add_phone_to_users.sql
│   │   └── 002_add_rating_to_movies.sql
│   └── down/                        # Rollback migrations
│       ├── 001_remove_phone_from_users.sql
│       └── 002_remove_rating_from_movies.sql
│
├── seeds/                           # Sample Data
│   ├── 001_seed_users.sql          # Test users (admin + regular)
│   ├── 002_seed_theatres.sql       # Sample theatres & screens
│   ├── 003_seed_movies.sql         # Sample movie catalog
│   ├── 004_seed_shows.sql          # Sample show times
│   └── 005_seed_bookings.sql       # Sample booking data
│
├── procedures/                      # Stored Procedures
│   ├── sp_book_tickets.sql         # Transaction-safe booking
│   ├── sp_cancel_booking.sql       # Booking cancellation
│   ├── sp_get_available_seats.sql  # Seat availability check
│   └── sp_generate_report.sql      # Revenue reports
│
├── triggers/                        # Database Triggers
│   ├── trg_audit_booking_changes.sql    # Log booking changes
│   ├── trg_booking_status_update.sql    # Auto-update status
│   └── trg_prevent_past_show_booking.sql # Validation trigger
│
├── views/                           # Database Views
│   ├── vw_available_seats.sql      # Real-time seat availability
│   ├── vw_booking_summary.sql      # User booking dashboard
│   ├── vw_show_occupancy.sql       # Show occupancy stats
│   └── vw_revenue_report.sql       # Revenue analytics
│
└── README.md                        # This file
```

---

## Setup Instructions

### Prerequisites
- MySQL 8.0 or higher
- MySQL client or MySQL Workbench
- Terminal/Command prompt

### Step 1: Create Database
```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE movie_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE movie_booking;
exit;
```

### Step 2: Run Schema Scripts (In Order)
```bash
# Navigate to project root
cd "d:\Aryan\Github\Movie Ticket Booking System"

# Create tables
mysql -u root -p movie_booking < database/schema/001_create_tables.sql

# Add indexes
mysql -u root -p movie_booking < database/schema/002_create_indexes.sql

# Add constraints
mysql -u root -p movie_booking < database/schema/003_create_constraints.sql

# Create audit tables (optional)
mysql -u root -p movie_booking < database/schema/004_create_audit_tables.sql
```

### Step 3: Seed Sample Data (Optional)
```bash
# Seed in order (respects foreign keys)
mysql -u root -p movie_booking < database/seeds/001_seed_users.sql
mysql -u root -p movie_booking < database/seeds/002_seed_theatres.sql
mysql -u root -p movie_booking < database/seeds/003_seed_movies.sql
mysql -u root -p movie_booking < database/seeds/004_seed_shows.sql
mysql -u root -p movie_booking < database/seeds/005_seed_bookings.sql
```

### Step 4: Install Stored Procedures
```bash
mysql -u root -p movie_booking < database/procedures/sp_book_tickets.sql
mysql -u root -p movie_booking < database/procedures/sp_cancel_booking.sql
mysql -u root -p movie_booking < database/procedures/sp_get_available_seats.sql
```

### Step 5: Create Triggers
```bash
mysql -u root -p movie_booking < database/triggers/trg_audit_booking_changes.sql
mysql -u root -p movie_booking < database/triggers/trg_booking_status_update.sql
```

### Step 6: Create Views
```bash
mysql -u root -p movie_booking < database/views/vw_available_seats.sql
mysql -u root -p movie_booking < database/views/vw_booking_summary.sql
mysql -u root -p movie_booking < database/views/vw_show_occupancy.sql
```

### Automated Setup (Coming Soon)
```bash
# Run all setup scripts at once
bash scripts/setup-database.sh
```

---

## Schema Design

### Core Entities
| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| **Users** | Customer accounts | → Bookings |
| **Movies** | Movie catalog | → Shows |
| **Theatres** | Cinema locations | → Screens |
| **Screens** | Theatre halls | → Seats, Shows |
| **Seats** | Individual seats | → Booking_Seats |
| **Shows** | Movie screenings | ← Movies, Screens → Bookings |
| **Bookings** | Ticket reservations | ← Users, Shows → Booking_Seats |
| **Booking_Seats** | Junction table | ← Bookings, Seats |
| **Payments** | Payment records | ← Bookings |

### Entity Relationship Diagram
See [docs/ERD.pdf](../docs/ERD.pdf) for visual schema representation.

### Data Dictionary
See [docs/DATA_DICTIONARY.md](../docs/DATA_DICTIONARY.md) for detailed column definitions.

---

## Usage

### Common Queries

#### Check Available Seats
```sql
SELECT s.seat_id, s.seat_number, s.seat_type, s.price
FROM Seats s
WHERE s.screen_id = 1
AND s.seat_id NOT IN (
    SELECT bs.seat_id
    FROM Booking_Seats bs
    JOIN Bookings b ON bs.booking_id = b.booking_id
    WHERE b.show_id = 101 AND b.status = 'CONFIRMED'
);
```

#### Book Tickets (Transaction-Safe)
```sql
START TRANSACTION;

-- Lock seats to prevent double-booking
SELECT seat_id FROM Seats
WHERE seat_id IN (10, 11, 12)
FOR UPDATE;

-- Create booking
INSERT INTO Bookings (user_id, show_id, booking_date, total_amount, status)
VALUES (5, 101, NOW(), 450.00, 'CONFIRMED');

SET @booking_id = LAST_INSERT_ID();

-- Link seats to booking
INSERT INTO Booking_Seats (booking_id, seat_id)
VALUES (@booking_id, 10), (@booking_id, 11), (@booking_id, 12);

-- Record payment
INSERT INTO Payments (booking_id, amount, payment_method, payment_status, payment_date)
VALUES (@booking_id, 450.00, 'CREDIT_CARD', 'SUCCESS', NOW());

COMMIT;
```

#### View User Booking History
```sql
SELECT
    b.booking_id,
    m.title AS movie_title,
    t.name AS theatre_name,
    s.show_time,
    b.total_amount,
    b.status,
    GROUP_CONCAT(se.seat_number ORDER BY se.seat_number) AS seats
FROM Bookings b
JOIN Shows s ON b.show_id = s.show_id
JOIN Movies m ON s.movie_id = m.movie_id
JOIN Screens sc ON s.screen_id = sc.screen_id
JOIN Theatres t ON sc.theatre_id = t.theatre_id
JOIN Booking_Seats bs ON b.booking_id = bs.booking_id
JOIN Seats se ON bs.seat_id = se.seat_id
WHERE b.user_id = 5
GROUP BY b.booking_id
ORDER BY s.show_time DESC;
```

---

## Best Practices

### When Writing Queries
1. **Always use transactions** for multi-step operations
2. **Use SELECT FOR UPDATE** when locking rows for modification
3. **Leverage indexes** on foreign keys and frequently queried columns
4. **Avoid SELECT *** in production (specify columns)
5. **Use prepared statements** to prevent SQL injection

### Schema Modifications
1. **Create migrations** for all schema changes
2. **Test rollback scripts** before applying to production
3. **Update data dictionary** after schema changes
4. **Regenerate ERD** for visual documentation

### Performance Tips
- Index columns used in WHERE, JOIN, and ORDER BY clauses
- Use EXPLAIN to analyze query execution plans
- Consider query caching for frequent reads
- Partition large tables (e.g., Bookings by date)
- Archive old data to maintain performance

### Security Considerations
- **Never store plain-text passwords** (use bcrypt/argon2)
- **Use parameterized queries** (prevent SQL injection)
- **Implement row-level security** where appropriate
- **Audit sensitive operations** (bookings, payments)
- **Backup regularly** (daily automated backups)

---

## Maintenance

### Backup
```bash
# Full backup
mysqldump -u root -p movie_booking > backup_$(date +%Y%m%d).sql

# Schema only
mysqldump -u root -p --no-data movie_booking > schema_backup.sql

# Data only
mysqldump -u root -p --no-create-info movie_booking > data_backup.sql
```

### Restore
```bash
mysql -u root -p movie_booking < backup_20260320.sql
```

### Optimization
```sql
-- Analyze tables
ANALYZE TABLE Bookings, Booking_Seats, Shows;

-- Optimize tables
OPTIMIZE TABLE Bookings;

-- Check for missing indexes
SELECT * FROM sys.schema_unused_indexes;
```

---

## Troubleshooting

### Common Issues

**Issue**: Foreign key constraint fails
```sql
-- Check foreign key relationships
SELECT * FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'movie_booking';
```

**Issue**: Deadlock detected
```sql
-- Check transaction isolation level
SELECT @@transaction_isolation;

-- View deadlock information
SHOW ENGINE INNODB STATUS;
```

**Issue**: Slow queries
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- Analyze slow queries
SELECT * FROM mysql.slow_log;
```

---

## Migration Workflow

### Creating a Migration
1. Create up migration: `database/migrations/up/XXX_description.sql`
2. Create down migration: `database/migrations/down/XXX_description.sql`
3. Test both up and down migrations
4. Document changes in commit message

### Applying Migrations
```bash
# Manual
mysql -u root -p movie_booking < database/migrations/up/002_add_rating_to_movies.sql

# Rollback
mysql -u root -p movie_booking < database/migrations/down/002_remove_rating_from_movies.sql
```

---

## Resources

- [MySQL 8.0 Documentation](https://dev.mysql.com/doc/refman/8.0/en/)
- [Database Design Best Practices](https://www.sqlshack.com/database-design-best-practices/)
- [Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html)
- Project documentation: [docs/](../docs/)

---

**Remember**: The database is the foundation of this system. Prioritize data integrity, transaction safety, and query performance in all operations.
