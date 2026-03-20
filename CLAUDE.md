# CLAUDE.md - Movie Ticket Booking System

## Project Overview
This is a **backend-centric Movie Ticket Booking System** with MySQL as the primary database. The focus is on:
- Robust relational database design
- Clean schema with strong data integrity
- Efficient query optimization
- Minimal frontend (CLI or simple UI)

## Technology Stack
- **Database**: MySQL (primary focus)
- **Backend**: To be implemented (Node.js, Python)
- **Frontend**: Minimal (simple web interface)

## Core Architecture Principles

### 1. Database-First Approach
- All major features should be designed from the database perspective first
- Prioritize normalization (3NF) and data integrity
- Use proper constraints (PK, FK, UNIQUE, CHECK)
- Implement transactions for critical operations

### 2. Data Integrity Rules
When working on this project:
- **ALWAYS** use foreign key constraints
- **NEVER** allow orphaned records
- Implement proper cascading rules (ON DELETE, ON UPDATE)
- Use ENUM types for fixed value sets
- Apply UNIQUE constraints where appropriate (e.g., seat_number per screen)

### 3. Concurrency Control
For booking operations:
- Use transactions with appropriate isolation levels
- Implement SELECT ... FOR UPDATE for seat booking
- Prevent double-booking scenarios
- Consider SERIALIZABLE or REPEATABLE READ isolation
- Stored procedures for complex booking logic
- Triggers for automated status updates

### 4. Query Optimization
- Create indexes on frequently queried columns (movie_id, show_time, user_id)
- Optimize JOIN operations
- Use EXPLAIN to analyze query performance
- Avoid N+1 query problems

## Database Schema Reference

### Core Entities
1. **Users** - Customer and admin accounts
2. **Movies** - Movie catalog
3. **Theatres** - Cinema locations
4. **Screens** - Screens within theatres
5. **Seats** - Individual seats in screens
6. **Shows** - Movie screenings with timing
7. **Bookings** - Ticket bookings
8. **Booking_Seats** - Many-to-many junction table (CRITICAL)
9. **Payments** - Payment records

### Critical Relationships
- One Movie → Many Shows
- One Theatre → Many Screens
- One Screen → Many Seats
- One Show → Many Bookings
- One Booking → Many Seats (via Booking_Seats junction)

## Development Guidelines

### When Adding Features
1. Design the database schema first
2. Consider data integrity and normalization
3. Write optimized SQL queries
4. Test for edge cases (double booking, concurrent access)
5. Document the schema changes

### When Modifying Schema
1. Check for existing foreign key dependencies
2. Update all related tables and queries
3. Migrate existing data if necessary
4. Test referential integrity thoroughly

### When Writing Queries
1. Use prepared statements (prevent SQL injection)
2. Add appropriate indexes
3. Use JOINs efficiently
4. Avoid SELECT * in production code
5. Consider pagination for large result sets

### Security Considerations
- Hash passwords using bcrypt or similar
- Use parameterized queries (NO string concatenation)
- Implement role-based access control (USER vs ADMIN)
- Validate all user inputs
- Sanitize data before database insertion

## Common Operations

### Available Seats Query Pattern
```sql
SELECT s.seat_id, s.seat_number, s.seat_type
FROM Seats s
WHERE s.screen_id = ?
AND s.seat_id NOT IN (
    SELECT bs.seat_id
    FROM Booking_Seats bs
    JOIN Bookings b ON bs.booking_id = b.booking_id
    WHERE b.show_id = ?
    AND b.status = 'CONFIRMED'
);
```

### Booking Transaction Pattern
```sql
START TRANSACTION;
-- Lock the seats being booked
SELECT seat_id FROM Seats WHERE seat_id IN (?) FOR UPDATE;
-- Insert booking
INSERT INTO Bookings (user_id, show_id, total_amount, status) VALUES (?, ?, ?, 'CONFIRMED');
-- Link seats to booking
INSERT INTO Booking_Seats (booking_id, seat_id) VALUES (LAST_INSERT_ID(), ?);
-- Record payment
INSERT INTO Payments (booking_id, amount, payment_method, payment_status) VALUES (LAST_INSERT_ID(), ?, ?, 'SUCCESS');
COMMIT;
```

## Testing Requirements
- Test concurrent booking scenarios
- Verify referential integrity constraints
- Test cascade operations
- Validate ENUM values
- Check unique constraints
- Test transaction rollback scenarios

## Code Quality Standards
- Write clear SQL queries with proper formatting
- Comment complex queries
- Use meaningful table and column names
- Follow naming conventions (snake_case for database)
- Keep queries DRY (Don't Repeat Yourself)

## Performance Targets
- Query response time: < 200ms for typical operations
- Support for concurrent bookings without conflicts
- Efficient seat availability checks
- Fast user booking history retrieval

## Anti-Patterns to Avoid
❌ Don't use SELECT * in production
❌ Don't concatenate strings for SQL queries
❌ Don't skip foreign key constraints
❌ Don't ignore transaction boundaries
❌ Don't load all data without pagination
❌ Don't create duplicate data across tables
❌ Don't use VARCHAR for fixed-value fields (use ENUM)
❌ Don't forget to index foreign keys

## When in Doubt
1. Refer to SRS.md for requirements
2. Refer to PRD.md for product specifications
3. Prioritize data integrity over convenience
4. Design for scalability from the start
5. Ask for clarification on business logic

## Advanced Features to Consider
- Views for common reporting queries
- Database partitioning for large datasets
- Audit logging for critical operations
- Soft deletes instead of hard deletes
- Timestamp tracking (created_at, updated_at)

## Remember
This is a DATABASE-FOCUSED project. Every decision should prioritize:
1. Data consistency
2. Query performance
3. Schema normalization
4. Transaction safety
5. Referential integrity

# Output Rules
- Be concise and direct
- Avoid long explanations unless explicitly asked
- Prefer bullet points over paragraphs
- Always provide production-quality code
- No pseudocode unless requested
- Highlight edge cases where relevant
Avoid unnecessary explanations. Focus on correctness and efficiency.

# Preferences
- Prefer practical solutions over theoretical ones
- Avoid overengineering
- Use industry-relevant approaches

# Avoid
- Unnecessary theory
- Repetition
- Overly verbose answers
- Irrelevant alternatives