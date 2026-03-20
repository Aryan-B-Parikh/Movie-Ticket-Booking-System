# Database Migration and Deployment Guide

## Overview
This guide covers comprehensive database deployment strategies for the Movie Ticket Booking System, including schema migrations, data seeding, backup/restore procedures, and performance optimization.

## Database Architecture Overview

### Schema Structure
```
movie_booking_system/
├── Users (Authentication & User Management)
├── Movies (Movie Catalog)
├── Theatres (Cinema Locations)
├── Screens (Individual Screens)
├── Seats (Seat Configuration)
├── Shows (Movie Screenings)
├── Bookings (Ticket Bookings)
├── Booking_Seats (Many-to-Many Junction)
└── Payments (Payment Records)
```

### Migration Strategy
- **Version-based migrations**: Each migration has a sequential number
- **Rollback support**: All migrations include rollback scripts
- **Data integrity**: Migrations preserve existing data
- **Performance**: Minimal downtime during migrations

## Migration Framework

### 1. Migration Directory Structure
```
database/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_indexes.sql
│   ├── 003_add_constraints.sql
│   ├── 004_stored_procedures.sql
│   ├── 005_triggers_and_views.sql
│   └── rollback/
│       ├── 001_rollback_initial_schema.sql
│       ├── 002_rollback_indexes.sql
│       ├── 003_rollback_constraints.sql
│       ├── 004_rollback_procedures.sql
│       └── 005_rollback_triggers_views.sql
├── seeds/
│   ├── development/
│   ├── production/
│   └── testing/
├── scripts/
│   ├── migrate.sh
│   ├── rollback.sh
│   ├── backup.sh
│   └── restore.sh
└── utilities/
    ├── migration_tracker.sql
    ├── performance_monitor.sql
    └── data_validator.sql
```

### 2. Migration Tracking System

Create `database/utilities/migration_tracker.sql`:
```sql
-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) NOT NULL PRIMARY KEY,
    description TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INT,
    rollback_available BOOLEAN DEFAULT TRUE,
    checksum VARCHAR(64),
    INDEX idx_executed_at (executed_at)
);

-- Migration logging table
CREATE TABLE IF NOT EXISTS migration_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(255) NOT NULL,
    operation ENUM('MIGRATE', 'ROLLBACK') NOT NULL,
    status ENUM('STARTED', 'COMPLETED', 'FAILED') NOT NULL,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    execution_time_ms INT,
    INDEX idx_version_operation (version, operation),
    INDEX idx_status_started (status, started_at)
);

-- Stored procedure to log migration operations
DELIMITER $$
CREATE PROCEDURE sp_log_migration(
    IN p_version VARCHAR(255),
    IN p_operation ENUM('MIGRATE', 'ROLLBACK'),
    IN p_status ENUM('STARTED', 'COMPLETED', 'FAILED'),
    IN p_error_message TEXT DEFAULT NULL
)
BEGIN
    DECLARE v_log_id INT;
    DECLARE v_execution_time INT DEFAULT NULL;

    IF p_status = 'STARTED' THEN
        INSERT INTO migration_log (version, operation, status, started_at)
        VALUES (p_version, p_operation, p_status, NOW());
        SET v_log_id = LAST_INSERT_ID();
        SET @migration_log_id = v_log_id;
    ELSEIF p_status IN ('COMPLETED', 'FAILED') THEN
        SELECT TIMESTAMPDIFF(MICROSECOND, started_at, NOW()) / 1000
        INTO v_execution_time
        FROM migration_log
        WHERE id = @migration_log_id;

        UPDATE migration_log
        SET status = p_status,
            completed_at = NOW(),
            execution_time_ms = v_execution_time,
            error_message = p_error_message
        WHERE id = @migration_log_id;
    END IF;
END$$
DELIMITER ;
```

## Migration Scripts

### 1. Migration Script Framework

