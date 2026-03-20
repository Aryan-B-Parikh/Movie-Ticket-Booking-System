# Database Seed Data

## Overview
This directory contains SQL seed data scripts for the Movie Ticket Booking System. These scripts populate the database with realistic test data for development and testing purposes.

## Files

### Individual Seed Files (Run in order)
1. **001_seed_users.sql** - 7 users (5 regular + 2 admins)
2. **002_seed_theatres.sql** - 3 theatres in different locations
3. **003_seed_screens.sql** - 9 screens (3 per theatre)
4. **004_seed_seats.sql** - 450 seats (50 per screen)
5. **005_seed_movies.sql** - 10 diverse movies
6. **006_seed_shows.sql** - 30 shows over next 7 days

### Master Script
- **run_all_seeds.sql** - Executes all seed files in correct order

## Data Summary

### Users (7 total)
- **Regular Users (5)**:
  - john.smith@email.com
  - sarah.j@email.com
  - michael.chen@email.com
  - emily.davis@email.com
  - david.m@email.com

- **Admin Users (2)**:
  - admin@moviebooking.com
  - superadmin@moviebooking.com

- **Password**: All users have password `password123`
- **Hash**: `$2b$10$rXJH4xkL9fK6QzP8mY7N3eZvK8hW5gX2nQ4tR6yU8iO7pL9mN3kR2`

### Theatres (3 total)
1. Grand Cinema Plaza - New York
2. Star Multiplex Theatre - Los Angeles
3. Royal Cinema Complex - Chicago

### Screens (9 total)
- 3 screens per theatre
- Screen numbers 1-3 per theatre

### Seats (450 total)
- **Per Screen**: 50 seats (Rows A-E, seats 1-10)
- **Distribution**:
  - REGULAR: 35 seats (70%) - Rows A, B, C edges
  - VIP: 15 seats (30%) - Rows D, E + C center (C4-C7)

### Movies (10 total)
1. The Last Guardian (Action, 142 min)
2. Shadow Protocol (Thriller, 128 min)
3. Echoes of Tomorrow (Drama, 135 min)
4. Love in Paris (Romance, 105 min)
5. The Misadventure Club (Comedy, 98 min)
6. Quantum Horizon (Sci-Fi, 156 min)
7. The Haunting Hour (Horror, 92 min)
8. Journey to the Stars (Animation, 102 min)
9. Namaste Mumbai (Drama/Hindi, 148 min)
10. Dragon Legacy (Action/Mandarin, 138 min)

### Shows (30 total)
- **Date Range**: 2026-03-20 to 2026-03-26 (7 days)
- **Times**: 10:00, 13:00, 16:00, 19:00, 22:00
- **Pricing**: $10.00 base, $12-15 for premium shows
- **Distribution**: 3-4 shows per screen, no overlaps

## Usage

### Option 1: Run Master Script (Recommended)
```bash
# From the seeds directory
mysql -u root -p movie_booking_db < run_all_seeds.sql
```

### Option 2: Run Individual Files
```bash
# Execute in order (001 through 006)
mysql -u root -p movie_booking_db < 001_seed_users.sql
mysql -u root -p movie_booking_db < 002_seed_theatres.sql
mysql -u root -p movie_booking_db < 003_seed_screens.sql
mysql -u root -p movie_booking_db < 004_seed_seats.sql
mysql -u root -p movie_booking_db < 005_seed_movies.sql
mysql -u root -p movie_booking_db < 006_seed_shows.sql
```

### Option 3: From MySQL Command Line
```sql
-- Connect to MySQL
mysql -u root -p

-- Use the database
USE movie_booking_db;

-- Run master script
SOURCE database/seeds/run_all_seeds.sql;
```

## Prerequisites
1. Database must exist: `movie_booking_db`
2. Schema must be created first (run `database/schema/001_create_tables.sql`)
3. MySQL user must have INSERT, TRUNCATE, and CREATE/DROP PROCEDURE privileges

## Features

### Safe Re-seeding
- All scripts use `TRUNCATE TABLE` with `FOREIGN_KEY_CHECKS = 0`
- Can be run multiple times without errors
- Automatically cleans existing data before inserting

### Data Integrity
- Explicit IDs ensure referential integrity
- Foreign key relationships maintained
- Unique constraints respected (emails, seat numbers per screen)

### Verification Queries
- Each script includes verification queries
- Shows counts and distributions
- Helps validate successful seeding

