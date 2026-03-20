# Database Schema Documentation

## Overview
This directory contains the complete MySQL database schema for the Movie Ticket Booking System. The schema is designed with a **database-first approach**, emphasizing data integrity, normalization (3NF), and query optimization.

## Files

### Core Schema Files (Execute in Order)

1. **`001_create_tables.sql`**
   - Creates all 10 core tables with proper relationships
   - Includes foreign key constraints with CASCADE rules
   - Implements soft delete functionality (is_deleted)
   - Includes timestamp tracking (created_at, updated_at)
   - Adds inline indexes for critical queries

2. **`002_create_indexes.sql`**
   - Creates additional composite indexes for query optimization
   - Optimizes JOIN operations and filtered queries
   - Includes index usage documentation
   - Optional full-text search indexes

3. **`003_create_constraints.sql`**
   - Adds CHECK constraints for data validation
   - Implements database triggers for business rules
   - Enforces data integrity at database level
   - Includes constraint verification queries

### Utility Files

4. **`init_database.sql`**
   - Complete database initialization in single file
   - Combines all three schema files in correct order
   - Use this for fresh database setup
   - **WARNING**: Drops existing database!

## Database Schema

### Tables Overview

| Table | Purpose | Relationships | Key Features |
|-------|---------|---------------|--------------|
| **Users** | User accounts | 1:N with Bookings | Role-based access (USER/ADMIN), password hashing |
| **Movies** | Movie catalog | 1:N with Shows | Soft delete, metadata storage |
| **Theatres** | Cinema locations | 1:N with Screens | Location tracking |
| **Screens** | Screening rooms | N:1 with Theatres, 1:N with Seats/Shows | Unique screen numbers per theatre |
| **Seats** | Individual seats | N:1 with Screens, M:N with Bookings | Seat types (REGULAR/VIP) |
| **Shows** | Movie screenings | N:1 with Movies/Screens, 1:N with Bookings | Soft delete, pricing |
| **Bookings** | Ticket bookings | N:1 with Users/Shows, M:N with Seats | Status tracking, soft delete |
| **Booking_Seats** | Junction table | M:N between Bookings and Seats | **CRITICAL** for preventing double-booking |
| **Payments** | Payment records | N:1 with Bookings | Immutable audit trail |
| **Audit_Bookings** | Audit log | References Bookings | JSON support for change details |

### Entity Relationship Diagram

```
Users (1) ─────< (N) Bookings (N) ────< (M:N) >───── (N) Seats
                         │                               │
                         │                               │
                         v                               v
                      Shows (N) ──────> (1) Screens (N) ──> (1) Theatres
                         │
                         │
                         v
                      Movies (1)

Bookings (1) ─────< (N) Payments
Bookings ────────> Audit_Bookings (immutable log)
```

## Installation Instructions

### Method 1: Using Individual Files (Recommended for Development)

```bash
# 1. Connect to MySQL
mysql -u root -p

# 2. Create database
mysql> CREATE DATABASE movie_booking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
mysql> USE movie_booking_db;

# 3. Execute schema files in order
mysql> SOURCE database/schema/001_create_tables.sql;
mysql> SOURCE database/schema/002_create_indexes.sql;
mysql> SOURCE database/schema/003_create_constraints.sql;

# 4. Verify installation
mysql> SHOW TABLES;
mysql> SELECT COUNT(*) AS table_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'movie_booking_db';
```

### Method 2: Using Initialization Script (Quick Setup)

```bash
# Single command initialization
mysql -u root -p < database/schema/init_database.sql

# Verify
mysql -u root -p movie_booking_db -e "SHOW TABLES;"
```

### Method 3: Using mysql Command

```bash
# Linux/Mac
mysql -u root -p movie_booking_db < database/schema/init_database.sql

# Windows
mysql -u root -p movie_booking_db < "d:\Aryan\Github\Movie Ticket Booking System\database\schema\init_database.sql"
```

## Key Features

### 1. Data Integrity
- **Foreign Key Constraints**: All relationships enforced with FK constraints
- **Cascade Rules**: Proper ON DELETE CASCADE for dependent records
- **Unique Constraints**: Email, seat numbers, screen numbers
- **CHECK Constraints**: Data validation at database level
- **NOT NULL**: Critical fields cannot be null

