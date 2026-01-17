# Authentication Fix Applied - README

## What Was The Problem?

The authentication was failing because:

1. **Firebase Admin SDK had no credentials** - The backend needs `FIREBASE_SERVICE_ACCOUNT` environment variable to verify Firebase tokens, but it was missing from `.env`

2. **Development mode token decoding was broken** - The previous code couldn't properly decode URL-safe base64 JWT payloads from real Firebase tokens

## What Was Fixed?

### Backend: `/backend/src/config/firebase.js`

1. **Improved JWT decoding** - Now properly handles URL-safe base64 encoding (replacing `-` with `+` and `_` with `/`, adding padding)

2. **Better error handling** - Clear error messages and logging for debugging

3. **Proper order of operations** - First checks for mock tokens, then Firebase Admin (if available), then falls back to development mode decoding

## How To Test (Development Mode)

The authentication should now work in development mode even without Firebase Service Account credentials. Try:

1. **Restart the app** - Close the Expo app completely and reopen it
2. **Log in with any email** - The backend will decode the Firebase token and create/find the user

## For Production (Recommended)

To enable **proper** Firebase token verification, you need to:

1. Go to [Firebase Console](https://console.firebase.google.com/) > Your Project > Project Settings > Service Accounts
2. Click **"Generate new private key"**
3. Download the JSON file
4. Add to your `.env` file:

```bash
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"fitcoach-ai-87ed4",...entire JSON here...}'
```

Or set the path:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account-key.json
```

## Current Backend Status

```
✅ Backend running on port 5001
✅ Development mode: Token decoding bypass enabled
⚠️ Firebase Admin: Not initialized (no credentials)
```

## Troubleshooting

### If authentication still fails:

1. **Check backend is running**: `curl http://localhost:5001/health`
2. **Check network**: Make sure your phone and computer are on the same WiFi
3. **Check logs**: Look at the terminal running the backend for error messages
4. **Restart backend**: `cd backend && npm run dev`

### Common Errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `NETWORK_ERROR` | Phone can't reach backend | Check IP address in `api.config.ts` |
| `TIMEOUT` | Slow network | Increase `API_TIMEOUT` |
| `Token is expired` | Old Firebase token | Sign out and sign in again |