## Testing Scenarios

### Available Test Cases
1. **User Login**: Use any seeded user email with password `password123`
2. **Browse Movies**: 10 movies with variety of genres/languages
3. **Show Availability**: 30 shows across multiple screens/times
4. **Seat Selection**: 450 seats with REGULAR/VIP distribution
5. **Concurrent Booking**: Multiple users booking same show
6. **Admin Functions**: 2 admin accounts for management operations

### Sample Queries

#### Check available seats for a show
```sql
SELECT s.seat_id, s.seat_number, s.seat_type
FROM Seats s
WHERE s.screen_id = (SELECT screen_id FROM Shows WHERE show_id = 1)
AND s.seat_id NOT IN (
    SELECT bs.seat_id
    FROM Booking_Seats bs
    JOIN Bookings b ON bs.booking_id = b.booking_id
    WHERE b.show_id = 1 AND b.status = 'CONFIRMED'
);
```

#### List all shows for a specific date
```sql
SELECT
    m.title,
    t.name AS theatre,
    sc.screen_number,
    s.show_time,
    s.price
FROM Shows s
JOIN Movies m ON s.movie_id = m.movie_id
JOIN Screens sc ON s.screen_id = sc.screen_id
JOIN Theatres t ON sc.theatre_id = t.theatre_id
WHERE DATE(s.show_time) = '2026-03-20'
AND s.is_deleted = FALSE
ORDER BY s.show_time;
```

## Notes

### Realistic Data
- All data is production-quality and realistic
- Movie titles, theatre names, and locations are plausible
- Show times avoid conflicts considering movie durations

### Password Security
- Bcrypt hash format used (even for seed data)
- Cost factor: 10
- Never use these passwords in production

### Date Handling
- Shows start from 2026-03-20 (reference date in CLAUDE.md)
- 7-day date range for testing various scenarios
- Can be adjusted by modifying dates in 006_seed_shows.sql

### Performance
- Seat seeding uses stored procedure for efficiency
- 450 seats generated in ~1-2 seconds
- Procedure is dropped after execution (cleanup)

## Troubleshooting

### Error: "Table doesn't exist"
**Solution**: Run schema creation scripts first
```bash
mysql -u root -p movie_booking_db < database/schema/001_create_tables.sql
```

### Error: "Foreign key constraint fails"
**Solution**: Run seed files in correct order (001 through 006)

### Error: "Duplicate entry"
**Solution**: Scripts use TRUNCATE - ensure you have TRUNCATE privileges

### Slow execution on 004_seed_seats.sql
**Expected**: Generating 450 seats takes 1-2 seconds, this is normal

## Customization

### To modify user count
Edit `001_seed_users.sql` - add/remove INSERT statements

### To change theatre locations
Edit `002_seed_theatres.sql` - modify location strings

### To adjust seat layout
Edit `004_seed_seats.sql` - modify stored procedure logic
- Change rows: Modify `v_rows` variable
- Change seats per row: Modify inner WHILE loop limit
- Adjust VIP ratio: Modify seat type IF condition

### To add more shows
Edit `006_seed_shows.sql` - add INSERT statements
- Ensure no time conflicts per screen
- Consider movie duration for scheduling

## Clean Up

### Remove all seed data
```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Audit_Bookings;
TRUNCATE TABLE Payments;
TRUNCATE TABLE Booking_Seats;
TRUNCATE TABLE Bookings;
TRUNCATE TABLE Shows;
TRUNCATE TABLE Seats;
TRUNCATE TABLE Screens;
TRUNCATE TABLE Theatres;
TRUNCATE TABLE Movies;
TRUNCATE TABLE Users;
SET FOREIGN_KEY_CHECKS = 1;
```

### Reset database completely
```bash
# Drop and recreate database
mysql -u root -p -e "DROP DATABASE IF EXISTS movie_booking_db; CREATE DATABASE movie_booking_db;"

# Recreate schema
mysql -u root -p movie_booking_db < database/schema/001_create_tables.sql
mysql -u root -p movie_booking_db < database/schema/002_create_indexes.sql

# Reseed data
mysql -u root -p movie_booking_db < database/seeds/run_all_seeds.sql
```

## Contributing
When adding new seed data:
1. Maintain referential integrity
2. Use realistic data
3. Include verification queries
4. Update this README
5. Test with master script

## License
Part of the Movie Ticket Booking System project.
