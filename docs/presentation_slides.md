# PPT Outline - First 3 Slides

## Slide 1 - Presenter Info
- Name: _Your Name_
- Roll/ID: _Your ID_
- Course / Semester: _Course name & term_
- Institution: _College / University_
- Contact: _Email / phone_
- Date: _Presentation date_

## Slide 2 - Project Overview
- Title: Movie Ticket Booking System (DBMS-focused)
- Purpose: End-to-end ticketing with a database-first design that enforces seat integrity and payment tracking.
- Key scope: user management, movies/theaters/screens/shows, seat availability, booking & cancellation, payments.
- Data integrity: InnoDB transactions, triggers for show overlap and seat consistency, availability view, `UNIQUE (show_id, seat_id)` guard.
- Tech stack: MySQL 8, Node.js API, lightweight web UI.
- Demo flow: seed sample data via `run_full_system.ps1`, book seats, mark payment success, cancel bookings, view seat status in UI.

## Slide 3 - ER Diagram
- Use this Mermaid ERD (export as image for PPT):

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : "makes"
    SHOWS ||--o{ BOOKINGS : "scheduled for"
    BOOKINGS ||--o{ BOOKING_SEATS : "includes"
    SHOWS ||--o{ BOOKING_SEATS : "seats belong to show"
    SEATS ||--o{ BOOKING_SEATS : "allocated"
    SCREENS ||--o{ SEATS : "has"
    THEATERS ||--o{ SCREENS : "contains"
    MOVIES ||--o{ SHOWS : "plays"
    BOOKINGS ||--|| PAYMENTS : "has"

    USERS {
      int user_id PK
      string name
      string email UNIQUE
      string phone UNIQUE
    }
    MOVIES {
      int movie_id PK
      string title
      int duration_minutes
    }
    THEATERS {
      int theater_id PK
      string name
      string location
    }
    SCREENS {
      int screen_id PK
      int theater_id FK
      string screen_name
      int capacity
    }
    SEATS {
      int seat_id PK
      int screen_id FK
      string seat_number
      string seat_type
    }
    SHOWS {
      int show_id PK
      int movie_id FK
      int screen_id FK
      datetime show_time
      datetime end_time
      decimal base_price
    }
    BOOKINGS {
      int booking_id PK
      int user_id FK
      int show_id FK
      string status
      int seat_count
      decimal total_amount
    }
    BOOKING_SEATS {
      int booking_id PK/FK
      int seat_id PK/FK
      int show_id FK
    }
    PAYMENTS {
      int payment_id PK
      int booking_id FK
      string status
      decimal amount
    }
```

- After this slide, append UI screenshots (seat map, booking creation, payment update, cancel flow) as additional PPT slides.
