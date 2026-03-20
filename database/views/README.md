# Database Views - Movie Ticket Booking System

## Overview
This directory contains optimized SQL views designed to simplify complex queries and improve application performance. Each view serves a specific business purpose and follows database best practices.

## View Catalog

### 1. vw_available_seats
**File:** `vw_available_seats.sql`
**Purpose:** Real-time seat availability per show
**Performance Target:** < 50ms for typical queries

**Key Features:**
- Shows available/booked status for all seats
- Calculates pricing (base + VIP premium)
- Respects soft deletes (is_deleted = FALSE)
- Efficiently filters out CONFIRMED bookings

**Columns:**
- `show_id` - Show identifier
- `movie_title` - Movie name
- `theatre_name` - Theatre location
- `screen_number` - Screen within theatre
- `show_time` - Show datetime
- `seat_id` - Unique seat identifier
- `seat_number` - Display seat number (e.g., A1, B5)
- `seat_type` - ENUM('REGULAR', 'VIP')
- `is_available` - BOOLEAN (TRUE = can be booked)
- `price` - Calculated price (base or base * 1.5 for VIP)

**Common Queries:**
```sql
-- Get all available seats for a show
SELECT seat_number, seat_type, price
FROM vw_available_seats
WHERE show_id = 1 AND is_available = TRUE
ORDER BY seat_number;

-- Count available seats by type
SELECT seat_type, COUNT(*) as available_count
FROM vw_available_seats
WHERE show_id = 1 AND is_available = TRUE
GROUP BY seat_type;

-- Find cheapest available seats
SELECT seat_number, price
FROM vw_available_seats
WHERE show_id = 1 AND is_available = TRUE
ORDER BY price ASC
LIMIT 5;
```

---

### 2. vw_booking_summary
**File:** `vw_booking_summary.sql`
**Purpose:** Complete booking details for users and receipts
**Performance Target:** < 100ms for user history queries

**Key Features:**
- Aggregates all booking-related information
- Uses GROUP_CONCAT for seat numbers
- Includes payment status and method
- Filters out soft-deleted records
- Suitable for booking history and receipt generation

**Columns:**
- `booking_id` - Unique booking identifier
- `user_name` - Customer name
- `user_email` - Customer email
- `movie_title` - Movie being watched
- `theatre_name` - Theatre location
- `screen_number` - Screen number
- `show_time` - Show datetime
- `seat_numbers` - Comma-separated list (e.g., "A1, A2, A3")
- `total_amount` - Total paid amount
- `booking_status` - ENUM('CONFIRMED', 'CANCELLED')
- `booking_time` - When booking was created
- `payment_status` - SUCCESS, FAILED, or PENDING
- `payment_method` - Payment method used
- `payment_time` - Payment timestamp

**Common Queries:**
```sql
-- User booking history
SELECT booking_id, movie_title, show_time, seat_numbers, total_amount
FROM vw_booking_summary
WHERE user_email = 'john@example.com'
ORDER BY booking_time DESC;

-- Booking receipt details
SELECT *
FROM vw_booking_summary
WHERE booking_id = 123;

-- Recent bookings (last 7 days)
SELECT user_name, movie_title, show_time, total_amount
FROM vw_booking_summary
WHERE booking_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY booking_time DESC;

-- Failed payments requiring attention
SELECT booking_id, user_email, movie_title, total_amount
FROM vw_booking_summary
WHERE payment_status = 'FAILED'
ORDER BY booking_time DESC;
```

---

### 3. vw_show_occupancy
**File:** `vw_show_occupancy.sql`
**Purpose:** Admin reporting on theatre performance
**Performance Target:** < 200ms for dashboard queries

**Key Features:**
- Calculates occupancy percentages
- Tracks revenue per show
- Provides total/booked/available seat counts
- Supports business intelligence and reporting
- Essential for theatre management decisions

**Columns:**
- `show_id` - Show identifier
- `movie_title` - Movie name
- `theatre_name` - Theatre location
- `screen_number` - Screen number
- `show_time` - Show datetime
- `total_seats` - Total capacity
- `booked_seats` - Seats currently booked
- `available_seats` - Remaining available seats
- `occupancy_percentage` - % of seats booked (0-100)
- `revenue` - Total revenue from bookings

