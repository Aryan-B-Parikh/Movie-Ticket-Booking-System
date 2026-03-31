# SQL File-Wise Implementation Explanation (Current)

This document explains the SQL implementation currently present in this repository.
It is aligned with these files:

1. sql/01_schema.sql
2. sql/03_triggers.sql
3. Inline seed block embedded inside run_full_system.ps1

## 1. sql/01_schema.sql

Purpose:
- Creates the database movie_ticket_booking.
- Defines all transactional entities, relationships, and the seat availability view.
- Keeps the entire schema in one place so the demo is easy to read and refactor.

Table-by-table summary:

1. users
- Primary key: user_id
- Unique: email, phone
- Stores identity and login hash fields.

2. movies
- Primary key: movie_id
- Includes metadata like title, genre, language, certificate, release_date.
- CHECK constraint on duration_minutes: 30 to 400.

3. theaters
- Primary key: theater_id
- Unique pair: name + location.

4. screens
- Primary key: screen_id
- Foreign key to theaters(theater_id) with CASCADE on delete.
- Unique pair: theater_id + screen_name.
- CHECK capacity > 0.

5. seats
- Primary key: seat_id
- Foreign key to screens(screen_id) with CASCADE on delete.
- Unique pair: screen_id + seat_number.
- Seat types: REGULAR, PREMIUM, RECLINER.

6. shows
- Primary key: show_id
- Foreign keys to movies and screens.
- Unique pair: screen_id + show_time.
- Price and time order checks:
  - base_price > 0
  - end_time is null or end_time > show_time
- Status enum: SCHEDULED, CANCELLED, COMPLETED.

7. bookings
- Primary key: booking_id
- Foreign keys to users and shows.
- Status enum: PENDING, CONFIRMED, CANCELLED, EXPIRED.
- Tracks seat_count, total_amount, cancelled_time.
- CHECK total_amount >= 0.

8. booking_seats
- Composite primary key: booking_id + seat_id.
- Critical uniqueness: UNIQUE(show_id, seat_id) to prevent double booking in one show.
- Foreign keys to bookings, shows, seats.

9. payments
- Primary key: payment_id
- One-to-one with bookings via UNIQUE(booking_id).
- Optional unique transaction reference via UNIQUE(transaction_ref).
- Status enum: PENDING, SUCCESS, FAILED, REFUNDED.
- CHECK amount > 0.

10. v_show_seat_availability view (defined at the end of this file)
- Joins shows → seats → booking_seats → bookings.
- Treats PENDING and CONFIRMED bookings as occupied.
- Filters to scheduled shows only and exposes seat-level availability (AVAILABLE/BOOKED).
- Included here so the API can render seat maps without maintaining another query file.

## 2. sql/03_triggers.sql

Purpose:
- Enforces business rules before data is persisted.

Trigger details:

1. trg_shows_validate_bi (BEFORE INSERT on shows)
- Auto-derives end_time from movie duration when end_time is null.
- Rejects invalid time order.
- Rejects overlapping scheduled shows on the same screen.

2. trg_shows_validate_bu (BEFORE UPDATE on shows)
- Same validations as insert trigger.
- Excludes the row being updated from overlap check.

3. trg_booking_seats_validate_bi (BEFORE INSERT on booking_seats)
- Ensures booking exists.
- Ensures booking_seats.show_id matches bookings.show_id.
- Allows seat assignment only for booking statuses PENDING or CONFIRMED.
- Ensures seat belongs to the screen of the selected show.

4. trg_bookings_set_cancelled_time_bu (BEFORE UPDATE on bookings)
- Automatically sets cancelled_time when status changes to CANCELLED.

## 3. Inline demo seed block (run_full_system.ps1)

Purpose:
- Recreates deterministic demo records directly from the one-command launcher so no separate sql/05 file is needed.
- Runs only when the script is executed without `-SkipSeed`, keeping the seeding optional.

Current seeded coverage:
- 2 users
- 2 movies
- 1 theater
- 2 screens (10 seats each)
- 3 scheduled shows

Implementation note:
- Uses INSERT ... ON DUPLICATE KEY UPDATE logic copied from the previous sql/05 file.
- The block is executed with a single `mysql --execute` call, so re-running the launcher is safe.

## Mapping to Current UI/API

The current UI API server at ui-api-server.js uses this SQL layer as follows:

1. Booking create endpoint → multi-statement inserts directly into bookings, booking_seats, and payments.
2. Booking cancel endpoint → inline booking status update, seat release, and payment refund/failure handling.
3. Payment success endpoint → inline update to the payments row.
4. Seat listing endpoint → reads from v_show_seat_availability for AVAILABLE seats.
5. Admin show CRUD → direct, validated DML on shows and related tables.
6. User create endpoint → direct insert with uniqueness checks.

## Integrity Summary

The design enforces integrity at three levels:

1. Structural constraints: PK, FK, UNIQUE, CHECK.
2. Trigger-level guards: overlap checks, cross-table seat/screen consistency, auto-cancel timestamp enforcement.
3. A dedicated availability view keeps the UI-driven seat lookup consistent across endpoints.

This combination is what makes the current schema reliable for concurrent ticket booking.