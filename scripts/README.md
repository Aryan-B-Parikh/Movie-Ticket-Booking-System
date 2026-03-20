# Scripts - Movie Ticket Booking System

This directory contains automation scripts for deployment, testing, database management, and maintenance tasks.

---

## Table of Contents
- [Overview](#overview)
- [Available Scripts](#available-scripts)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

---

## Overview

All scripts are designed to be:
- **Idempotent**: Safe to run multiple times
- **Production-ready**: Includes error handling and rollback
- **Well-documented**: Clear comments and usage instructions
- **Cross-platform**: Works on Linux, macOS, and Windows (via Git Bash)

---

## Available Scripts

### Database Management

#### `setup-database.sh`
Sets up the complete database schema from scratch.

**Usage:**
```bash
bash scripts/setup-database.sh
```

**What it does:**
1. Creates the database if it doesn't exist
2. Runs all schema scripts in order
3. Applies indexes and constraints
4. Installs stored procedures, triggers, and views
5. Optionally seeds sample data

**Options:**
- `--with-seeds`: Include sample data
- `--drop-existing`: Drop and recreate database

---

#### `backup.sh`
Creates a backup of the database.

**Usage:**
```bash
bash scripts/backup.sh [backup-name]
```

**Examples:**
```bash
# Automatic timestamp
bash scripts/backup.sh

# Named backup
bash scripts/backup.sh pre-migration-backup
```

**Output:** `backups/movie_booking_YYYYMMDD_HHMMSS.sql`

**Features:**
- Full database dump (schema + data)
- Automatic timestamp
- Compression (optional)
- Retention policy (keeps last 7 backups)

---

#### `restore.sh`
Restores database from a backup file.

**Usage:**
```bash
bash scripts/restore.sh <backup-file>
```

**Example:**
```bash
bash scripts/restore.sh backups/movie_booking_20260320_143022.sql
```

**Safety:**
- Creates backup before restore
- Prompts for confirmation
- Validates backup file integrity

---

#### `migrate.sh`
Runs database migrations (up or down).

**Usage:**
```bash
bash scripts/migrate.sh [up|down] [migration-number]
```

**Examples:**
```bash
# Run all pending migrations
bash scripts/migrate.sh up

# Run specific migration
bash scripts/migrate.sh up 002

# Rollback last migration
bash scripts/migrate.sh down

# Rollback specific migration
bash scripts/migrate.sh down 002
```

---

### Testing & Quality Assurance

#### `test-concurrency.sh`
Tests concurrent booking scenarios to verify transaction safety.

**Usage:**
```bash
bash scripts/test-concurrency.sh [num-users]
```

**Examples:**
```bash
# Test with 50 concurrent users
bash scripts/test-concurrency.sh 50

# Test with 100 concurrent users (default)
bash scripts/test-concurrency.sh
```

**What it tests:**
- Simultaneous booking attempts
- Double-booking prevention
- Transaction rollback on conflict
- Database lock handling

**Output:**
- Success rate
- Response times (min, max, avg)
- Conflict resolution stats
- Detailed log file

---

#### `benchmark.sh`
Runs performance benchmarks on critical queries.

**Usage:**
```bash
bash scripts/benchmark.sh [report-file]
```

**What it benchmarks:**
- Seat availability query
- User booking history
- Show listing with filters
- Booking creation (transaction)
- Complex joins

**Output:**
```
=== Benchmark Results ===
Query: Get Available Seats
Executions: 1000
Avg Time: 87ms
95th Percentile: 145ms
99th Percentile: 203ms
Max Time: 312ms
Status: ✓ PASS (< 200ms target)
```

---

#### `run-tests.sh`
Runs all test suites (unit, integration, stress).

**Usage:**
```bash
bash scripts/run-tests.sh [suite]
```

**Examples:**
```bash
# All tests
bash scripts/run-tests.sh

# Unit tests only
bash scripts/run-tests.sh unit

# Integration tests only
bash scripts/run-tests.sh integration

# Stress tests only
bash scripts/run-tests.sh stress
```

---

### Deployment

#### `deploy.sh`
Deploys the application to production/staging environment.

**Usage:**
```bash
bash scripts/deploy.sh [environment]
```

**Environments:**
- `dev`: Development server
- `staging`: Staging server
- `production`: Production server

**Deployment steps:**
1. Runs all tests
2. Creates database backup
3. Applies pending migrations
4. Builds backend
5. Restarts services
6. Runs smoke tests

**Safety features:**
- Rollback on failure
- Health checks
- Zero-downtime deployment (blue-green)

---

#### `rollback.sh`
Rolls back to previous deployment.

**Usage:**
```bash
bash scripts/rollback.sh [version]
```

**Example:**
```bash
# Rollback to previous version
bash scripts/rollback.sh

# Rollback to specific version
bash scripts/rollback.sh v1.2.3
```

---

### Maintenance

#### `cleanup.sh`
Cleans up old data and optimizes database.

**Usage:**
```bash
bash scripts/cleanup.sh [options]
```

**Options:**
- `--archive-old-bookings`: Archive bookings older than 1 year
- `--remove-cancelled`: Delete cancelled bookings older than 30 days
- `--optimize-tables`: Run OPTIMIZE TABLE on all tables
- `--analyze-tables`: Update table statistics

**Example:**
```bash
bash scripts/cleanup.sh --archive-old-bookings --optimize-tables
```

---

#### `health-check.sh`
Checks system health (database, API, services).

**Usage:**
```bash
bash scripts/health-check.sh
```

**Checks:**
- Database connectivity
- Connection pool status
- API endpoint availability
- Response time thresholds
- Disk space
- Memory usage

**Output:**
```
✓ Database: Connected (10/10 connections available)
✓ API: Responding (avg 45ms)
✓ Disk Space: 67% used (33GB free)
✗ Memory: 92% used (WARNING)
```

---

#### `seed-data.sh`
Seeds the database with sample/test data.

**Usage:**
```bash
bash scripts/seed-data.sh [dataset]
```

**Datasets:**
- `minimal`: 10 users, 5 movies, 2 theatres
- `standard`: 100 users, 50 movies, 10 theatres (default)
- `large`: 1000 users, 200 movies, 50 theatres

**Example:**
```bash
bash scripts/seed-data.sh standard
```

---

## Usage Examples

### Complete Setup (New Developer)
```bash
# 1. Set up database
bash scripts/setup-database.sh --with-seeds

# 2. Run tests to verify
bash scripts/run-tests.sh

# 3. Start development server
cd backend && npm run dev
```

### Pre-Production Checklist
```bash
# 1. Create backup
bash scripts/backup.sh pre-deployment-backup

# 2. Run all tests
bash scripts/run-tests.sh

# 3. Benchmark performance
bash scripts/benchmark.sh production-bench.txt

# 4. Test concurrency
bash scripts/test-concurrency.sh 100

# 5. Deploy if all tests pass
bash scripts/deploy.sh production
```

### Weekly Maintenance
```bash
# 1. Health check
bash scripts/health-check.sh

# 2. Backup database
bash scripts/backup.sh weekly-backup

# 3. Clean up old data
bash scripts/cleanup.sh --archive-old-bookings --optimize-tables

# 4. Run benchmarks
bash scripts/benchmark.sh weekly-bench-$(date +%Y%m%d).txt
```

---

## Best Practices

### Script Development
1. **Always include error handling**
```bash
set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure
```

2. **Use color coding for output**
```bash
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}✓ Success${NC}"
echo -e "${RED}✗ Error${NC}"
echo -e "${YELLOW}⚠ Warning${NC}"
```

3. **Log all operations**
```bash
LOG_FILE="logs/script-$(date +%Y%m%d).log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1
```

4. **Prompt for dangerous operations**
```bash
read -p "This will drop the database. Continue? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "Aborted."
    exit 1
fi
```

### Scheduling

#### Daily Backups (Cron)
```bash
# Add to crontab
0 2 * * * /path/to/scripts/backup.sh
```

#### Weekly Maintenance
```bash
# Every Sunday at 3 AM
0 3 * * 0 /path/to/scripts/cleanup.sh --archive-old-bookings
```

#### Health Checks (Every 5 minutes)
```bash
*/5 * * * * /path/to/scripts/health-check.sh
```

---

## Troubleshooting

### Common Issues

**Issue**: Permission denied
```bash
# Fix: Make script executable
chmod +x scripts/*.sh
```

**Issue**: MySQL command not found
```bash
# Fix: Add MySQL to PATH
export PATH=$PATH:/usr/local/mysql/bin
```

**Issue**: Script fails midway
```bash
# Fix: Check logs
tail -f logs/script-$(date +%Y%m%d).log
```

---

## Creating New Scripts

### Template
```bash
#!/bin/bash

# Script Name: example.sh
# Description: What this script does
# Usage: bash scripts/example.sh [args]
# Author: Your Name
# Date: YYYY-MM-DD

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Main logic
main() {
    log_info "Starting example script..."

    # Your code here

    log_info "Script completed successfully!"
}

# Run main function
main "$@"
```

---

## Resources

- [Bash Scripting Guide](https://www.gnu.org/software/bash/manual/)
- [Shell Style Guide](https://google.github.io/styleguide/shellguide.html)
- Project documentation: [../docs/](../docs/)

---

**Remember**: Always test scripts in development before running in production. Create backups before destructive operations.
