# Firebase Crashlytics Setup for FitCoach

## Step 1: Install Firebase Packages

```bash
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/fitcoach-expo
npm install --save @react-native-firebase/app @react-native-firebase/crashlytics @react-native-firebase/analytics
```

## Step 2: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name: `fitcoach-ai`
4. Disable Google Analytics (optional for now)
5. Click "Create project"

## Step 3: Add iOS App

1. In Firebase Console, click iOS icon
2. Bundle ID: `com.fitcoach.mobile` (check app.json for actual)
3. App nickname: `FitCoach iOS`
4. Download `GoogleService-Info.plist`
5. **IMPORTANT**: Move to `fitcoach-expo/ios/` directory:
   ```bash
   mv ~/Downloads/GoogleService-Info.plist /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/fitcoach-expo/ios/
   ```

## Step 4: Add Android App

1. In Firebase Console, click Android icon
2. Package name: `com.fitcoach.mobile` (check app.json for actual)
3. App nickname: `FitCoach Android`
4. Download `google-services.json`
5. **IMPORTANT**: Move to `fitcoach-expo/android/app/` directory:
   ```bash
   mv ~/Downloads/google-services.json /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/fitcoach-expo/android/app/
   ```

## Step 5: Update app.json

The following configuration has already been added:

```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics"
    ],
    "ios": {
      "googleServicesFile": "./ios/GoogleService-Info.plist"
    },
    "android": {
      "googleServicesFile": "./android/app/google-services.json"
    }
  }
}
```

## Step 6: Rebuild Native Code

After installing packages and adding config files:

```bash
# iOS
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..

# Android
npx expo prebuild --platform android --clean
```

## Step 7: Verify Installation

Run the app and check for Firebase initialization:

```bash
npx expo run:ios
# or
npx expo run:android
```

Look for log: `[Firebase] Firebase initialized successfully`

## Step 8: Test Crash Reporting

1. Open the app
2. Navigate to any screen
3. Check Firebase Console > Crashlytics
4. Should see "SDK initialized" within 5 minutes

## Force a Test Crash (Optional)

Add this button temporarily to test:

```typescript
import crashlytics from '@react-native-firebase/crashlytics';

<Button onPress={() => crashlytics().crash()} title="Test Crash" />
```

## Troubleshooting

**Error: Google services file not found**
- Verify file paths in app.json
- Make sure files are in correct directories
- Rebuild: `npx expo prebuild --clean`

**Error: Firebase not initialized**
- Check if packages installed: `npm list @react-native-firebase/app`
- Verify firebase.ts is imported in App.tsx
- Clear cache: `npx expo start -c`

**Crashlytics not showing data**
- Wait 5-10 minutes for first sync
- Make sure app is in foreground
- Check Firebase Console > Crashlytics > Enable

## Important Files Created

✅ `src/config/firebase.ts` - Firebase initialization
✅ `src/utils/logger.ts` - Production logger with Crashlytics
✅ `src/components/ErrorBoundary.tsx` - React error boundary
✅ `App.tsx` - Unhandled promise rejection handler

## Security Notes

- **NEVER** commit `GoogleService-Info.plist` or `google-services.json` to Git
- Add to `.gitignore`:
  ```
  ios/GoogleService-Info.plist
  android/app/google-services.json
  ```
- Keep separate files for dev/staging/production

## Next Steps

After Firebase is set up:
1. ✅ Logger will automatically send errors to Crashlytics
2. ✅ ErrorBoundary will catch React render errors
3. ✅ Unhandled promise rejections will be logged
4. ✅ Production-ready crash reporting active
