# Firebase iOS SDK Setup via Swift Package Manager (SPM)

**Status**: Step-by-step guide for adding Firebase to your Xcode project  
**Date**: January 8, 2026

---

## ⚠️ Important: React Native + Expo Considerations

This guide is for adding Firebase via **Swift Package Manager** in Xcode. However, since this is a **React Native / Expo** project:

### Recommended Approach for React Native:
1. **Use npm packages** + **CocoaPods** (standard for React Native):
   ```bash
   cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/fitcoach-expo
   npm install @react-native-firebase/app @react-native-firebase/crashlytics @react-native-firebase/analytics
   npx expo prebuild --platform ios --clean
   cd ios && pod install && cd ..
   ```

2. **Use Swift Package Manager** (this guide) - Advanced:
   - Can be used with Expo after `npx expo prebuild`
   - May require manual native code adjustments
   - Best if you're comfortable with native iOS development

**This guide covers Option 2 (SPM)**. If you prefer the standard approach, use Option 1 above.

---

## Prerequisites

### 1. Generate iOS Native Project (If Using Expo)
```bash
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/fitcoach-expo
npx expo prebuild --platform ios --clean
```

This creates the `ios/` folder with Xcode project files.

### 2. Verify iOS Project Exists
```bash
ls -la ios/
# Should see: fitcoach-expo.xcodeproj or fitcoach-expo.xcworkspace
```

### 3. Install Xcode Command Line Tools
```bash
xcode-select --install
```

---

## Step 1: Open Project in Xcode

### If Using CocoaPods (Recommended):
```bash
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/fitcoach-expo
open ios/fitcoach-expo.xcworkspace
```

**Always use `.xcworkspace`** if it exists (it will after running `pod install`).

### If Not Using CocoaPods:
```bash
open ios/fitcoach-expo.xcodeproj
```

---

## Step 2: Add Firebase iOS SDK via Swift Package Manager

### 2.1 Open Add Packages Dialog
1. In Xcode menu bar: **File → Add Packages...**
2. Or right-click on project in navigator → **Add Packages...**

### 2.2 Enter Firebase Repository URL
When the dialog appears:

**Repository URL:**
```
https://github.com/firebase/firebase-ios-sdk
```

Paste this into the search field at the top right.

### 2.3 Select SDK Version

**Dependency Rule Options:**
- **Up to Next Major Version** (Recommended): `11.0.0 < 12.0.0`
  - Gets latest patches and minor updates automatically
  - Safe for production
  
- **Exact Version**: `11.5.0`
  - Locks to specific version
  - Use if you need stability
  
- **Branch**: `main`
  - Latest development version
  - Not recommended for production

**Recommendation**: Choose **"Up to Next Major Version"** with version `11.0.0`

Click **Add Package** (bottom right)

### 2.4 Select Firebase Products

Xcode will show a list of available Firebase libraries. Select these for FitCoach AI:

