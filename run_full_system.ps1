# Movie Ticket Booking System - One-command setup and run
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\run_full_system.ps1
# Optional:
#   powershell -ExecutionPolicy Bypass -File .\run_full_system.ps1 -SkipSeed

param(
  [string]$DbUser,
  [string]$DbPass,
  [string]$DbHost,
  [string]$DbName,
  [string]$MySqlPath,
  [switch]$SkipSeed
)

function Import-DotEnv {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return $false
  }

  foreach ($rawLine in Get-Content $Path) {
    $line = $rawLine.Trim()
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
      continue
    }

    $separator = $line.IndexOf("=")
    if ($separator -le 0) {
      continue
    }

    $key = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1).Trim()
    if ([string]::IsNullOrWhiteSpace($key)) {
      continue
    }

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    Set-Item -Path "Env:$key" -Value $value
  }

  return $true
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFilePath = Join-Path $scriptRoot ".env"
$envLoaded = Import-DotEnv -Path $envFilePath

if ([string]::IsNullOrWhiteSpace($DbUser)) { $DbUser = $env:DB_USER }
if ([string]::IsNullOrWhiteSpace($DbPass)) { $DbPass = $env:DB_PASS }
if ([string]::IsNullOrWhiteSpace($DbHost)) { $DbHost = $env:DB_HOST }
if ([string]::IsNullOrWhiteSpace($DbName)) { $DbName = $env:DB_NAME }
if ([string]::IsNullOrWhiteSpace($MySqlPath)) { $MySqlPath = $env:MYSQL_PATH }

