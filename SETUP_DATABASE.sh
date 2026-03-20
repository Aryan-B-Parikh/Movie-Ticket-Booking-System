#!/bin/bash

##############################################################################
# Movie Ticket Booking System - Database Setup Guide
# This script helps initialize the database with the provided credentials
##############################################################################

echo "🎬 Movie Ticket Booking System - Database Setup"
echo "=============================================="
echo ""

echo "📋 SETUP INFORMATION:"
echo "   Database Host: localhost"
echo "   Database Port: 3306"
echo "   Database Name: movie_booking_db"
echo "   ✅ Credentials configured in .env"
echo ""

echo "🗄️ NEXT STEPS TO GET STARTED:"
echo ""
echo "1️⃣ CREATE DATABASE:"
echo "   mysql -u 08Aryan@06Parikh -p -e 'CREATE DATABASE IF NOT EXISTS movie_booking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'"
echo ""

echo "2️⃣ INITIALIZE SCHEMA:"
echo "   mysql -u 08Aryan@06Parikh -p movie_booking_db < database/schema/init_database.sql"
echo ""

echo "3️⃣ LOAD STORED PROCEDURES:"
echo "   mysql -u 08Aryan@06Parikh -p movie_booking_db < database/procedures/install_and_test_procedures.sql"
echo ""

echo "4️⃣ (OPTIONAL) SEED SAMPLE DATA:"
echo "   mysql -u 08Aryan@06Parikh -p movie_booking_db < database/schema/sample_data.sql"
echo ""

echo "5️⃣ START BACKEND SERVER:"
echo "   cd backend && npm start"
echo ""

echo "6️⃣ VERIFY CONNECTION:"
echo "   Backend will test database connection on startup"
echo "   Look for: ✓ Database connected successfully"
echo ""

echo "🌐 ACCESS FRONTEND:"
echo ""
echo "   WEB UI:"
echo "   cd frontend/web && python -m http.server 8080"
echo "   Then open: http://localhost:8080"
echo ""
echo "   CLI:"
echo "   cd frontend/cli && npm install && npm start auth login"
echo ""

echo "✅ DATABASE SETUP COMPLETE!"
echo "=============================================="
echo ""
echo "🔒 SECURITY REMINDER:"
echo "   ✓ Credentials stored in backend/.env (NOT in version control)"
echo "   ✓ Never commit .env file to GitHub"
echo "   ✓ Use environment variables in production"
echo ""

echo "📚 DOCUMENTATION:"
echo "   • Database Schema: docs/SRS.md (Section 8.1)"
echo "   • Setup Guide: docs/DEVELOPMENT_SETUP.md"
echo "   • API Reference: docs/API_DOCUMENTATION.md"
echo ""