#!/bin/bash

# FitCoach Expo - Start Development Server Script
# This ensures you start from the correct directory with clean cache

echo "🚀 Starting FitCoach Expo Development Server..."
echo ""

# Navigate to the correct directory
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/fitcoach-expo

# Show current directory
echo "📁 Working directory: $(pwd)"
echo ""

# Clear all caches
echo "🧹 Clearing caches..."
rm -rf node_modules/.cache .expo

# Start Expo with cleared cache
echo "✨ Starting Expo..."
echo ""
npx expo start --clear

# Note: Press 'i' for iOS simulator
# Note: Press 'a' for Android emulator
# Note: Scan QR code for physical device