Create `database/scripts/migrate.sh`:
```bash
#!/bin/bash

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-movie_booking_system}
MIGRATION_DIR="$(dirname "$0")/../migrations"
BACKUP_DIR="$(dirname "$0")/../backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Database connection function
mysql_exec() {
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "$1"
}

mysql_exec_file() {
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$1"
}

# Initialize migration tracking
init_migration_tracking() {
    log "Initializing migration tracking system..."

    mysql_exec_file "$(dirname "$0")/../utilities/migration_tracker.sql"

    if [ $? -eq 0 ]; then
        log "Migration tracking system initialized successfully"
    else
        error "Failed to initialize migration tracking system"
        exit 1
    fi
}

# Check if migration was already applied
is_migration_applied() {
    local version=$1
    local count=$(mysql_exec "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';" | tail -1)
    echo $count
}

# Create backup before migration
create_backup() {
    local backup_name="pre_migration_$(date +%Y%m%d_%H%M%S).sql"
    local backup_path="$BACKUP_DIR/$backup_name"

    log "Creating backup before migration: $backup_name"

    mkdir -p "$BACKUP_DIR"

    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --hex-blob \
        --default-character-set=utf8mb4 \
        "$DB_NAME" > "$backup_path"

    if [ $? -eq 0 ]; then
        log "Backup created successfully: $backup_path"
        echo "$backup_path"
    else
        error "Failed to create backup"
        exit 1
    fi
}

# Apply single migration
apply_migration() {
    local migration_file=$1
    local version=$(basename "$migration_file" .sql)
    local description=$(head -n 5 "$migration_file" | grep "Description:" | cut -d: -f2- | xargs)

    log "Applying migration: $version"
    log "Description: $description"

    # Check if already applied
    if [ "$(is_migration_applied "$version")" -gt 0 ]; then
        warn "Migration $version already applied, skipping"
        return 0
    fi

    # Log migration start
    mysql_exec "CALL sp_log_migration('$version', 'MIGRATE', 'STARTED');"

    # Calculate checksum
    local checksum=$(md5sum "$migration_file" | cut -d' ' -f1)

    # Apply migration with transaction
    local start_time=$(date +%s%3N)

    {
        echo "START TRANSACTION;"
        cat "$migration_file"
        echo "COMMIT;"
    } | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"

    local migration_result=$?
    local end_time=$(date +%s%3N)
    local execution_time=$((end_time - start_time))

    if [ $migration_result -eq 0 ]; then
        # Record successful migration
        mysql_exec "INSERT INTO schema_migrations (version, description, execution_time_ms, checksum)
                    VALUES ('$version', '$description', $execution_time, '$checksum');"
        mysql_exec "CALL sp_log_migration('$version', 'MIGRATE', 'COMPLETED');"
        log "Migration $version applied successfully in ${execution_time}ms"
        return 0
    else
        # Record failed migration
        mysql_exec "CALL sp_log_migration('$version', 'MIGRATE', 'FAILED', 'Migration script failed');"
        error "Migration $version failed"
        return 1
    fi
}

# Run all pending migrations
run_migrations() {
    local target_version=$1

    log "Starting database migration process..."

    # Initialize migration tracking if not exists
    init_migration_tracking

    # Create backup
    create_backup

    # Find migration files
    local migration_files=$(find "$MIGRATION_DIR" -name "*.sql" | sort)

    for migration_file in $migration_files; do
        local version=$(basename "$migration_file" .sql)

        # If target version specified, stop after reaching it
        if [ -n "$target_version" ] && [ "$version" = "$target_version" ]; then
            apply_migration "$migration_file"
            break
        elif [ -z "$target_version" ]; then
            apply_migration "$migration_file"
            if [ $? -ne 0 ]; then
                error "Migration failed, stopping process"
                exit 1
            fi
        fi
    done

    log "Migration process completed successfully"
}

# Show migration status
show_status() {
    log "Current migration status:"

    mysql_exec "SELECT version, description, executed_at, execution_time_ms
                FROM schema_migrations
                ORDER BY version;" | column -t
}

# Main execution
case "$1" in
    "up")
        run_migrations "$2"
        ;;
    "status")
        show_status
        ;;
    "init")
        init_migration_tracking
        ;;
    *)
        echo "Usage: $0 {up|status|init} [target_version]"
        echo "  up [version]    - Run migrations up to specified version (or all)"
        echo "  status          - Show current migration status"
        echo "  init            - Initialize migration tracking system"
        exit 1
        ;;
esac
```

### 2. Rollback Script

Create `database/scripts/rollback.sh`:
```bash
#!/bin/bash

# Configuration (same as migrate.sh)
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-movie_booking_system}
MIGRATION_DIR="$(dirname "$0")/../migrations"
ROLLBACK_DIR="$(dirname "$0")/../migrations/rollback"

# Include same utility functions as migrate.sh
source "$(dirname "$0")/migrate.sh"

# Rollback single migration
rollback_migration() {
    local version=$1
    local rollback_file="$ROLLBACK_DIR/${version}_rollback.sql"

    log "Rolling back migration: $version"

    # Check if migration exists
    if [ "$(is_migration_applied "$version")" -eq 0 ]; then
        warn "Migration $version not applied, nothing to rollback"
        return 0
    fi

    # Check if rollback file exists
    if [ ! -f "$rollback_file" ]; then
        error "Rollback file not found: $rollback_file"
        return 1
    fi

    # Create backup before rollback
    create_backup

    # Log rollback start
    mysql_exec "CALL sp_log_migration('$version', 'ROLLBACK', 'STARTED');"

    # Apply rollback
    local start_time=$(date +%s%3N)

    {
        echo "START TRANSACTION;"
        cat "$rollback_file"
        echo "COMMIT;"
    } | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"

    local rollback_result=$?
    local end_time=$(date +%s%3N)
    local execution_time=$((end_time - start_time))

    if [ $rollback_result -eq 0 ]; then
        # Remove from migration tracking
        mysql_exec "DELETE FROM schema_migrations WHERE version = '$version';"
        mysql_exec "CALL sp_log_migration('$version', 'ROLLBACK', 'COMPLETED');"
        log "Migration $version rolled back successfully in ${execution_time}ms"
        return 0
    else
        mysql_exec "CALL sp_log_migration('$version', 'ROLLBACK', 'FAILED', 'Rollback script failed');"
        error "Rollback of migration $version failed"
        return 1
    fi
}

# Rollback to specific version
rollback_to_version() {
    local target_version=$1

    log "Rolling back to version: $target_version"

    # Get migrations to rollback (in reverse order)
    local migrations_to_rollback=$(mysql_exec "SELECT version FROM schema_migrations
                                              WHERE version > '$target_version'
                                              ORDER BY version DESC;" | tail -n +2)

    for version in $migrations_to_rollback; do
        rollback_migration "$version"
        if [ $? -ne 0 ]; then
            error "Rollback failed, stopping process"
            exit 1
        fi
    done

    log "Rollback completed successfully"
}

# Main execution for rollback
case "$1" in
    "down")
        if [ -z "$2" ]; then
            error "Version number required for rollback"
            exit 1
        fi
        rollback_migration "$2"
        ;;
    "to")
        if [ -z "$2" ]; then
            error "Target version required"
            exit 1
        fi
        rollback_to_version "$2"
        ;;
    *)
        echo "Usage: $0 {down|to} <version>"
        echo "  down <version>  - Rollback specific migration"
        echo "  to <version>    - Rollback to specific version"
        exit 1
        ;;
esac
```

