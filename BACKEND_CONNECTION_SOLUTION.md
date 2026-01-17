# Backend Connection - Permanent Solution

## Problem
The app was unable to connect to the backend, showing "Request timed out" errors. This was happening because:

1. **Backend wasn't running**: The backend server (`backend/src/server.js`) was not started.
2. **Timeout too short**: The 30-second timeout was not enough for slower networks.
3. **Poor error messages**: Generic timeout errors didn't help diagnose the real issue.
4. **CORS configuration**: The CORS whitelist was too restrictive and couldn't handle dynamic local IPs.

## Permanent Solution Implemented

### 1. Start Backend Server
The backend MUST be running for the app to work. 

**To Start Backend:**
```bash
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/backend
node src/server.js
```

**Keep this terminal open!** The backend server must stay running while using the app.

### 2. Fixed CORS Configuration
Updated `backend/src/server.js` to accept connections from:
- All localhost ports
- All 192.168.x.x addresses (common home networks)
- All 10.x.x.x addresses (common mobile networks)
- All 172.16-31.x.x addresses (Docker networks)
- All Expo Go connections

This means the backend will work regardless of which WiFi network you're on.

### 3. Increased Timeout
- Changed from 30 seconds to **60 seconds**
- Increased retries from 1 to **2 attempts**
- Increased retry delay from 1 to **2 seconds**

This gives slower networks more time to connect.

### 4. Better Error Messages
Now when connection fails, you'll see specific messages like:
```
Cannot connect to server. Please ensure:
1. Backend is running (cd backend && node src/server.js)
2. Both devices on same WiFi
3. Firewall allows port 5001
```

## How to Use

### Every Time You Want to Use the App:

1. **Start Backend First:**
   ```bash
   cd backend
   node src/server.js
   ```
   You should see:
   ```
   🚀 FitCoach Backend running on port 5001
   ```

2. **Start Expo Go:**
   ```bash
   cd fitcoach-expo
   npx expo start
   ```

3. **Scan QR Code** on your iPhone.

4. **Keep both terminals open** while using the app.

### Troubleshooting

**"Connection timed out" still appears:**
1. Verify backend is running: `curl http://192.168.68.183:5001/health`
2. Check your IP hasn't changed: `ifconfig | grep "inet " | grep -v 127.0.0.1`
3. Update IP in `fitcoach-expo/src/config/api.config.ts` if needed

**Backend won't start:**
- Check port isn't in use: `lsof -ti:5001`
- Kill existing process: `lsof -ti:5001 | xargs kill -9`

**App crashes on login:**
- Check Firebase credentials are configured
- Ensure PostgreSQL database is running

## Files Modified
- ✅ `backend/src/server.js` - CORS configuration + default port 5001
- ✅ `fitcoach-expo/src/config/api.config.ts` - Timeout increased to 60s
- ✅ `fitcoach-expo/src/services/api.ts` - Better error messages + 2 retries
