# 🔥 Firebase Console - Direct Links

## Your Firebase Project

**Project ID**: `fitcoach-ai-87ed4`  
**Project Name**: `fitcoach-ai`  
**Bundle ID**: `com.fitcoach.ai`

---

## 🔗 Direct Links to Firebase Console

### Main Dashboard
**https://console.firebase.google.com/project/fitcoach-ai-87ed4**

### Analytics Dashboard (User Tracking)
**https://console.firebase.google.com/project/fitcoach-ai-87ed4/analytics**

To see users, go to:
- **Analytics** → **Dashboard** → **Users** section
- **Analytics** → **Events** → Look for `login` and `sign_up` events
- **Analytics** → **User Properties** → See user email, name, etc.

### Crashlytics (Error Tracking)
**https://console.firebase.google.com/project/fitcoach-ai-87ed4/crashlytics**

### Authentication (if enabled)
**https://console.firebase.google.com/project/fitcoach-ai-87ed4/authentication**

---

## 📊 Important Notes About User Tracking

### Current Status
- ✅ **Firebase Crashlytics**: Working (tracks errors and users)
- ⚠️ **Firebase Analytics**: Needs native rebuild to track users properly

### Why You See 0 Users

**Firebase Analytics requires native rebuild to work.** Currently:
- Events are being logged in code but not sent to Firebase
- User tracking code is correct but needs native module
- Analytics will work after rebuilding native code

### To See Users in Firebase Console

You have two options:

#### Option 1: Enable Analytics with Native Rebuild (Recommended)
```bash
cd fitcoach-expo
npx expo prebuild --clean
cd ios && pod install && cd ..
npx expo run:ios
```

After rebuild:
- Users will appear in Analytics Dashboard
- Events will be tracked in real-time
- User properties will be visible

#### Option 2: Check Crashlytics (Currently Working)
Go to: **https://console.firebase.google.com/project/fitcoach-ai-87ed4/crashlytics**
- Click on **Users** tab
- You should see user IDs and email addresses
- This works even without native rebuild

---

## 🔍 What's Being Tracked (After Rebuild)

### Events
- `login` - When users log in (standard Firebase event)
- `sign_up` - When users sign up (standard Firebase event)
- `user_login` - Custom login event with user ID
- `user_signup` - Custom signup event with user ID
- `user_logout` - When users log out

### User Properties
- `user_id` - Unique user ID
- `email` - User email address
- `username` - User name

### Screen Views
- Screen navigation is tracked automatically
- Dashboard, Coach, Food, History, Profile screens

---

## ✅ Verification Steps

1. **Check if Firebase is connected**:
   - Console logs should show: `[Firebase] Firebase initialized successfully`
   - If you see this, Firebase IS connected

2. **Check Crashlytics** (works now):
   - Go to Crashlytics Dashboard
   - Click "Users" tab
   - You should see users there

3. **Check Analytics** (needs rebuild):
   - After native rebuild, go to Analytics Dashboard
   - Wait 5-10 minutes after user login
   - You should see users and events

---

## 📱 Quick Links

- **Main Console**: https://console.firebase.google.com/project/fitcoach-ai-87ed4
- **Analytics Dashboard**: https://console.firebase.google.com/project/fitcoach-ai-87ed4/analytics
- **Crashlytics**: https://console.firebase.google.com/project/fitcoach-ai-87ed4/crashlytics
- **Project Settings**: https://console.firebase.google.com/project/fitcoach-ai-87ed4/settings/general

---

**Firebase IS connected** - Analytics just needs native rebuild to start tracking users properly. Crashlytics is working now and you can see users there!