## Schema Migrations

### 1. Initial Schema Migration

Create `database/migrations/001_initial_schema.sql`:
```sql
-- Description: Initial database schema for Movie Ticket Booking System
-- Version: 001
-- Author: System
-- Date: 2024-01-01

-- Set session settings for consistent behavior
SET FOREIGN_KEY_CHECKS = 0;
SET SESSION sql_mode = 'TRADITIONAL,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';

-- Users table for authentication and user management
CREATE TABLE Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('USER', 'ADMIN') DEFAULT 'USER' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Movies table for movie catalog
CREATE TABLE Movies (
    movie_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    duration_minutes INT NOT NULL,
    language VARCHAR(50) NOT NULL,
    rating ENUM('U', 'UA', 'A', 'S') NOT NULL,
    release_date DATE NOT NULL,
    poster_url VARCHAR(500),
    trailer_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Theatres table for cinema locations
CREATE TABLE Theatres (
    theatre_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Screens table for individual cinema screens
CREATE TABLE Screens (
    screen_id INT PRIMARY KEY AUTO_INCREMENT,
    theatre_id INT NOT NULL,
    screen_name VARCHAR(50) NOT NULL,
    total_seats INT NOT NULL,
    screen_type ENUM('2D', '3D', 'IMAX', 'DOLBY') DEFAULT '2D',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (theatre_id) REFERENCES Theatres(theatre_id) ON DELETE CASCADE,
    UNIQUE KEY unique_screen_per_theatre (theatre_id, screen_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seats table for individual seats
CREATE TABLE Seats (
    seat_id INT PRIMARY KEY AUTO_INCREMENT,
    screen_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    seat_row VARCHAR(5) NOT NULL,
    seat_column INT NOT NULL,
    seat_type ENUM('REGULAR', 'PREMIUM', 'VIP') DEFAULT 'REGULAR',
    base_price DECIMAL(8,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (screen_id) REFERENCES Screens(screen_id) ON DELETE CASCADE,
    UNIQUE KEY unique_seat_per_screen (screen_id, seat_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shows table for movie screenings
CREATE TABLE Shows (
    show_id INT PRIMARY KEY AUTO_INCREMENT,
    movie_id INT NOT NULL,
    screen_id INT NOT NULL,
    show_date DATE NOT NULL,
    show_time TIME NOT NULL,
    end_time TIME NOT NULL,
    base_price DECIMAL(8,2) NOT NULL,
    premium_price DECIMAL(8,2) NOT NULL,
    vip_price DECIMAL(8,2) NOT NULL,
    available_seats INT NOT NULL,
    status ENUM('ACTIVE', 'CANCELLED', 'COMPLETED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (screen_id) REFERENCES Screens(screen_id) ON DELETE CASCADE,
    UNIQUE KEY unique_show_time (screen_id, show_date, show_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bookings table for ticket bookings
CREATE TABLE Bookings (
    booking_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    show_id INT NOT NULL,
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    total_seats INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    booking_fee DECIMAL(8,2) DEFAULT 0.00,
    discount_amount DECIMAL(8,2) DEFAULT 0.00,
    final_amount DECIMAL(10,2) NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED') DEFAULT 'PENDING',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_time TIMESTAMP NOT NULL,
    cancellation_reason TEXT NULL,
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (show_id) REFERENCES Shows(show_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Junction table for booking and seats (Many-to-Many)
CREATE TABLE Booking_Seats (
    booking_seat_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    seat_id INT NOT NULL,
    seat_price DECIMAL(8,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES Seats(seat_id) ON DELETE CASCADE,
    UNIQUE KEY unique_booking_seat (booking_id, seat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments table for payment records
CREATE TABLE Payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    payment_reference VARCHAR(100) UNIQUE NOT NULL,
    payment_method ENUM('CARD', 'UPI', 'WALLET', 'NET_BANKING') NOT NULL,
    payment_gateway ENUM('RAZORPAY', 'PAYTM', 'STRIPE') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    gateway_fee DECIMAL(8,2) DEFAULT 0.00,
    payment_status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    gateway_transaction_id VARCHAR(100),
    gateway_response JSON,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_date TIMESTAMP NULL,
    refund_reference VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit table for tracking important changes
CREATE TABLE Audit_Log (
    audit_id INT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(50) NOT NULL,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    record_id INT NOT NULL,
    old_values JSON,
    new_values JSON,
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL,
    INDEX idx_table_operation (table_name, operation),
    INDEX idx_record_id (record_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
```

### 2. Index Migration

