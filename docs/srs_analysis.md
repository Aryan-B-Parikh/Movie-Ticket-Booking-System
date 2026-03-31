# SRS Analysis and Design Decisions

## Summary

Your proposed SRS is strong and already follows a DBMS-first direction. The implementation created in this repository keeps your normalized model and adds strict transactional enforcement for seat booking.

## Key Risks Identified in Proposed SRS

1. Double booking prevention was stated functionally, but needed a direct DB-level enforcement mechanism.
2. Booking-seat mapping needed explicit show context for high-concurrency uniqueness checks.
3. Cancellation behavior needed a deterministic rule to release seats and update payment states.

## Decisions Applied

1. Table names are pluralized (`users`, `shows`) to avoid confusion with SQL keywords.
2. `booking_seats` includes `show_id` with `UNIQUE (show_id, seat_id)` to guarantee one seat per show.
3. Booking workflow is managed inline inside the API with serialized inserts into bookings, booking_seats, and payments after seat availability validation.
4. Cancellation logic is handled inline by updating bookings, removing booking_seats, and adjusting payments within the same script-driven transaction loop.
5. Triggers validate screen-seat-show consistency and show schedule overlaps.
6. Multi-column indexes are declared directly within the table definitions to support show browsing, booking lookups, and payment tracking (e.g., `shows(screen_id, show_time)` and `bookings(user_id, booking_time)`).

## Requirement Traceability

| SRS Requirement | Implementation |
| --- | --- |
| User Management | `users` table with unique email and phone constraints |
| Movie Management | `movies` table with duration and metadata validation |
| Show Management | `shows` table + overlap checks in triggers |
| Seat Management | `seats` table per screen + availability view |
| Booking System | `bookings` + `booking_seats` with inline booking creation flow that validates seats and avoids conflicts |
| Payment System | `payments` table with inline updates from the payment-success endpoint |
| Prevent Double Booking | `UNIQUE (show_id, seat_id)` + API-level occupancy check on `booking_seats` before seat assignment |
| ACID Reliability | InnoDB tables + inline API transactions plus trigger-based guards |
| Query Performance | Multi-column indexes declared in the schema and the `v_show_seat_availability` view for efficient seat lookups |

## Normalization Check

- 1NF: All attributes are atomic and repeating groups are split into related tables.
- 2NF: Non-key attributes depend on whole keys; seat data depends on seat/screen entities.
- 3NF: Transitive attributes are separated (for example, theater location remains in `theaters`).

## Scope Notes

- Payment gateway integration remains out of scope, as requested.
- Minimal UI is intentionally not included in this DB-focused implementation.