### 2. Soft Deletes
Tables with soft delete support:
- `Movies` (is_deleted)
- `Shows` (is_deleted)
- `Bookings` (is_deleted)

Query pattern:
```sql
SELECT * FROM Movies WHERE is_deleted = FALSE;
```

### 3. Timestamp Tracking
All tables include:
- `created_at`: Automatic timestamp on insert
- `updated_at`: Automatic timestamp on update (where applicable)

### 4. Concurrency Control
**CRITICAL**: Booking transaction uses:
- `START TRANSACTION` with appropriate isolation level
- `SELECT ... FOR UPDATE` to lock seats
- Atomic operations to prevent double-booking
- `COMMIT` or `ROLLBACK` based on validation

### 5. Audit Logging
`Audit_Bookings` table tracks:
- All booking state changes (CREATE, UPDATE, CANCEL)
- Old and new status values
- JSON details of changes
- Immutable records (no updates/deletes)

### 6. Database Triggers
- **trg_prevent_reconfirm_cancelled_booking**: Prevents cancelled bookings from being reconfirmed
- **trg_validate_payment_amount**: Ensures payment matches booking amount
- **trg_audit_booking_update**: Auto-logs booking updates
- **trg_audit_booking_insert**: Auto-logs new bookings
- **trg_prevent_deleted_booking_update**: Prevents modification of soft-deleted bookings

## Schema Validation

### Verify Tables
```sql
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    ENGINE,
    TABLE_COLLATION
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'movie_booking_db'
ORDER BY TABLE_NAME;
```

### Verify Foreign Keys
```sql
SELECT
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'movie_booking_db'
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### Verify Indexes
```sql
SELECT
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'movie_booking_db'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
```

### Verify Constraints
```sql
SELECT
    TABLE_NAME,
    CONSTRAINT_NAME,
    CONSTRAINT_TYPE
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = 'movie_booking_db'
ORDER BY TABLE_NAME, CONSTRAINT_TYPE;
```

### Verify Triggers
```sql
SELECT
    TRIGGER_NAME,
    EVENT_MANIPULATION,
    EVENT_OBJECT_TABLE,
    ACTION_TIMING
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_SCHEMA = 'movie_booking_db'
ORDER BY EVENT_OBJECT_TABLE, ACTION_TIMING;
```

## Critical Queries

### Available Seats for a Show
```sql
SELECT s.seat_id, s.seat_number, s.seat_type
FROM Seats s
WHERE s.screen_id = (
    SELECT screen_id FROM Shows WHERE show_id = ? AND is_deleted = FALSE
)
AND s.seat_id NOT IN (
    SELECT bs.seat_id
    FROM Booking_Seats bs
    JOIN Bookings b ON bs.booking_id = b.booking_id
    WHERE b.show_id = ?
    AND b.status = 'CONFIRMED'
    AND b.is_deleted = FALSE
);
```

### User Booking History
```sql
SELECT
    b.booking_id,
    m.title,
    t.name AS theatre_name,
    sh.show_time,
    b.total_amount,
    b.status,
    b.created_at,
    GROUP_CONCAT(se.seat_number ORDER BY se.seat_number) AS seats
FROM Bookings b
JOIN Shows sh ON b.show_id = sh.show_id
JOIN Movies m ON sh.movie_id = m.movie_id
JOIN Screens sc ON sh.screen_id = sc.screen_id
JOIN Theatres t ON sc.theatre_id = t.theatre_id
JOIN Booking_Seats bs ON b.booking_id = bs.booking_id
JOIN Seats se ON bs.seat_id = se.seat_id
WHERE b.user_id = ? AND b.is_deleted = FALSE
GROUP BY b.booking_id
ORDER BY b.created_at DESC;
```

### Booking Transaction (Atomic)
```sql
START TRANSACTION;

-- Lock seats
SELECT seat_id FROM Seats
WHERE seat_id IN (?, ?, ?)
FOR UPDATE;

-- Verify availability
SELECT COUNT(*) FROM Booking_Seats bs
JOIN Bookings b ON bs.booking_id = b.booking_id
WHERE bs.seat_id IN (?, ?, ?)
AND b.show_id = ?
AND b.status = 'CONFIRMED'
AND b.is_deleted = FALSE;
-- If count > 0, ROLLBACK