Create `database/migrations/002_add_indexes.sql`:
```sql
-- Description: Add performance indexes for Movie Ticket Booking System
-- Version: 002
-- Author: System
-- Date: 2024-01-01

-- Users table indexes
ALTER TABLE Users
ADD INDEX idx_email (email),
ADD INDEX idx_phone (phone),
ADD INDEX idx_role_active (role, is_active),
ADD INDEX idx_created_at (created_at),
ADD INDEX idx_last_login (last_login);

-- Movies table indexes
ALTER TABLE Movies
ADD INDEX idx_title (title),
ADD INDEX idx_genre (genre),
ADD INDEX idx_language (language),
ADD INDEX idx_rating (rating),
ADD INDEX idx_release_date (release_date),
ADD INDEX idx_active_release (is_active, release_date),
ADD FULLTEXT idx_title_description (title, description);

-- Theatres table indexes
ALTER TABLE Theatres
ADD INDEX idx_city_state (city, state),
ADD INDEX idx_postal_code (postal_code),
ADD INDEX idx_location (latitude, longitude),
ADD INDEX idx_active (is_active);

-- Screens table indexes
ALTER TABLE Screens
ADD INDEX idx_theatre_active (theatre_id, is_active),
ADD INDEX idx_screen_type (screen_type);

-- Seats table indexes
ALTER TABLE Seats
ADD INDEX idx_screen_seat (screen_id, seat_number),
ADD INDEX idx_screen_type (screen_id, seat_type),
ADD INDEX idx_row_column (seat_row, seat_column),
ADD INDEX idx_seat_type_active (seat_type, is_active),
ADD INDEX idx_base_price (base_price);

-- Shows table indexes
ALTER TABLE Shows
ADD INDEX idx_movie_date (movie_id, show_date),
ADD INDEX idx_screen_date (screen_id, show_date),
ADD INDEX idx_show_datetime (show_date, show_time),
ADD INDEX idx_status_date (status, show_date),
ADD INDEX idx_available_seats (available_seats),
ADD INDEX idx_movie_status (movie_id, status),
ADD INDEX idx_screen_status (screen_id, status);

-- Bookings table indexes
ALTER TABLE Bookings
ADD INDEX idx_user_booking_date (user_id, booking_date),
ADD INDEX idx_show_status (show_id, status),
ADD INDEX idx_booking_reference (booking_reference),
ADD INDEX idx_status_date (status, booking_date),
ADD INDEX idx_expiry_time (expiry_time),
ADD INDEX idx_booking_date (booking_date),
ADD INDEX idx_user_status (user_id, status);

-- Booking_Seats table indexes
ALTER TABLE Booking_Seats
ADD INDEX idx_booking_id (booking_id),
ADD INDEX idx_seat_id (seat_id),
ADD INDEX idx_seat_price (seat_price);

-- Payments table indexes
ALTER TABLE Payments
ADD INDEX idx_booking_payment (booking_id, payment_status),
ADD INDEX idx_payment_reference (payment_reference),
ADD INDEX idx_payment_method (payment_method),
ADD INDEX idx_payment_status (payment_status),
ADD INDEX idx_payment_date (payment_date),
ADD INDEX idx_gateway_transaction (gateway_transaction_id),
ADD INDEX idx_status_date (payment_status, payment_date);

-- Audit_Log table indexes
ALTER TABLE Audit_Log
ADD INDEX idx_table_operation (table_name, operation),
ADD INDEX idx_record_id (record_id),
ADD INDEX idx_user_id (user_id),
ADD INDEX idx_created_at (created_at),
ADD INDEX idx_table_record (table_name, record_id);
```

### 3. Constraints Migration