**Common Queries:**
```sql
-- Today's show performance
SELECT show_id, movie_title, show_time, occupancy_percentage, revenue
FROM vw_show_occupancy
WHERE DATE(show_time) = CURDATE()
ORDER BY show_time;

-- Low-occupancy shows (< 30%)
SELECT show_id, movie_title, show_time, occupancy_percentage
FROM vw_show_occupancy
WHERE occupancy_percentage < 30 AND show_time > NOW()
ORDER BY show_time;

-- Weekly revenue by theatre
SELECT
    theatre_name,
    COUNT(*) as total_shows,
    SUM(revenue) as total_revenue,
    AVG(occupancy_percentage) as avg_occupancy
FROM vw_show_occupancy
WHERE show_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY theatre_name
ORDER BY total_revenue DESC;

-- Movie performance ranking
SELECT
    movie_title,
    COUNT(*) as num_shows,
    AVG(occupancy_percentage) as avg_occupancy,
    SUM(revenue) as total_revenue
FROM vw_show_occupancy
GROUP BY movie_title
ORDER BY total_revenue DESC;
```

---

## Installation

### Step 1: Create Views
Run views in order (no dependencies between them):

```bash
mysql -u root -p movie_booking_system < vw_available_seats.sql
mysql -u root -p movie_booking_system < vw_booking_summary.sql
mysql -u root -p movie_booking_system < vw_show_occupancy.sql
```

Or from MySQL client:
```sql
USE movie_booking_system;
SOURCE /path/to/database/views/vw_available_seats.sql;
SOURCE /path/to/database/views/vw_booking_summary.sql;
SOURCE /path/to/database/views/vw_show_occupancy.sql;
```

### Step 2: Verify Installation
```sql
-- List all views
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- Test each view
SELECT * FROM vw_available_seats LIMIT 5;
SELECT * FROM vw_booking_summary LIMIT 5;
SELECT * FROM vw_show_occupancy LIMIT 5;
```

---

## Performance Considerations

### Indexing Requirements
All views depend on indexes created in `002_create_indexes.sql`:

**Critical Indexes:**
- `idx_show_deleted` on Shows(is_deleted, show_id)
- `idx_movie_deleted` on Movies(is_deleted)
- `idx_booking_status_deleted` on Bookings(status, is_deleted, show_id)
- `idx_booking_seats_composite` on Booking_Seats(seat_id, booking_id)
- `idx_show_time` on Shows(show_time)

**Verify Indexes:**
```sql
SHOW INDEX FROM Shows;
SHOW INDEX FROM Bookings;
SHOW INDEX FROM Booking_Seats;
```

### Query Performance Tips

1. **Always filter by show_id or date range**
   ```sql
   -- GOOD: Uses index
   SELECT * FROM vw_available_seats WHERE show_id = 1;

   -- BAD: Full table scan
   SELECT * FROM vw_available_seats WHERE movie_title LIKE '%Action%';
   ```

2. **Use LIMIT for large result sets**
   ```sql
   -- Pagination for user history
   SELECT * FROM vw_booking_summary
   WHERE user_email = 'user@example.com'
   ORDER BY booking_time DESC
   LIMIT 10 OFFSET 0;
   ```

3. **Add covering indexes for frequent queries**
   ```sql
   -- If frequently querying by user and status
   CREATE INDEX idx_booking_user_status
   ON Bookings(user_id, status, is_deleted);
   ```

### EXPLAIN Analysis
Before deploying queries to production, always analyze:

```sql
-- Check query execution plan
EXPLAIN SELECT * FROM vw_available_seats WHERE show_id = 1;

-- Look for:
-- - type: 'ref' or 'eq_ref' (GOOD)
-- - type: 'ALL' (BAD - full table scan)
-- - rows: Lower is better
-- - Extra: 'Using index' (GOOD)
```

---

## Optimization Strategies

### 1. Materialized Views (High-Traffic Scenarios)
For read-heavy applications, consider materialized views:

```sql
-- Create summary table
CREATE TABLE mv_show_occupancy_cache AS
SELECT * FROM vw_show_occupancy;

-- Add indexes
CREATE INDEX idx_cache_show ON mv_show_occupancy_cache(show_id);
CREATE INDEX idx_cache_time ON mv_show_occupancy_cache(show_time);

-- Refresh periodically (cron job every 5 minutes)
TRUNCATE TABLE mv_show_occupancy_cache;
INSERT INTO mv_show_occupancy_cache
SELECT * FROM vw_show_occupancy;
```

### 2. Application-Level Caching
Cache view results in Redis/Memcached:

