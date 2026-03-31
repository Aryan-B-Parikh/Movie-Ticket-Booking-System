# Movie Ticket Booking System (DBMS-Focused)

This repository implements a database-first Movie Ticket Booking System using MySQL 8.

## Implemented Scope

- User registration and account data storage
- Movie, theater, screen, and show management
- Seat layout and availability tracking
- Transaction-safe booking and cancellation
- Payment status tracking
- Trigger and availability-view support for consistent seat tracking

## Tech Focus

- MySQL 8.0+
- InnoDB transaction engine
- ACID-compliant booking workflow

## Setup Order

Run SQL files in this exact order:

1. `sql/01_schema.sql`
2. `sql/03_triggers.sql`

Optional demo data is run inline by `run_full_system.ps1` (skip with `-SkipSeed`).

Example from MySQL shell:

```sql
SOURCE sql/01_schema.sql;
SOURCE sql/03_triggers.sql;
```

## Double-Booking Prevention

The system prevents double booking using:

- Database constraint: `UNIQUE (show_id, seat_id)` in `booking_seats`
- Trigger validation for booking-show-seat consistency
- Atomic transaction logic inside `ui-api-server.js` that writes bookings, booking_seats, and payments together after verifying availability

## Requirement Mapping

A structured SRS-to-implementation mapping is provided in `docs/srs_analysis.md`.

## SQL Explanation Docs

File-wise SQL explanations are available in `docs/sql_filewise_explanation.md`.

## Basic UI (Task Console + SQL Explorer)

The UI now supports real tasks against your DB:

- Select user, movie, show, and seats
- Create booking (multi-statement inserts into bookings, booking_seats, payments)
- Mark payment success (inline update on payments)
- Cancel booking (inline booking/payment updates plus seat release)
- Verify live DB state (seat counts, booking status)
- Explain SQL file-by-file with live source

Run locally from project root:

```powershell
$env:DB_USER="AryanParikh"
$env:DB_PASS="08Aryan@06Parikh"
node ui-api-server.js
```

Then open:

- `http://localhost:8090/ui/index.html`

## Full Working System (One Command - Windows)

If you already have MySQL credentials, use the one-command launcher from project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\run_full_system.ps1
```

What this does:

1. Validates MySQL connectivity
2. Applies `sql/01_schema.sql` (schema + availability view) and `sql/03_triggers.sql`, then runs the inline demo seed block (unless `-SkipSeed` is supplied)
3. Starts API + UI server at:
	- `http://localhost:8090/ui/index.html`

Optional (skip seeding):

```powershell
powershell -ExecutionPolicy Bypass -File .\run_full_system.ps1 -SkipSeed
```