Create `database/migrations/003_add_constraints.sql`:
```sql
-- Description: Add data integrity constraints
-- Version: 003
-- Author: System
-- Date: 2024-01-01

-- Users table constraints
ALTER TABLE Users
ADD CONSTRAINT chk_users_email_format
    CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT chk_users_phone_format
    CHECK (phone REGEXP '^[0-9]{10,15}$'),
ADD CONSTRAINT chk_users_name_length
    CHECK (CHAR_LENGTH(TRIM(name)) >= 2);

-- Movies table constraints
ALTER TABLE Movies
ADD CONSTRAINT chk_movies_duration_positive
    CHECK (duration_minutes > 0 AND duration_minutes <= 600),
ADD CONSTRAINT chk_movies_title_length
    CHECK (CHAR_LENGTH(TRIM(title)) >= 1),
ADD CONSTRAINT chk_movies_release_date
    CHECK (release_date >= '1900-01-01');

-- Theatres table constraints
ALTER TABLE Theatres
ADD CONSTRAINT chk_theatres_name_length
    CHECK (CHAR_LENGTH(TRIM(name)) >= 2),
ADD CONSTRAINT chk_theatres_postal_code
    CHECK (postal_code REGEXP '^[0-9]{5,10}$'),
ADD CONSTRAINT chk_theatres_latitude
    CHECK (latitude BETWEEN -90 AND 90),
ADD CONSTRAINT chk_theatres_longitude
    CHECK (longitude BETWEEN -180 AND 180);

-- Screens table constraints
ALTER TABLE Screens
ADD CONSTRAINT chk_screens_total_seats_positive
    CHECK (total_seats > 0 AND total_seats <= 1000),
ADD CONSTRAINT chk_screens_name_length
    CHECK (CHAR_LENGTH(TRIM(screen_name)) >= 1);

-- Seats table constraints
ALTER TABLE Seats
ADD CONSTRAINT chk_seats_seat_number_length
    CHECK (CHAR_LENGTH(TRIM(seat_number)) >= 1),
ADD CONSTRAINT chk_seats_seat_row_format
    CHECK (seat_row REGEXP '^[A-Z]{1,2}$'),
ADD CONSTRAINT chk_seats_seat_column_positive
    CHECK (seat_column > 0 AND seat_column <= 50),
ADD CONSTRAINT chk_seats_base_price_positive
    CHECK (base_price > 0);

-- Shows table constraints
ALTER TABLE Shows
ADD CONSTRAINT chk_shows_show_time_valid
    CHECK (show_time BETWEEN '06:00:00' AND '23:59:59'),
ADD CONSTRAINT chk_shows_end_after_start
    CHECK (end_time > show_time),
ADD CONSTRAINT chk_shows_prices_positive
    CHECK (base_price > 0 AND premium_price > 0 AND vip_price > 0),
ADD CONSTRAINT chk_shows_price_hierarchy
    CHECK (premium_price >= base_price AND vip_price >= premium_price),
ADD CONSTRAINT chk_shows_available_seats_valid
    CHECK (available_seats >= 0),
ADD CONSTRAINT chk_shows_future_date
    CHECK (show_date >= CURDATE() OR
           (show_date = CURDATE() AND show_time >= CURTIME()));

-- Bookings table constraints
ALTER TABLE Bookings
ADD CONSTRAINT chk_bookings_total_seats_positive
    CHECK (total_seats > 0 AND total_seats <= 20),
ADD CONSTRAINT chk_bookings_amounts_positive
    CHECK (total_amount > 0 AND final_amount > 0),
ADD CONSTRAINT chk_bookings_discount_valid
    CHECK (discount_amount >= 0 AND discount_amount <= total_amount),
ADD CONSTRAINT chk_bookings_final_amount_calculation
    CHECK (final_amount = total_amount + booking_fee - discount_amount),
ADD CONSTRAINT chk_bookings_expiry_future
    CHECK (expiry_time > booking_date),
ADD CONSTRAINT chk_bookings_reference_format
    CHECK (booking_reference REGEXP '^BK[0-9]{12,18}$');

-- Booking_Seats table constraints
ALTER TABLE Booking_Seats
ADD CONSTRAINT chk_booking_seats_price_positive
    CHECK (seat_price > 0);

-- Payments table constraints
ALTER TABLE Payments
ADD CONSTRAINT chk_payments_amount_positive
    CHECK (amount > 0),
ADD CONSTRAINT chk_payments_gateway_fee_valid
    CHECK (gateway_fee >= 0),
ADD CONSTRAINT chk_payments_refund_amount_valid
    CHECK (refund_amount >= 0 AND refund_amount <= amount),
ADD CONSTRAINT chk_payments_reference_format
    CHECK (payment_reference REGEXP '^PAY[0-9A-Z]{8,20}$');
```

## Data Seeding Framework

### 1. Environment-Specific Seeds

Create `database/seeds/development/001_seed_users.sql`:
```sql
-- Development user data
INSERT INTO Users (name, email, phone, password_hash, role, email_verified) VALUES
('John Doe', 'john@example.com', '9876543210', '$2b$10$example_hash_1', 'USER', TRUE),
('Jane Smith', 'jane@example.com', '9876543211', '$2b$10$example_hash_2', 'USER', TRUE),
('Admin User', 'admin@moviebooking.com', '9876543212', '$2b$10$example_hash_3', 'ADMIN', TRUE),
('Test User 1', 'test1@example.com', '9876543213', '$2b$10$example_hash_4', 'USER', FALSE),
('Test User 2', 'test2@example.com', '9876543214', '$2b$10$example_hash_5', 'USER', TRUE);
```

Create `database/seeds/development/002_seed_movies.sql`:
```sql
-- Development movie data
INSERT INTO Movies (title, description, genre, duration_minutes, language, rating, release_date, poster_url) VALUES
('The Great Adventure', 'An epic adventure movie with stunning visuals', 'Action', 150, 'English', 'UA', '2024-01-15', 'https://example.com/posters/great-adventure.jpg'),
('Comedy Central', 'A hilarious comedy that will make you laugh', 'Comedy', 120, 'Hindi', 'U', '2024-02-01', 'https://example.com/posters/comedy-central.jpg'),
('Drama Heights', 'An emotional drama about family relationships', 'Drama', 180, 'English', 'A', '2024-01-20', 'https://example.com/posters/drama-heights.jpg'),
('Sci-Fi Future', 'A futuristic science fiction thriller', 'Sci-Fi', 140, 'English', 'UA', '2024-02-10', 'https://example.com/posters/scifi-future.jpg'),
('Horror Nights', 'A spine-chilling horror experience', 'Horror', 110, 'Hindi', 'A', '2024-01-25', 'https://example.com/posters/horror-nights.jpg');
```

### 2. Seed Management Script

