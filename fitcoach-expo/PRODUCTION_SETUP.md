# Production Setup Guide

## ✅ What's Been Fixed

1. **Google & Apple Authentication** - Fully implemented in AuthContext
2. **Guest Mode** - Fixed navigation and API handling
3. **Firebase** - Configured and ready
4. **API Configuration** - Environment-based configuration

## 🔧 Required Configuration

### 1. Environment Variables

Create a `.env` file in `fitcoach-expo/` directory:

```bash
# API Configuration
EXPO_PUBLIC_API_URL=https://your-production-api.com/api

# Google OAuth (Required for Google Sign-In)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-google-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-google-android-client-id.apps.googleusercontent.com

# Firebase (Optional - for development)
EXPO_PUBLIC_ENABLE_FIREBASE_DEV=false
```

### 2. Backend Environment Variables

Add to `backend/.env`:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_ID_IOS=your-google-ios-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_ID_ANDROID=your-google-android-client-id.apps.googleusercontent.com

# Apple OAuth Configuration
APPLE_CLIENT_ID=com.fitcoach.ai.signin
APPLE_TEAM_ID=your-10-char-team-id
APPLE_KEY_ID=your-10-char-key-id
APPLE_PRIVATE_KEY_PATH=./config/apple_private_key.p8
```

### 3. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/Select project: "FitCoach"
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Web application (for backend verification)
   - iOS application (bundle ID: `com.fitcoach.ai`)
   - Android application (package: `com.fitcoach.ai`)
5. Configure OAuth consent screen
6. Copy Client IDs to environment variables

### 4. Apple Developer Setup

1. Go to [Apple Developer](https://developer.apple.com)
2. Enable "Sign in with Apple" for your App ID
3. Create Service ID for web authentication
4. Create Private Key (.p8 file)
5. Copy Team ID, Key ID, and Service ID to backend environment variables

### 5. Firebase Configuration

Firebase is already configured with:
- ✅ `GoogleService-Info.plist` (iOS)
- ✅ Firebase plugins in `app.json`
- ✅ Bundle ID: `com.fitcoach.ai`

For Android, download `google-services.json` from Firebase Console and place it at:
`fitcoach-expo/android/app/google-services.json`

## 🚀 Building for Production

### iOS

```bash
cd fitcoach-expo
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
eas build --platform ios --profile production
```

### Android

```bash
cd fitcoach-expo
npx expo prebuild --platform android --clean
eas build --platform android --profile production
```

## ✅ Verification Checklist

- [ ] Environment variables set in `.env`
- [ ] Backend environment variables configured
- [ ] Google OAuth credentials created and configured
- [ ] Apple Sign-In configured in Apple Developer
- [ ] Firebase `google-services.json` added for Android
- [ ] API URL points to production backend
- [ ] Test Google Sign-In flow
- [ ] Test Apple Sign-In flow
- [ ] Test Guest mode
- [ ] Test regular email/password authentication

## 📝 Notes

- Guest mode allows navigation but API calls will fail gracefully
- All screens handle guest users by showing empty states
- Firebase is optional in development (set `EXPO_PUBLIC_ENABLE_FIREBASE_DEV=true` to enable)
- OAuth requires proper configuration in Google Cloud Console and Apple Developer