-- Create booking
INSERT INTO Bookings (user_id, show_id, total_amount, status)
VALUES (?, ?, ?, 'CONFIRMED');
SET @booking_id = LAST_INSERT_ID();

-- Link seats
INSERT INTO Booking_Seats (booking_id, seat_id)
VALUES (@booking_id, ?), (@booking_id, ?), (@booking_id, ?);

-- Record payment
INSERT INTO Payments (booking_id, amount, payment_method, payment_status)
VALUES (@booking_id, ?, ?, 'SUCCESS');

COMMIT;
```

## Performance Optimization

### Index Strategy
- **Primary indexes**: All PKs (AUTO_INCREMENT)
- **Unique indexes**: Email, seat numbers, composite keys
- **Foreign key indexes**: Automatically indexed
- **Composite indexes**: For multi-column queries
- **Filtered indexes**: Soft delete queries

### Query Optimization Tips
1. Always use `EXPLAIN` to analyze query performance
2. Avoid `SELECT *` in production queries
3. Use JOINs efficiently (INNER JOIN when possible)
4. Filter with indexed columns (movie_id, show_id, user_id)
5. Include `is_deleted = FALSE` in all queries for soft-deleted tables
6. Use pagination for large result sets (LIMIT/OFFSET)

### Performance Targets
- Query response time: **< 200ms** for 95th percentile
- Transaction completion: **< 3 seconds**
- Support: **100+ concurrent users**
- Zero deadlocks or double-bookings

## Maintenance

### Backup
```bash
# Full backup
mysqldump -u root -p movie_booking_db > backup_$(date +%Y%m%d).sql

# Schema only
mysqldump -u root -p --no-data movie_booking_db > schema_backup.sql

# Data only
mysqldump -u root -p --no-create-info movie_booking_db > data_backup.sql
```

### Restore
```bash
mysql -u root -p movie_booking_db < backup_20260320.sql
```

### Optimize Tables
```sql
OPTIMIZE TABLE Bookings, Booking_Seats, Shows;
```

### Check Table Health
```sql
CHECK TABLE Bookings;
ANALYZE TABLE Bookings;
```

## Troubleshooting

### Common Issues

**Issue**: Foreign key constraint violation
```sql
-- Check FK relationships
SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE CONSTRAINT_SCHEMA = 'movie_booking_db'
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

**Issue**: Duplicate entry error
```sql
-- Check unique constraints
SHOW INDEX FROM table_name WHERE Non_unique = 0;
```

**Issue**: Check constraint violation
```sql
-- List all check constraints
SELECT * FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'movie_booking_db';
```

**Issue**: Trigger not firing
```sql
-- Verify trigger exists
SHOW TRIGGERS;

-- Check trigger definition
SHOW CREATE TRIGGER trg_audit_booking_insert;
```

## Migration Support

### Adding New Column
```sql
ALTER TABLE table_name
ADD COLUMN new_column VARCHAR(50) AFTER existing_column;
```

### Adding New Index
```sql
CREATE INDEX idx_name ON table_name(column_name);
```

### Adding New Constraint
```sql
ALTER TABLE table_name
ADD CONSTRAINT chk_name CHECK (condition);
```

## Security Considerations

1. **Password Storage**: Use bcrypt or similar hashing (NOT stored in plain text)
2. **SQL Injection Prevention**: Use parameterized queries (NEVER string concatenation)
3. **Role-Based Access**: Enforce USER vs ADMIN roles at application level
4. **Audit Logging**: Track all critical operations in Audit_Bookings
5. **Data Privacy**: Protect user information (email, payment details)

## References

- [MySQL 8.0 Documentation](https://dev.mysql.com/doc/)
- [Database Normalization (3NF)](https://en.wikipedia.org/wiki/Third_normal_form)
- [ACID Transactions](https://en.wikipedia.org/wiki/ACID)
- [SRS Document](../../docs/SRS.md)
- [PRD Document](../../docs/PRD.md)
- [CLAUDE.md](../../CLAUDE.md)

## Support

For issues or questions:
1. Check SRS.md for schema specifications
2. Check PRD.md for business requirements
3. Check CLAUDE.md for development guidelines
4. Review trigger definitions for business rule enforcement
5. Verify foreign key relationships for data integrity

---

**Version**: 2.0
**Last Updated**: 2026-03-20
**Status**: Production Ready
