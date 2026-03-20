# Movie Ticket Booking System - Quick Launcher
# Run this script to start both backend and frontend

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  MOVIE TICKET BOOKING SYSTEM - LAUNCHER" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$projectRoot = Get-Location

Write-Host "`n[INFO] Starting backend server..." -ForegroundColor Yellow
Write-Host "   Location: $projectRoot\backend" -ForegroundColor Yellow
Write-Host "   Command: npm start" -ForegroundColor Cyan
Write-Host "   Port: 3000" -ForegroundColor Cyan
Write-Host "   API: http://localhost:3000/api" -ForegroundColor Green

Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PORT='3000'; `$env:NODE_ENV='development'; cd '$projectRoot\backend'; npm start"

Start-Sleep -Seconds 3

Write-Host "`n[INFO] Starting frontend web UI..." -ForegroundColor Yellow
Write-Host "   Location: $projectRoot\frontend\web" -ForegroundColor Yellow
Write-Host "   Command: python -m http.server 8080" -ForegroundColor Cyan
Write-Host "   Port: 8080" -ForegroundColor Cyan
Write-Host "   URL: http://localhost:8080" -ForegroundColor Green

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend\web'; python -m http.server 8080"

Write-Host "`n========================================================================" -ForegroundColor Green
Write-Host "  SYSTEM LAUNCHED!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "`nAccess the system:" -ForegroundColor Yellow
Write-Host "  - Web UI: http://localhost:8080" -ForegroundColor Cyan
Write-Host "  - API: http://localhost:3000/api" -ForegroundColor Cyan
Write-Host "`nWait 3-5 seconds for both servers to fully start, then open:" -ForegroundColor Yellow
Write-Host "  http://localhost:8080" -ForegroundColor Green
Write-Host "`nClose the PowerShell windows to stop the servers." -ForegroundColor Yellow