**Required:**
- ☑️ **FirebaseAnalytics** (or **FirebaseAnalyticsWithoutAdId** if you don't collect IDFA)
- ☑️ **FirebaseCrashlytics**
- ☑️ **FirebaseCore**

**Optional (Add if needed):**
- ☐ **FirebaseAuth** (if using Firebase Authentication)
- ☐ **FirebaseMessaging** (for push notifications)
- ☐ **FirebaseFirestore** (for Firestore database)
- ☐ **FirebaseStorage** (for file storage)
- ☐ **FirebaseRemoteConfig** (for remote configuration)

**Target Selection:**
- Ensure all packages are added to **fitcoach-expo** target
- Check the target column shows your app name

Click **Add Package** (bottom right)

### 2.5 Wait for Package Resolution

Xcode will:
1. Download Firebase iOS SDK
2. Resolve dependencies
3. Index the packages

**Progress indicator**: Top of Xcode window shows "Fetching..." then "Resolving..."

**Time**: Usually 1-3 minutes depending on internet speed

---

## Step 3: Verify Installation

### 3.1 Check Package Dependencies
1. In Xcode, select your project in the navigator (top item)
2. Select **fitcoach-expo** target
3. Go to **General** tab
4. Scroll to **Frameworks, Libraries, and Embedded Content**

You should see:
- FirebaseAnalytics
- FirebaseCrashlytics
- FirebaseCore
- (Any other packages you selected)

### 3.2 Check Package in Project Navigator
1. In the left sidebar, look for **Package Dependencies** section
2. Expand it to see **firebase-ios-sdk**
3. Expand firebase-ios-sdk to see all available products

---

## Step 4: Configure Firebase in Your App

### 4.1 Add GoogleService-Info.plist

**Get the file from Firebase Console:**
1. Go to https://console.firebase.google.com/
2. Select your project (or create one)
3. Go to Project Settings → Your iOS app
4. Download `GoogleService-Info.plist`

**Add to Xcode:**
```bash
# Move downloaded file to iOS folder
mv ~/Downloads/GoogleService-Info.plist /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/fitcoach-expo/ios/
```

**In Xcode:**
1. Right-click `fitcoach-expo` folder in navigator
2. Select **Add Files to "fitcoach-expo"...**
3. Navigate to `ios/GoogleService-Info.plist`
4. **Important**: Check **"Copy items if needed"**
5. **Target**: Ensure **fitcoach-expo** is checked
6. Click **Add**

### 4.2 Verify GoogleService-Info.plist Location

The file should appear in:
- Xcode Project Navigator under `fitcoach-expo` folder
- File system at: `ios/fitcoach-expo/GoogleService-Info.plist`

**Check Bundle ID matches:**
Open `GoogleService-Info.plist` and verify `BUNDLE_ID` matches your app's bundle identifier (`com.fitcoach.ai`)

---

## Step 5: Initialize Firebase in AppDelegate

### 5.1 Import Firebase in AppDelegate.swift

Open `ios/fitcoach-expo/AppDelegate.swift` and add at the top:

```swift
import Firebase
```

### 5.2 Initialize Firebase

Find the `application(_:didFinishLaunchingWithOptions:)` method and add at the **very beginning**:

```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Initialize Firebase - ADD THIS LINE FIRST
    FirebaseApp.configure()
    
    // ...existing Expo code...
    
    return true
}
```

**Example full method:**
```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Initialize Firebase
    FirebaseApp.configure()
    
    // Expo module initialization
    self.moduleName = "main"
    self.bridge = RCTBridge(delegate: self, launchOptions: launchOptions)
    
    let rootView = self.createRootView()
    self.window = UIWindow(frame: UIScreen.main.bounds)
    let rootViewController = self.createRootViewController()
    rootViewController.view = rootView
    self.window?.rootViewController = rootViewController
    self.window?.makeKeyAndVisible()
    
    return true
}
```

---

## Step 6: Enable Crashlytics (Optional)

### 6.1 Add Upload Symbols Script

1. In Xcode, select **fitcoach-expo** target
2. Go to **Build Phases** tab
3. Click **+** → **New Run Script Phase**
4. Drag the new script phase **BELOW** "Compile Sources"
5. Name it: **"Firebase Crashlytics"**
6. Add this script:

```bash
"${BUILD_DIR%/Build/*}/SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run"
```

**Input Files:**
```
${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${TARGET_NAME}
$(SRCROOT)/$(BUILT_PRODUCTS_DIR)/$(INFOPLIST_PATH)
```

### 6.2 Disable Bitcode (If Needed)

1. Select **fitcoach-expo** target
2. Go to **Build Settings**
3. Search for **"Enable Bitcode"**
4. Set to **No**

---

## Step 7: Build and Test

### 7.1 Clean Build Folder
In Xcode: **Product → Clean Build Folder** (Shift + Cmd + K)

### 7.2 Build the Project
**Product → Build** (Cmd + B)

**Expected result**: ✅ Build Succeeded

**Common errors:**
- **"No such module 'Firebase'"** → Check AppDelegate imports
- **"GoogleService-Info.plist not found"** → Verify file is in target
- **"Duplicate symbols"** → May have both CocoaPods and SPM (remove one)

### 7.3 Run on Simulator
**Product → Run** (Cmd + R)

**Check Console for Firebase logs:**
```
[Firebase/Core][I-COR000001] Configuring the default app.
[Firebase/Analytics][I-ACS023007] Firebase Analytics enabled
[Firebase/Crashlytics] Crashlytics initialization successful
```

### 7.4 Test Crashlytics (Optional)

Add a test crash button temporarily:

```swift
// In AppDelegate.swift or a test view controller
import FirebaseCrashlytics

// Trigger test crash
Crashlytics.crashlytics().setCustomValue("test", forKey: "test_key")
fatalError("Test crash for Crashlytics")
```

**After crash:**
1. Relaunch app
2. Wait 5 minutes
3. Check Firebase Console → Crashlytics
4. Should see crash report

---

## Step 8: Re-enable Firebase in JavaScript Code

Now that native Firebase is installed, re-enable the Firebase code we commented out:

### 8.1 Uncomment App.tsx
```typescript
// Remove comments from these lines:
import { initializeFirebase } from './src/config/firebase';

// In useEffect:
initializeFirebase()
  .then((success) => {
    if (success) {
      logger.log('Firebase initialized successfully');
    }
  })
  .catch((error) => {
    logger.error('Firebase initialization failed', error);
  });
```

### 8.2 Uncomment ErrorBoundary.tsx
```typescript
// Remove comments:
import { logError as firebaseLogError } from '../config/firebase';

// In componentDidCatch:
firebaseLogError(error, {
  componentStack: errorInfo.componentStack,
  type: 'ErrorBoundary',
});
```

### 8.3 Uncomment logger.ts
```typescript
// Remove comments:
import { logError as firebaseLogError, logMessage as firebaseLogMessage } from '../config/firebase';

// In log(), error(), warn() methods - remove comment blocks
```

---

## Step 9: Rebuild and Deploy

### 9.1 Clean Metro Cache
```bash
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/fitcoach-expo
rm -rf node_modules/.cache .expo
```

### 9.2 Rebuild iOS App
```bash
npx expo run:ios
```

Or in Xcode: **Product → Clean Build Folder** → **Product → Run**

### 9.3 Verify Firebase Integration

**Check logs for:**
```
LOG  [Firebase] Firebase initialized successfully
LOG  📦 Using in-memory storage
LOG  🌐 [CONFIG] API Base URL: http://localhost:5001/api
```

**No errors should appear about Firebase.**

---

## Troubleshooting

### Error: "Duplicate symbol _OBJC_CLASS_$_FIRApp"

**Cause**: Both CocoaPods and SPM are providing Firebase

**Solution**: Choose one method:
- **Option A**: Remove CocoaPods Firebase, use only SPM
- **Option B**: Remove SPM packages, use only CocoaPods

**To remove SPM:**
1. Select project in navigator
2. Go to **Package Dependencies** tab
3. Select firebase-ios-sdk
4. Click **-** (minus) button
5. Clean and rebuild

### Error: "GoogleService-Info.plist not found"

**Solution:**
1. Verify file exists: `ls ios/fitcoach-expo/GoogleService-Info.plist`
2. In Xcode, check file is in project navigator
3. Select file → Show File Inspector (right panel)
4. Verify **Target Membership** includes your app target

### Error: "Module 'Firebase' not found"

**Solution:**
1. Clean build folder: **Product → Clean Build Folder**
2. Close Xcode
3. Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`
4. Reopen Xcode
5. Build again

### Crashlytics Not Showing Data

**Checklist:**
- ✅ Wait 5-10 minutes after first crash
- ✅ App must restart after crash (Crashlytics uploads on next launch)
- ✅ Must be connected to internet
- ✅ Check Firebase Console → Crashlytics → Enable Crashlytics

---

## Verification Checklist

- [ ] Firebase iOS SDK added via SPM in Xcode
- [ ] GoogleService-Info.plist added to Xcode project
- [ ] FirebaseApp.configure() called in AppDelegate
- [ ] Build succeeds without errors
- [ ] App launches successfully
- [ ] Console shows "Firebase initialized successfully"
- [ ] No Firebase-related errors in logs
- [ ] Crashlytics enabled and configured (if using)
- [ ] JavaScript Firebase code uncommented
- [ ] Analytics events being sent (check Firebase Console)

---

## Next Steps

1. **Set up Firebase Project** (if not done):
   - Go to https://console.firebase.google.com/
   - Create project or use existing
   - Add iOS app with bundle ID: `com.fitcoach.ai`
   - Download GoogleService-Info.plist

2. **Configure Firebase Services**:
   - Enable Crashlytics in Firebase Console
   - Enable Analytics (already enabled by default)
   - Set up any other services you need

3. **Test in Production**:
   - Build release version
   - Test on physical device
   - Verify Crashlytics receives crashes
   - Check Analytics in Firebase Console

4. **Add to .gitignore** (Important):
   ```
   ios/GoogleService-Info.plist
   android/app/google-services.json
   ```

---

## Alternative: Using CocoaPods Instead

If you prefer the standard React Native approach:

```bash
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/fitcoach-expo

# Remove SPM packages in Xcode first (if added)

# Install npm packages
npm install @react-native-firebase/app @react-native-firebase/crashlytics @react-native-firebase/analytics

# Prebuild native project
npx expo prebuild --platform ios --clean

# Install pods
cd ios && pod install && cd ..

# Run
npx expo run:ios
```

This method is **recommended** for React Native projects as it's better tested and supported.

---

## Support

**Firebase Documentation**: https://firebase.google.com/docs/ios/setup  
**React Native Firebase**: https://rnfirebase.io/  
**Expo Firebase**: https://docs.expo.dev/guides/using-firebase/  

**Your Firebase Console**: https://console.firebase.google.com/project/fitcoach-ai

---

**Last Updated**: January 8, 2026  
**Status**: Ready for implementation
