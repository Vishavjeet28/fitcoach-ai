#!/bin/bash

# FitCoach Backend Setup Script

echo "🏗️  FitCoach Backend Setup"
echo "=========================="
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed"
    echo ""
    echo "📦 Installing PostgreSQL via Homebrew..."
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "❌ Homebrew is not installed"
        echo "Please install Homebrew first: https://brew.sh"
        echo "Or install PostgreSQL manually: https://www.postgresql.org/download/"
        exit 1
    fi
    
    # Install PostgreSQL
    brew install postgresql@15
    
    # Start PostgreSQL service
    brew services start postgresql@15
    
    echo "✅ PostgreSQL installed and started"
    echo ""
    
    # Wait for PostgreSQL to start
    echo "⏳ Waiting for PostgreSQL to start..."
    sleep 5
else
    echo "✅ PostgreSQL is already installed"
    
    # Check if PostgreSQL is running
    if ! pg_isready &> /dev/null; then
        echo "⚠️  PostgreSQL is not running"
        echo "📦 Starting PostgreSQL..."
        
        # Try to start with brew services
        if command -v brew &> /dev/null; then
            brew services start postgresql@15 || brew services start postgresql
        else
            echo "Please start PostgreSQL manually"
            exit 1
        fi
        
        sleep 5
    else
        echo "✅ PostgreSQL is running"
    fi
fi

echo ""
echo "📊 Creating FitCoach database..."

# Create database (if it doesn't exist)
psql postgres -c "SELECT 1 FROM pg_database WHERE datname = 'fitcoach_db'" | grep -q 1 || \
    psql postgres -c "CREATE DATABASE fitcoach_db"

if [ $? -eq 0 ]; then
    echo "✅ Database 'fitcoach_db' created (or already exists)"
else
    echo "❌ Failed to create database"
    exit 1
fi

echo ""
echo "🗂️  Running database schema..."

# Run schema file
psql fitcoach_db -f /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/backend/src/config/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema created successfully"
else
    echo "❌ Failed to create database schema"
    exit 1
fi

echo ""
echo "📦 Installing npm dependencies..."
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/backend
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the backend server:"
echo "   cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/backend"
echo "   npm run dev"
echo ""
echo "📋 Useful PostgreSQL commands:"
echo "   psql fitcoach_db                    # Connect to database"
echo "   \\dt                                 # List all tables"
echo "   \\d users                            # Describe users table"
echo "   SELECT * FROM users;                # Query users"
echo ""