Create `database/scripts/seed.sh`:
```bash
#!/bin/bash

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-movie_booking_system}
ENVIRONMENT=${ENVIRONMENT:-development}
SEEDS_DIR="$(dirname "$0")/../seeds"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Database execution function
mysql_exec_file() {
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$1"
}

# Seed specific environment
seed_environment() {
    local env=$1
    local env_seeds_dir="$SEEDS_DIR/$env"

    if [ ! -d "$env_seeds_dir" ]; then
        error "Seeds directory for environment '$env' not found: $env_seeds_dir"
        return 1
    fi

    log "Seeding data for environment: $env"

    # Find and execute seed files in order
    local seed_files=$(find "$env_seeds_dir" -name "*.sql" | sort)

    for seed_file in $seed_files; do
        local filename=$(basename "$seed_file")
        log "Executing seed file: $filename"

        mysql_exec_file "$seed_file"

        if [ $? -eq 0 ]; then
            log "Successfully executed: $filename"
        else
            error "Failed to execute: $filename"
            return 1
        fi
    done

    log "Environment seeding completed successfully"
}

# Clean database
clean_data() {
    log "Cleaning existing data..."

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Audit_Log;
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
EOF

    if [ $? -eq 0 ]; then
        log "Database cleaned successfully"
    else
        error "Failed to clean database"
        return 1
    fi
}

# Verify seeded data
verify_data() {
    log "Verifying seeded data..."

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
SELECT
    'Users' as Table_Name, COUNT(*) as Record_Count FROM Users
UNION ALL SELECT
    'Movies', COUNT(*) FROM Movies
UNION ALL SELECT
    'Theatres', COUNT(*) FROM Theatres
UNION ALL SELECT
    'Screens', COUNT(*) FROM Screens
UNION ALL SELECT
    'Seats', COUNT(*) FROM Seats
UNION ALL SELECT
    'Shows', COUNT(*) FROM Shows
UNION ALL SELECT
    'Bookings', COUNT(*) FROM Bookings;
EOF
}

# Main execution
case "$1" in
    "run")
        ENV=${2:-$ENVIRONMENT}
        seed_environment "$ENV"
        verify_data
        ;;
    "clean")
        clean_data
        ;;
    "reset")
        clean_data
        ENV=${2:-$ENVIRONMENT}
        seed_environment "$ENV"
        verify_data
        ;;
    "verify")
        verify_data
        ;;
    *)
        echo "Usage: $0 {run|clean|reset|verify} [environment]"
        echo "  run [env]    - Seed data for specified environment (default: development)"
        echo "  clean        - Remove all seeded data"
        echo "  reset [env]  - Clean and re-seed data"
        echo "  verify       - Verify current data counts"
        echo ""
        echo "Available environments: development, production, testing"
        exit 1
        ;;
esac
```

## Backup and Restore Procedures

### 1. Comprehensive Backup Script

