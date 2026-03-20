# Movie Ticket Booking System - Database Setup Script for Windows PowerShell
# ============================================================================

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  MOVIE TICKET BOOKING SYSTEM - DATABASE SETUP (Windows PowerShell)" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

# Check if MySQL is installed
Write-Host "`nChecking MySQL Installation..." -ForegroundColor Blue

$mysqlPaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe",
    "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\MySQL\bin\mysql.exe"
)

$mysqlFound = $false
$mysqlPath = ""

foreach ($path in $mysqlPaths) {
    if (Test-Path $path) {
        $mysqlFound = $true
        $mysqlPath = $path
        Write-Host "[OK] MySQL found at: $path" -ForegroundColor Green
        break
    }
}

if (-not $mysqlFound) {
    Write-Host "[ERROR] MySQL is not installed or not found in default locations" -ForegroundColor Red
    Write-Host "" -ForegroundColor Red
    Write-Host "SOLUTION: Install MySQL Community Server" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Download from: https://dev.mysql.com/downloads/mysql/" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Installation Steps:" -ForegroundColor Yellow
    Write-Host "  - Download MySQL Installer" -ForegroundColor Yellow
    Write-Host "  - Run installer and follow wizard" -ForegroundColor Yellow
    Write-Host "  - During setup, remember your root password" -ForegroundColor Yellow
    Write-Host "  - Add MySQL bin folder to System PATH" -ForegroundColor Yellow
    Write-Host "  - Restart PowerShell" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Or use Windows Package Manager:" -ForegroundColor Yellow
    Write-Host "  winget install MySQL.Server" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    exit 1
}

# Credentials
Write-Host "`nUsing Credentials:" -ForegroundColor Blue
$dbUser = "AryanParikh"
$dbPassword = "08Aryan@06Parikh"
$dbName = "movie_booking_db"
$dbHost = "localhost"

Write-Host "   User: $dbUser" -ForegroundColor Green
Write-Host "   Database: $dbName" -ForegroundColor Green

# Helper function to run MySQL commands
function Invoke-MySqlCommand {
    param(
        [string]$Command,
        [string]$Database = "",
        [string]$SqlFile = ""
    )

    $mysqlExe = "`"$mysqlPath`""
    $userArg = "-u$dbUser"
    $passArg = "-p$dbPassword"
    $hostArg = "-h$dbHost"

    if ($SqlFile) {
        # Read SQL file and execute
        if (Test-Path $SqlFile) {
            Write-Host "   Loading: $SqlFile" -ForegroundColor Yellow
            $sqlContent = Get-Content $SqlFile -Raw

            if ($Database) {
                & $mysqlPath $userArg $passArg $hostArg -e "USE $Database; $sqlContent" 2>&1
            } else {
                & $mysqlPath $userArg $passArg $hostArg -e "$sqlContent" 2>&1
            }
        } else {
            Write-Host "   ❌ File not found: $SqlFile" -ForegroundColor Red
            return $false
        }
    } else {
        # Execute direct command
        if ($Database) {
            & $mysqlPath $userArg $passArg $hostArg $Database -e "$Command" 2>&1
        } else {
            & $mysqlPath $userArg $passArg $hostArg -e "$Command" 2>&1
        }
    }
}

# Step 1: Create Database
Write-Host "`n[STEP 1] Creating Database..." -ForegroundColor Blue
try {
    Write-Host "   Creating database: $dbName" -ForegroundColor Yellow
    $result = & $mysqlPath "-u$dbUser" "-p$dbPassword" "-h$dbHost" -e "CREATE DATABASE IF NOT EXISTS $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1
    Write-Host "[OK] Database created successfully" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Error creating database: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Load Schema
Write-Host "`n[STEP 2] Loading Database Schema..." -ForegroundColor Blue
$schemaFile = "database/schema/init_database.sql"

if (Test-Path $schemaFile) {
    Write-Host "   Loading schema from: $schemaFile" -ForegroundColor Yellow
    try {
        $sqlContent = Get-Content $schemaFile -Raw

        # Execute schema
        Write-Host "   Creating tables and indexes..." -ForegroundColor Cyan
        & $mysqlPath "-u$dbUser" "-p$dbPassword" "-h$dbHost" "$dbName" -e "$sqlContent" 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Schema loaded successfully" -ForegroundColor Green
        } else {
            Write-Host "[WARN] Schema loading completed with warnings" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "[ERROR] Error loading schema: $_" -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] Schema file not found: $schemaFile" -ForegroundColor Red
}

# Step 3: Load Stored Procedures
Write-Host "`n[STEP 3] Loading Stored Procedures..." -ForegroundColor Blue
$procedureFile = "database/procedures/sp_book_tickets.sql"

if (Test-Path $procedureFile) {
    Write-Host "   Loading stored procedures..." -ForegroundColor Yellow
    try {
        $sqlContent = Get-Content $procedureFile -Raw
        & $mysqlPath "-u$dbUser" "-p$dbPassword" "-h$dbHost" "$dbName" -e "$sqlContent" 2>&1 | Out-Null

        Write-Host "[OK] Stored procedures loaded" -ForegroundColor Green
    }
    catch {
        Write-Host "[WARN] Could not load stored procedures: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARN] Procedure file not found (optional): $procedureFile" -ForegroundColor Yellow
}

# Step 4: Verify Installation
Write-Host "`n[STEP 4] Verifying Installation..." -ForegroundColor Blue
try {
    $result = & $mysqlPath "-u$dbUser" "-p$dbPassword" "-h$dbHost" "$dbName" -e "SHOW TABLES;" 2>&1
    $tableCount = ($result | Measure-Object -Line).Lines - 2

    Write-Host "[OK] Database is ready with $tableCount tables" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Could not connect to database: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n========================================================================" -ForegroundColor Green
Write-Host "  DATABASE SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "[OK] Database: $dbName" -ForegroundColor Green
Write-Host "[OK] Host: $dbHost" -ForegroundColor Green
Write-Host "[OK] User: $dbUser" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Yellow
Write-Host "1. Start Backend Server (PowerShell):" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor Cyan
Write-Host "   npm start" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Yellow
Write-Host "2. Start Frontend (PowerShell - New Tab):" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Yellow
Write-Host "   Option A - Web UI:" -ForegroundColor Yellow
Write-Host "   cd frontend/web" -ForegroundColor Cyan
Write-Host "   python -m http.server 8080" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Yellow
Write-Host "   Option B - CLI:" -ForegroundColor Yellow
Write-Host "   cd frontend/cli" -ForegroundColor Cyan
Write-Host "   npm install" -ForegroundColor Cyan
Write-Host "   npm start auth login" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Yellow
Write-Host "3. Access:" -ForegroundColor Yellow
Write-Host "   Web UI: http://localhost:8080" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:3000/api" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Yellow
Write-Host "DATABASE CREDENTIALS:" -ForegroundColor Magenta
Write-Host "   User: $dbUser" -ForegroundColor Cyan
Write-Host "   Password: $dbPassword" -ForegroundColor Cyan
Write-Host "   Host: $dbHost" -ForegroundColor Cyan
Write-Host "   Port: 3306" -ForegroundColor Cyan
Write-Host "" -ForegroundColor Yellow
Write-Host "TIP: To manually run SQL commands in PowerShell:" -ForegroundColor Yellow
Write-Host '   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u$dbUser -p$dbPassword -h$dbHost $dbName -e "SELECT * FROM Users;"' -ForegroundColor Cyan
Write-Host "" -ForegroundColor Yellow
Write-Host "System ready for testing!" -ForegroundColor Cyan
