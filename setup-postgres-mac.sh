#!/bin/bash

# PostgreSQL Setup Script for macOS (Homebrew)
# This script creates the database and user for SpokeWheel

echo "Setting up PostgreSQL for SpokeWheel..."
echo ""

# Get current user (default PostgreSQL superuser on macOS)
CURRENT_USER=$(whoami)

# Database configuration
DB_NAME="spokewheel"
DB_USER="spokewheel_user"
DB_PASSWORD="spoke_wheel"

echo "Creating database and user..."
echo "You may be prompted for your PostgreSQL password (or just press Enter if no password is set)"
echo ""

# Create database
psql -U $CURRENT_USER -d postgres <<EOF
-- Create database
CREATE DATABASE $DB_NAME;

-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database and user created successfully!"
    echo ""
    
    # Grant schema privileges (for PostgreSQL 15+)
    psql -U $CURRENT_USER -d $DB_NAME <<EOF
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
EOF
    
    echo ""
    echo "✅ Schema privileges granted!"
    echo ""
    echo "Database Configuration:"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Password: $DB_PASSWORD"
    echo ""
    echo "Add this to your .env file:"
    echo "  DB_TYPE=postgresql"
    echo "  DB_HOST=localhost"
    echo "  DB_PORT=5432"
    echo "  DB_NAME=$DB_NAME"
    echo "  DB_USER=$DB_USER"
    echo "  DB_PASSWORD=$DB_PASSWORD"
    echo "  DB_SSL=false"
    echo ""
else
    echo ""
    echo "❌ Error creating database. You may need to:"
    echo "  1. Check if PostgreSQL is running: brew services list"
    echo "  2. Try connecting as superuser: psql -U $CURRENT_USER -d postgres"
    echo ""
fi