Create `database/scripts/backup.sh`:
```bash
#!/bin/bash

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-movie_booking_system}
BACKUP_DIR=${BACKUP_DIR:-"$(dirname "$0")/../backups"}
RETENTION_DAYS=${RETENTION_DAYS:-30}
S3_BUCKET=${S3_BUCKET:-""}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Create backup directory
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    if [ $? -ne 0 ]; then
        error "Failed to create backup directory: $BACKUP_DIR"
        exit 1
    fi
}

# Full database backup
full_backup() {
    local backup_name="full_backup_$(date +%Y%m%d_%H%M%S).sql"
    local backup_path="$BACKUP_DIR/$backup_name"

    log "Starting full database backup: $backup_name"

    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --hex-blob \
        --default-character-set=utf8mb4 \
        --add-drop-database \
        --databases "$DB_NAME" > "$backup_path"

    if [ $? -eq 0 ]; then
        # Compress backup
        gzip "$backup_path"
        backup_path="${backup_path}.gz"

        local backup_size=$(du -h "$backup_path" | cut -f1)
        log "Full backup completed successfully: $backup_name.gz (Size: $backup_size)"

        # Upload to S3 if configured
        upload_to_s3 "$backup_path" "full/"

        echo "$backup_path"
    else
        error "Full backup failed"
        exit 1
    fi
}

# Schema-only backup
schema_backup() {
    local backup_name="schema_backup_$(date +%Y%m%d_%H%M%S).sql"
    local backup_path="$BACKUP_DIR/$backup_name"

    log "Starting schema-only backup: $backup_name"

    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --no-data \
        --default-character-set=utf8mb4 \
        "$DB_NAME" > "$backup_path"

    if [ $? -eq 0 ]; then
        gzip "$backup_path"
        backup_path="${backup_path}.gz"

        log "Schema backup completed successfully: $backup_name.gz"
        upload_to_s3 "$backup_path" "schema/"
        echo "$backup_path"
    else
        error "Schema backup failed"
        exit 1
    fi
}

# Data-only backup
data_backup() {
    local backup_name="data_backup_$(date +%Y%m%d_%H%M%S).sql"
    local backup_path="$BACKUP_DIR/$backup_name"

    log "Starting data-only backup: $backup_name"

    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
        --single-transaction \
        --no-create-info \
        --hex-blob \
        --default-character-set=utf8mb4 \
        --where="1=1" \
        "$DB_NAME" > "$backup_path"

    if [ $? -eq 0 ]; then
        gzip "$backup_path"
        backup_path="${backup_path}.gz"

        log "Data backup completed successfully: $backup_name.gz"
        upload_to_s3 "$backup_path" "data/"
        echo "$backup_path"
    else
        error "Data backup failed"
        exit 1
    fi
}

# Incremental backup (based on timestamps)
incremental_backup() {
    local last_backup_time=$1
    local backup_name="incremental_backup_$(date +%Y%m%d_%H%M%S).sql"
    local backup_path="$BACKUP_DIR/$backup_name"

    log "Starting incremental backup since: $last_backup_time"

    # Tables with timestamp tracking
    local tables_with_timestamps=(
        "Users:updated_at"
        "Movies:updated_at"
        "Theatres:updated_at"
        "Screens:updated_at"
        "Shows:updated_at"
        "Bookings:updated_at"
        "Payments:updated_at"
    )

    echo "-- Incremental backup since $last_backup_time" > "$backup_path"
    echo "-- Generated on $(date)" >> "$backup_path"
    echo "" >> "$backup_path"

    for table_info in "${tables_with_timestamps[@]}"; do
        local table_name=$(echo "$table_info" | cut -d: -f1)
        local timestamp_column=$(echo "$table_info" | cut -d: -f2)

        log "Backing up incremental changes for table: $table_name"

        mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
            --single-transaction \
            --no-create-info \
            --hex-blob \
            --default-character-set=utf8mb4 \
            --where="$timestamp_column > '$last_backup_time'" \
            "$DB_NAME" "$table_name" >> "$backup_path"
    done

    # Always include audit log entries
    log "Backing up audit log entries"
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
        --single-transaction \
        --no-create-info \
        --hex-blob \
        --where="created_at > '$last_backup_time'" \
        "$DB_NAME" "Audit_Log" >> "$backup_path"

    if [ $? -eq 0 ]; then
        gzip "$backup_path"
        backup_path="${backup_path}.gz"

        log "Incremental backup completed successfully: $backup_name.gz"
        upload_to_s3 "$backup_path" "incremental/"
        echo "$backup_path"
    else
        error "Incremental backup failed"
        exit 1
    fi
}

# Upload to S3 (if configured)
upload_to_s3() {
    local file_path=$1
    local s3_prefix=$2

    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        local file_name=$(basename "$file_path")
        local s3_key="${s3_prefix}${file_name}"

        log "Uploading backup to S3: s3://$S3_BUCKET/$s3_key"

        aws s3 cp "$file_path" "s3://$S3_BUCKET/$s3_key"

        if [ $? -eq 0 ]; then
            log "S3 upload successful"
        else
            warn "S3 upload failed"
        fi
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days"

    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

    local deleted_count=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)

    if [ $deleted_count -gt 0 ]; then
        log "Deleted $deleted_count old backup files"
    else
        log "No old backup files to delete"
    fi
}

# List available backups
list_backups() {
    log "Available backups in $BACKUP_DIR:"

    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null | while read -r line; do
            echo "  $line"
        done
    else
        warn "Backup directory does not exist: $BACKUP_DIR"
    fi
}

# Main execution
case "$1" in
    "full")
        create_backup_dir
        full_backup
        cleanup_old_backups
        ;;
    "schema")
        create_backup_dir
        schema_backup
        ;;
    "data")
        create_backup_dir
        data_backup
        ;;
    "incremental")
        if [ -z "$2" ]; then
            error "Timestamp required for incremental backup (YYYY-MM-DD HH:MM:SS)"
            exit 1
        fi
        create_backup_dir
        incremental_backup "$2"
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "list")
        list_backups
        ;;
    *)
        echo "Usage: $0 {full|schema|data|incremental|cleanup|list} [timestamp]"
        echo "  full        - Complete database backup with schema and data"
        echo "  schema      - Schema-only backup (structure, procedures, triggers)"
        echo "  data        - Data-only backup"
        echo "  incremental - Incremental backup since specified timestamp"
        echo "  cleanup     - Remove backups older than retention period"
        echo "  list        - List available backups"
        echo ""
        echo "Environment variables:"
        echo "  DB_HOST         - Database host (default: localhost)"
        echo "  DB_PORT         - Database port (default: 3306)"
        echo "  DB_USER         - Database user (default: root)"
        echo "  DB_PASSWORD     - Database password"
        echo "  DB_NAME         - Database name (default: movie_booking_system)"
        echo "  BACKUP_DIR      - Backup directory (default: ../backups)"
        echo "  RETENTION_DAYS  - Backup retention in days (default: 30)"
        echo "  S3_BUCKET       - S3 bucket for backup uploads (optional)"
        exit 1
        ;;
esac
```

### 2. Restore Script