```javascript
// Pseudocode
async function getAvailableSeats(showId) {
    const cacheKey = `available_seats:${showId}`;
    let seats = await redis.get(cacheKey);

    if (!seats) {
        seats = await db.query(
            'SELECT * FROM vw_available_seats WHERE show_id = ?',
            [showId]
        );
        await redis.setex(cacheKey, 300, JSON.stringify(seats)); // 5 min TTL
    }

    return JSON.parse(seats);
}
```

### 3. Query Result Caching (MySQL)
Enable MySQL query cache (if using MySQL < 8.0):

```sql
-- Check cache status
SHOW VARIABLES LIKE 'query_cache%';

-- Enable in my.cnf
query_cache_type = 1
query_cache_size = 64M
query_cache_limit = 2M
```

**Note:** MySQL 8.0 removed query cache. Use application-level caching instead.

### 4. Partitioning for Historical Data
Partition large tables by date:

```sql
-- Partition Shows by month
ALTER TABLE Shows
PARTITION BY RANGE (YEAR(show_time) * 100 + MONTH(show_time)) (
    PARTITION p202603 VALUES LESS THAN (202604),
    PARTITION p202604 VALUES LESS THAN (202605),
    PARTITION p202605 VALUES LESS THAN (202606),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

---

## Monitoring and Maintenance

### Performance Monitoring
```sql
-- Check slow queries
SELECT * FROM mysql.slow_log
WHERE sql_text LIKE '%vw_%'
ORDER BY query_time DESC
LIMIT 10;

-- View query statistics (MySQL 5.7+)
SELECT * FROM performance_schema.events_statements_summary_by_digest
WHERE DIGEST_TEXT LIKE '%vw_%'
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;
```

### Regular Maintenance Tasks

**Daily:**
- Monitor slow query log for view-related queries
- Check for missing indexes (EXPLAIN on frequent queries)

**Weekly:**
- Analyze table statistics: `ANALYZE TABLE Bookings, Shows, Seats;`
- Review query performance trends

**Monthly:**
- Optimize tables: `OPTIMIZE TABLE Bookings, Shows, Booking_Seats;`
- Review and update materialized views (if used)

---

## Troubleshooting

### Issue: Slow vw_available_seats queries
**Symptoms:** Query takes > 500ms for single show
**Causes:**
1. Missing index on Bookings(show_id, status, is_deleted)
2. Large number of seats per screen (> 500)
3. Many historical bookings

**Solutions:**
```sql
-- Add composite index
CREATE INDEX idx_booking_show_status_deleted
ON Bookings(show_id, status, is_deleted);

-- Filter future shows only
SELECT * FROM vw_available_seats
WHERE show_id = 1
  AND show_time >= NOW()
  AND is_available = TRUE;
```

### Issue: GROUP_CONCAT truncation in vw_booking_summary
**Symptoms:** seat_numbers shows "A1, A2, ..." instead of full list
**Cause:** GROUP_CONCAT default limit is 1024 bytes

**Solution:**
```sql
-- Increase limit in session
SET SESSION group_concat_max_len = 10000;

-- Or globally in my.cnf
[mysqld]
group_concat_max_len = 10000
```

### Issue: Outdated occupancy data
**Symptoms:** vw_show_occupancy shows stale data
**Cause:** Table statistics not updated

**Solution:**
```sql
-- Update statistics
ANALYZE TABLE Bookings, Booking_Seats, Shows;

-- Force view refresh (views are not cached, so this is rarely needed)
-- But you can flush query cache if enabled
FLUSH QUERY CACHE;
```

---

## Best Practices

### Do's:
✅ Always use `WHERE show_id = ?` for seat availability
✅ Add `LIMIT` clauses for user-facing queries
✅ Use prepared statements to prevent SQL injection
✅ Monitor query performance with EXPLAIN
✅ Filter by date ranges for historical queries
✅ Cache frequently accessed view results

### Don'ts:
❌ Don't query views without WHERE clauses in production
❌ Don't use `SELECT *` if you only need specific columns
❌ Don't ignore slow query logs
❌ Don't forget to update table statistics (ANALYZE TABLE)
❌ Don't bypass application-level caching
❌ Don't create additional indexes without benchmarking

---

## Integration Examples

### Backend API Usage (Node.js)
```javascript
// Get available seats for booking form
app.get('/api/shows/:showId/seats', async (req, res) => {
    const { showId } = req.params;

    const seats = await db.query(
        `SELECT seat_id, seat_number, seat_type, price
         FROM vw_available_seats
         WHERE show_id = ? AND is_available = TRUE
         ORDER BY seat_number`,
        [showId]
    );

    res.json({ seats });
});