if ([string]::IsNullOrWhiteSpace($DbUser)) { $DbUser = "AryanParikh" }
if ([string]::IsNullOrWhiteSpace($DbPass)) { $DbPass = "08Aryan@06Parikh" }
if ([string]::IsNullOrWhiteSpace($DbHost)) { $DbHost = "localhost" }
if ([string]::IsNullOrWhiteSpace($DbName)) { $DbName = "movie_ticket_booking" }
if ([string]::IsNullOrWhiteSpace($MySqlPath)) { $MySqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" }

$uiPort = $env:UI_PORT
if ([string]::IsNullOrWhiteSpace($uiPort)) { $uiPort = "8090" }

function Write-Step {
  param([string]$Message)
  Write-Host "[STEP] $Message" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Err {
  param([string]$Message)
  Write-Host "[ERROR] $Message" -ForegroundColor Red
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Movie Ticket Booking System - Setup and Run" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

if ($envLoaded) {
  Write-Host "[OK] Loaded environment from .env" -ForegroundColor Green
} else {
  Write-Host "[INFO] .env not found; using command args, existing environment, or defaults." -ForegroundColor Yellow
}

if (-not (Test-Path $MySqlPath)) {
  Write-Err "MySQL executable not found at: $MySqlPath"
  Write-Host "Set MYSQL_PATH env var or pass -MySqlPath with your mysql.exe path." -ForegroundColor Yellow
  exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Err "Node.js is not available in PATH."
  exit 1
}

Write-Step "Validating MySQL connectivity"
& $MySqlPath "--user=$DbUser" "--password=$DbPass" "--host=$DbHost" "--execute=SELECT 1;" | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Err "Could not connect to MySQL with the provided credentials."
  exit 1
}
Write-Ok "MySQL connection successful"

$sqlFiles = @(
  "sql/01_schema.sql",
  "sql/03_triggers.sql"
)

foreach ($file in $sqlFiles) {
  if (-not (Test-Path $file)) {
    Write-Err "Required SQL file missing: $file"
    exit 1
  }

  $resolved = (Resolve-Path $file).Path.Replace("\\", "/")
  Write-Step "Applying $file"
  & $MySqlPath "--user=$DbUser" "--password=$DbPass" "--host=$DbHost" "--execute=SOURCE $resolved"

  if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed while running $file"
    exit 1
  }

  Write-Ok "Applied $file"
}

if (-not $SkipSeed) {
  $seedSql = @"
USE movie_ticket_booking;

INSERT INTO users (user_id, full_name, email, phone, password_hash)
VALUES
  (1, 'Aarav Shah', 'aarav@example.com', '9991112222', 'hash_aarav'),
  (2, 'Meera Patel', 'meera@example.com', '9991113333', 'hash_meera')
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  phone = VALUES(phone),
  password_hash = VALUES(password_hash);

INSERT INTO movies (movie_id, title, duration_minutes, genre, language, certificate, release_date)
VALUES
  (1, 'The Last Horizon', 150, 'Sci-Fi', 'English', 'UA', '2026-03-01'),
  (2, 'Echoes of Monsoon', 125, 'Drama', 'Hindi', 'U', '2026-02-10')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  duration_minutes = VALUES(duration_minutes),
  genre = VALUES(genre),
  language = VALUES(language),
  certificate = VALUES(certificate),
  release_date = VALUES(release_date);

INSERT INTO theaters (theater_id, name, location)
VALUES
  (1, 'CineMax Downtown', 'Ahmedabad')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  location = VALUES(location);

INSERT INTO screens (screen_id, theater_id, screen_name, capacity)
VALUES
  (1, 1, 'Screen 1', 10),
  (2, 1, 'Screen 2', 10)
ON DUPLICATE KEY UPDATE
  theater_id = VALUES(theater_id),
  screen_name = VALUES(screen_name),
  capacity = VALUES(capacity);

INSERT INTO seats (seat_id, screen_id, seat_number, seat_type)
VALUES
  (1, 1, 'A1', 'REGULAR'),
  (2, 1, 'A2', 'REGULAR'),
  (3, 1, 'A3', 'REGULAR'),
  (4, 1, 'A4', 'PREMIUM'),
  (5, 1, 'A5', 'PREMIUM'),
  (6, 1, 'B1', 'REGULAR'),
  (7, 1, 'B2', 'REGULAR'),
  (8, 1, 'B3', 'REGULAR'),
  (9, 1, 'B4', 'PREMIUM'),
  (10, 1, 'B5', 'RECLINER'),
  (11, 2, 'A1', 'REGULAR'),
  (12, 2, 'A2', 'REGULAR'),
  (13, 2, 'A3', 'REGULAR'),
  (14, 2, 'A4', 'PREMIUM'),
  (15, 2, 'A5', 'PREMIUM'),
  (16, 2, 'B1', 'REGULAR'),
  (17, 2, 'B2', 'REGULAR'),
  (18, 2, 'B3', 'REGULAR'),
  (19, 2, 'B4', 'PREMIUM'),
  (20, 2, 'B5', 'RECLINER')
ON DUPLICATE KEY UPDATE
  screen_id = VALUES(screen_id),
  seat_number = VALUES(seat_number),
  seat_type = VALUES(seat_type);

INSERT INTO shows (show_id, movie_id, screen_id, show_time, end_time, base_price, status)
SELECT
  seed.show_id,
  seed.movie_id,
  seed.screen_id,
  seed.show_time,
  seed.end_time,
  seed.base_price,
  seed.status
FROM (
  SELECT
    v.show_id,
    v.movie_id,
    v.screen_id,
    v.show_time,
    DATE_ADD(v.show_time, INTERVAL m.duration_minutes MINUTE) AS end_time,
    v.base_price,
    v.status
  FROM (
    SELECT 1 AS show_id, 1 AS movie_id, 1 AS screen_id, '2026-04-01 18:00:00' AS show_time, 250.00 AS base_price, 'SCHEDULED' AS status
    UNION ALL
    SELECT 2, 2, 1, '2026-04-01 21:15:00', 220.00, 'SCHEDULED'
    UNION ALL
    SELECT 3, 1, 2, '2026-04-01 19:00:00', 260.00, 'SCHEDULED'
  ) v
  INNER JOIN movies m
    ON m.movie_id = v.movie_id
) AS seed
WHERE NOT EXISTS (
  SELECT 1
  FROM shows s
  WHERE s.show_id = seed.show_id
)
AND NOT EXISTS (
  SELECT 1
  FROM shows s
  WHERE s.screen_id = seed.screen_id
    AND s.show_time = seed.show_time
)
AND NOT EXISTS (
  SELECT 1
  FROM shows s
  WHERE s.screen_id = seed.screen_id
    AND s.status = 'SCHEDULED'
    AND seed.show_time < s.end_time
    AND seed.end_time > s.show_time
);
"@

  Write-Step "Applying inline seed data"
  & $MySqlPath "--user=$DbUser" "--password=$DbPass" "--host=$DbHost" "--execute=$seedSql"

  if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed while applying inline seed data"
    exit 1
  }

  Write-Ok "Applied inline seed data"
}

Write-Step "Configuring API server environment"
$env:DB_USER = $DbUser
$env:DB_PASS = $DbPass
$env:DB_HOST = $DbHost
$env:DB_NAME = $DbName

Write-Host "" 
Write-Host "Setup complete. Starting API server..." -ForegroundColor Green
Write-Host "Open in browser: http://localhost:$uiPort/ui/index.html" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host ""

node ui-api-server.js
