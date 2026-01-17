#!/bin/bash
pkill -f "node src/server.js"
pkill -f "npx expo start"
echo "Starting Backend..."
(cd backend && npm start) &
sleep 5
echo "Starting Expo..."
cd fitcoach-expo && npx expo start --clear