// Get user booking history
app.get('/api/users/:email/bookings', async (req, res) => {
    const { email } = req.params;

    const bookings = await db.query(
        `SELECT booking_id, movie_title, theatre_name, show_time,
                seat_numbers, total_amount, booking_status
         FROM vw_booking_summary
         WHERE user_email = ?
         ORDER BY booking_time DESC
         LIMIT 20`,
        [email]
    );

    res.json({ bookings });
});

// Admin dashboard - show performance
app.get('/api/admin/shows/occupancy', async (req, res) => {
    const { startDate, endDate } = req.query;

    const report = await db.query(
        `SELECT show_id, movie_title, theatre_name, show_time,
                occupancy_percentage, revenue
         FROM vw_show_occupancy
         WHERE show_time BETWEEN ? AND ?
         ORDER BY show_time DESC`,
        [startDate, endDate]
    );

    res.json({ report });
});
```

### Backend API Usage (Python/FastAPI)
```python
from fastapi import FastAPI, Depends
from sqlalchemy import text
from typing import List

app = FastAPI()

@app.get("/shows/{show_id}/seats")
async def get_available_seats(show_id: int, db = Depends(get_db)):
    query = text("""
        SELECT seat_id, seat_number, seat_type, price
        FROM vw_available_seats
        WHERE show_id = :show_id AND is_available = TRUE
        ORDER BY seat_number
    """)

    result = db.execute(query, {"show_id": show_id})
    return {"seats": [dict(row) for row in result]}

@app.get("/users/{email}/bookings")
async def get_user_bookings(email: str, db = Depends(get_db)):
    query = text("""
        SELECT booking_id, movie_title, show_time,
               seat_numbers, total_amount
        FROM vw_booking_summary
        WHERE user_email = :email
        ORDER BY booking_time DESC
        LIMIT 20
    """)

    result = db.execute(query, {"email": email})
    return {"bookings": [dict(row) for row in result]}
```

---

## Testing

### Unit Tests for Views
```sql
-- Test 1: vw_available_seats should exclude booked seats
-- Given: A show with 2 seats, 1 booked
-- When: Query vw_available_seats
-- Then: Only 1 seat should show as available

-- Test 2: vw_booking_summary should aggregate seats correctly
-- Given: A booking with 3 seats
-- When: Query vw_booking_summary
-- Then: seat_numbers should contain all 3 seats

-- Test 3: vw_show_occupancy should calculate percentage correctly
-- Given: A screen with 100 seats, 75 booked
-- When: Query vw_show_occupancy
-- Then: occupancy_percentage should be 75.00

-- Test 4: Soft-deleted records should be excluded
-- Given: A show marked as is_deleted = TRUE
-- When: Query any view
-- Then: Show should not appear in results
```

### Performance Benchmarks
```sql
-- Benchmark vw_available_seats
SET @start = NOW(6);
SELECT * FROM vw_available_seats WHERE show_id = 1;
SELECT TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000 AS ms;
-- Expected: < 50ms

-- Benchmark vw_booking_summary
SET @start = NOW(6);
SELECT * FROM vw_booking_summary WHERE user_email = 'test@example.com';
SELECT TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000 AS ms;
-- Expected: < 100ms

-- Benchmark vw_show_occupancy
SET @start = NOW(6);
SELECT * FROM vw_show_occupancy WHERE DATE(show_time) = CURDATE();
SELECT TIMESTAMPDIFF(MICROSECOND, @start, NOW(6)) / 1000 AS ms;
-- Expected: < 200ms
```

---

## Support and Contribution

### Reporting Issues
If you encounter performance issues or bugs:
1. Capture the slow query with EXPLAIN output
2. Document table sizes and row counts
3. Include MySQL version and configuration
4. Report via project issue tracker

### Adding New Views
When creating additional views:
1. Follow naming convention: `vw_<purpose>.sql`
2. Include comprehensive header comments
3. Document all columns and their purpose
4. Provide sample queries and expected performance
5. Note index dependencies
6. Add entry to this README

---

## Version History

**Version 1.0** (2026-03-20)
- Initial release
- Three core views created
- Documentation and examples added

---

## References

- **CLAUDE.md**: Project coding standards
- **PRD.md Section 8.1**: View specifications
- **002_create_indexes.sql**: Index definitions
- **001_create_tables.sql**: Table schema

---

**Maintained by:** Development Team
**Last Updated:** 2026-03-20
**MySQL Version:** 8.0+
**License:** MIT