Create `database/scripts/restore.sh`:
```bash
#!/bin/bash

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME:-movie_booking_system}
BACKUP_DIR=${BACKUP_DIR:-"$(dirname "$0")/../backups"}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Restore from backup file
restore_backup() {
    local backup_file=$1
    local create_backup_first=${2:-true}

    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi

    log "Starting restore from backup: $(basename "$backup_file")"

    # Create pre-restore backup if requested
    if [ "$create_backup_first" = "true" ]; then
        log "Creating pre-restore backup..."
        local pre_restore_backup="$BACKUP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql"

        mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
            --single-transaction \
            --routines \
            --triggers \
            --events \
            --hex-blob \
            "$DB_NAME" | gzip > "${pre_restore_backup}.gz"

        if [ $? -eq 0 ]; then
            log "Pre-restore backup created: $(basename "${pre_restore_backup}.gz")"
        else
            warn "Failed to create pre-restore backup, continuing anyway..."
        fi
    fi

    # Determine if file is compressed
    local restore_command
    if [[ "$backup_file" == *.gz ]]; then
        restore_command="zcat '$backup_file'"
    else
        restore_command="cat '$backup_file'"
    fi

    # Perform restore
    log "Restoring database..."
    eval "$restore_command" | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD"

    if [ $? -eq 0 ]; then
        log "Database restore completed successfully"

        # Verify restore
        verify_restore
    else
        error "Database restore failed"
        exit 1
    fi
}

# Verify restored database
verify_restore() {
    log "Verifying restored database..."

    # Check table existence and row counts
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" << 'EOF'
SELECT
    TABLE_NAME,
    TABLE_ROWS,
    DATA_LENGTH,
    INDEX_LENGTH
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;
EOF

    # Check stored procedures
    log "Verifying stored procedures..."
    local procedure_count=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
        -e "SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = '$DB_NAME';" | tail -1)

    log "Found $procedure_count stored procedures"

    # Check triggers
    log "Verifying triggers..."
    local trigger_count=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
        -e "SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = '$DB_NAME';" | tail -1)

    log "Found $trigger_count triggers"

    # Check views
    log "Verifying views..."
    local view_count=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
        -e "SELECT COUNT(*) FROM information_schema.VIEWS WHERE TABLE_SCHEMA = '$DB_NAME';" | tail -1)

    log "Found $view_count views"

    log "Database verification completed"
}

# Restore specific tables
restore_tables() {
    local backup_file=$1
    shift
    local tables=("$@")

    if [ ${#tables[@]} -eq 0 ]; then
        error "No tables specified for restoration"
        exit 1
    fi

    log "Restoring specific tables: ${tables[*]}"

    # Extract and restore specific tables
    for table in "${tables[@]}"; do
        log "Restoring table: $table"

        if [[ "$backup_file" == *.gz ]]; then
            zcat "$backup_file" | sed -n "/^-- Table structure for table \`$table\`/,/^-- Table structure for table \`.*\`/p" | head -n -1 | \
                mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
        else
            cat "$backup_file" | sed -n "/^-- Table structure for table \`$table\`/,/^-- Table structure for table \`.*\`/p" | head -n -1 | \
                mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
        fi

        if [ $? -eq 0 ]; then
            log "Table $table restored successfully"
        else
            error "Failed to restore table: $table"
        fi
    done
}

# Point-in-time recovery
point_in_time_recovery() {
    local backup_file=$1
    local target_datetime=$2
    local binlog_dir=${3:-"/var/log/mysql"}

    log "Starting point-in-time recovery to: $target_datetime"

    # First restore from backup
    restore_backup "$backup_file" false

    # Apply binary logs up to target time
    log "Applying binary logs up to $target_datetime"

    # Find binary log files modified after backup date
    local backup_date=$(stat -c %Y "$backup_file" 2>/dev/null || stat -f %m "$backup_file" 2>/dev/null)
    local backup_datetime=$(date -d @$backup_date '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r $backup_date '+%Y-%m-%d %H:%M:%S' 2>/dev/null)

    log "Backup date: $backup_datetime"

    # This is a simplified version - in production, you'd need proper binary log management
    warn "Binary log replay not fully implemented in this script"
    warn "Manual binary log replay may be required for complete point-in-time recovery"

    log "Point-in-time recovery base restore completed"
}

# List available backups
list_backups() {
    log "Available backups:"

    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -name "*.sql*" -type f -exec ls -lh {} \; | \
            awk '{print $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'
    else
        warn "Backup directory not found: $BACKUP_DIR"
    fi
}

# Main execution
case "$1" in
    "full")
        if [ -z "$2" ]; then
            error "Backup file path required"
            exit 1
        fi
        restore_backup "$2" true
        ;;
    "quick")
        if [ -z "$2" ]; then
            error "Backup file path required"
            exit 1
        fi
        restore_backup "$2" false
        ;;
    "tables")
        if [ -z "$2" ]; then
            error "Backup file path required"
            exit 1
        fi
        shift 2
        restore_tables "$2" "$@"
        ;;
    "pitr")
        if [ -z "$2" ] || [ -z "$3" ]; then
            error "Backup file path and target datetime required"
            exit 1
        fi
        point_in_time_recovery "$2" "$3" "$4"
        ;;
    "verify")
        verify_restore
        ;;
    "list")
        list_backups
        ;;
    *)
        echo "Usage: $0 {full|quick|tables|pitr|verify|list} [options]"
        echo "  full <backup_file>           - Full restore with pre-restore backup"
        echo "  quick <backup_file>          - Quick restore without pre-restore backup"
        echo "  tables <backup_file> <table1> [table2...] - Restore specific tables"
        echo "  pitr <backup_file> <datetime> [binlog_dir] - Point-in-time recovery"
        echo "  verify                       - Verify current database state"
        echo "  list                         - List available backup files"
        echo ""
        echo "Examples:"
        echo "  $0 full /path/to/backup.sql.gz"
        echo "  $0 tables /path/to/backup.sql.gz Users Movies"
        echo "  $0 pitr /path/to/backup.sql.gz '2024-01-01 12:00:00'"
        exit 1
        ;;
esac
```

This comprehensive database migration guide provides a complete framework for managing database deployments, migrations, data seeding, backups, and performance optimization for the Movie Ticket Booking System. The scripts and procedures ensure data integrity, provide rollback capabilities, and support both development and production environments.