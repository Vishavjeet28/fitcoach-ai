# FitCoach Mobile App - Backend Integration

## ✅ What's Been Done

The mobile app is now integrated with the real backend API!

### Files Modified/Created:

1. **`src/services/api.ts`** - Complete API service layer
   - Axios client with automatic token refresh
   - Authentication endpoints (register, login, logout, refresh)
   - Secure token storage with expo-secure-store
   - Error handling with user-friendly messages
   - Request/response interceptors

2. **`src/config/api.config.ts`** - API configuration
   - Base URL: `http://192.168.31.240:5001/api` (your local network)
   - Environment-based configuration (dev vs production)
   - Token storage keys

3. **`src/context/AuthContext.tsx`** - Updated to use real API
   - Removed all mock data
   - Real login/signup with backend
   - Profile updates save to database
   - Error state management
   - Token-based authentication

4. **`src/screens/AuthScreen.tsx`** - Enhanced error display
   - Shows backend error messages
   - Better error handling

### Dependencies Added:
- ✅ axios (already installed)

## 🚀 Testing the Integration

### Step 1: Make sure backend is running
```bash
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/backend
./start.sh
```

Backend should be running on: **http://localhost:5001**

### Step 2: Test on physical device or emulator

The app will now:
1. Register users in the real PostgreSQL database
2. Authenticate with JWT tokens
3. Store tokens securely with expo-secure-store
4. Auto-refresh expired tokens
5. Show real error messages from the API

### Step 3: Try it out!

1. **Sign Up**: Create a new account
   - Email, password, name are saved to database
   - JWT tokens are issued
   - User profile is stored

2. **Login**: Sign in with your credentials
   - Backend validates credentials
   - Returns access token (15 min) + refresh token (7 days)

3. **Profile Updates**: Change your data
   - Updates are saved to PostgreSQL
   - Data persists across app restarts

## 🔧 Configuration

### Change API URL

Edit `src/config/api.config.ts`:

```typescript
export const API_BASE_URL = __DEV__
  ? 'http://YOUR_LOCAL_IP:5001/api'  // Change this to your IP
  : 'https://your-production-api.com/api';
```

To find your local IP:
```bash
# On Mac:
ipconfig getifaddr en0

# On Windows:
ipconfig
```

## 🔐 Authentication Flow

1. **User logs in** → Email/password sent to backend
2. **Backend validates** → Returns JWT access token + refresh token
3. **App stores tokens** → Secure storage with expo-secure-store
4. **API requests** → Include `Authorization: Bearer <token>` header
5. **Token expires** → Automatic refresh using refresh token
6. **Refresh fails** → User logged out, redirected to login

## 📡 API Endpoints Used

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - Logout (revoke refresh token)
- `PATCH /api/auth/profile` - Update user profile

## 🐛 Troubleshooting

### "Cannot connect to server"
- Make sure backend is running on port 5001
- Check your local IP address in `api.config.ts`
- Make sure your phone and computer are on the same WiFi network

### "Request timeout"
- Check backend logs for errors
- Verify PostgreSQL is running
- Check firewall settings

### "Token expired"
- Should auto-refresh automatically
- If not, try logging out and back in

### Backend errors
- Check backend console for detailed error logs
- Run backend tests: `cd backend && ./test-api.sh`

## 📊 Current Status

- ✅ Backend API running (Phase 1 complete)
- ✅ Mobile app API integration (Phase 2 - Todo #6 in progress)
- ⏳ Food logging API (Phase 2 - Todo #2)
- ⏳ Exercise logging API (Phase 2 - Todo #3)
- ⏳ Water tracking API (Phase 2 - Todo #4)
- ⏳ Analytics API (Phase 2 - Todo #5)

## 🎯 Next Steps

Once you test the authentication:
1. Build food logging API endpoints
2. Build exercise logging API endpoints
3. Build water tracking API endpoints
4. Build analytics API endpoints
5. Update remaining mobile screens to use real data

## 🔗 Related Files

- Backend: `/Users/vishavjeetsingh/Downloads/fitcoach-ai-main/backend/`
- Mobile App: `/Users/vishavjeetsingh/Downloads/fitcoach-expo/`
- Backend README: `backend/README.md`
- Phase 1 Report: `backend/PHASE1_COMPLETE.md`
