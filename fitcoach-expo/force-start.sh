#!/bin/bash
set -e

# Force change to fitcoach-expo directory
cd /Users/vishavjeetsingh/Downloads/fitcoach-expo || exit 1

# Confirm we're in the right place
echo "Current directory: $(pwd)"
echo "Checking for App.tsx..."
ls -la App.tsx

# Kill any running Metro/Expo
pkill -9 -f "metro" 2>/dev/null || true
pkill -9 -f "expo" 2>/dev/null || true

sleep 2

# Clear all caches
echo "Clearing caches..."
rm -rf node_modules/.cache .expo 2>/dev/null || true

# Start Expo
echo "Starting Expo from: $(pwd)"
npx expo start --clear
