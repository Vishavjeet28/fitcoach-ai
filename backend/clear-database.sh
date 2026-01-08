#!/bin/bash

# FitCoach Database Reset Script
# This script clears all data from the database

echo "🗑️  FitCoach Database Reset Script"
echo "=================================="
echo ""

# Set PostgreSQL path
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Menu
echo "Choose what to clear:"
echo "1) Clear ALL data (delete database and recreate)"
echo "2) Clear food logs only (keep users)"
echo "3) Clear all activity logs (food, exercise, water) but keep users"
echo "4) Clear everything for a specific user"
echo "5) Exit"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
  1)
    echo ""
    echo "⚠️  WARNING: This will DELETE ALL DATA including users!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      echo "🔨 Dropping database..."
      psql -U postgres -c "DROP DATABASE IF EXISTS fitcoach_db;"
      
      echo "🏗️  Creating fresh database..."
      psql -U postgres -c "CREATE DATABASE fitcoach_db;"
      
      echo "📋 Running schema..."
      psql fitcoach_db -f src/config/schema.sql
      
      echo "✅ Database reset complete!"
      echo "All users and data have been deleted."
      echo "You need to register a new account."
    else
      echo "❌ Cancelled"
    fi
    ;;
    
  2)
    echo ""
    echo "🧹 Clearing food logs..."
    psql fitcoach_db <<EOF
DELETE FROM food_logs;
DELETE FROM daily_summaries;
SELECT 'Deleted ' || COUNT(*) || ' rows from food_logs' FROM (SELECT 1 LIMIT 0) AS dummy;
EOF
    echo "✅ Food logs cleared!"
    echo "Users and other data remain intact."
    ;;
    
  3)
    echo ""
    echo "🧹 Clearing all activity logs..."
    psql fitcoach_db <<EOF
DELETE FROM food_logs;
DELETE FROM exercise_logs;
DELETE FROM water_logs;
DELETE FROM daily_summaries;
SELECT 'All activity logs cleared' AS status;
EOF
    echo "✅ All activity logs cleared!"
    echo "Users remain intact."
    ;;
    
  4)
    echo ""
    echo "📋 Finding users..."
    psql fitcoach_db -c "SELECT id, email, name FROM users;"
    echo ""
    read -p "Enter user ID to delete: " user_id
    
    if [ -n "$user_id" ]; then
      echo "⚠️  This will delete ALL data for user ID: $user_id"
      read -p "Are you sure? (yes/no): " confirm
      
      if [ "$confirm" = "yes" ]; then
        echo "🗑️  Deleting user data..."
        psql fitcoach_db <<EOF
DELETE FROM food_logs WHERE user_id = $user_id;
DELETE FROM exercise_logs WHERE user_id = $user_id;
DELETE FROM water_logs WHERE user_id = $user_id;
DELETE FROM daily_summaries WHERE user_id = $user_id;
DELETE FROM users WHERE id = $user_id;
SELECT 'User and all data deleted' AS status;
EOF
        echo "✅ User deleted!"
      else
        echo "❌ Cancelled"
      fi
    else
      echo "❌ Invalid user ID"
    fi
    ;;
    
  5)
    echo "👋 Exiting..."
    exit 0
    ;;
    
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "🔄 Don't forget to restart your backend server:"
echo "   cd backend"
echo "   node src/server.js"
