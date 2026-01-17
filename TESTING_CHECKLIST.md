# 🧪 FitCoach AI - Complete Testing Checklist

## Status: Ready for Testing Phase

**Date**: January 14, 2026  
**Version**: 2.0.2  
**Backend**: Running on port 5001  
**Frontend**: Running on port 8081  

---

## ✅ Fixed Issues

### 1. **API URL Configuration** ✅
- ✅ Updated `lib/api.ts`: Changed port 3001 → 5001
- ✅ Updated `config/api.config.ts`: Updated IP to 192.168.31.240:5001
- ✅ Updated `.env.development`: Updated API URL
- ✅ Backend confirmed running on port 5001

### 2. **TodayScreen Loading Issue** ✅  
- ✅ Fixed: Was using `lib/api.ts` (no auth tokens)
- ✅ Solution: Now uses `services/api.ts` (with auth)
- ✅ Added workoutAPI to services/api
- ✅ Added getDailyNutrition, getDailyMeals, getTodayWorkout methods
- ✅ Added guest mode handling with demo data
- ✅ Zero compilation errors

### 3. **FoodLogScreen Loading Issue** ✅
- ✅ Added guest mode detection
- ✅ Shows alert in demo mode: "Food logging disabled in demo mode"
- ✅ Prevents API calls that would hang
- ✅ Graceful UX for unauthenticated users

---

## 🧪 Testing Checklist

### Phase 1: Backend Verification

#### ✅ Backend Server
- [ ] Backend running on `http://192.168.31.240:5001`
- [ ] Health check responds: `curl http://192.168.31.240:5001/health`
- [ ] No errors in backend terminal
- [ ] Database connected successfully

#### API Endpoints to Test
```bash
# Test Analytics
curl http://192.168.31.240:5001/api/analytics/daily

# Test Meals
curl http://192.168.31.240:5001/api/meals/daily

# Test Workout
curl http://192.168.31.240:5001/api/workout/daily

# Test Food Logs
curl http://192.168.31.240:5001/api/food/logs
```

---

### Phase 2: App Launch & Navigation

#### ✅ App Start
- [ ] App launches without crash
- [ ] No red screen errors
- [ ] Splash screen shows
- [ ] Firebase initializes successfully

#### ✅ Guest Mode (Unauthenticated)
- [ ] Can access app without login
- [ ] Guest mode banner shows on Dashboard
- [ ] Demo data displays correctly

#### ✅ Bottom Navigation (4 tabs)
- [ ] **Home** tab works
- [ ] **Coach** tab works
- [ ] **Food** tab works  
- [ ] **Today** tab works ⭐ NEW
- [ ] All icons display correctly
- [ ] Active tab highlighting works

---

### Phase 3: Dashboard (Home Screen)

#### ✅ Main Components
- [ ] Header shows profile avatar
- [ ] Calorie ring displays correctly
- [ ] Progress percentages accurate
- [ ] Quick Actions grid (6 buttons)
- [ ] All buttons respond to taps

#### ✅ Daily Macros Cards
- [ ] Protein card shows values
- [ ] Hydration card shows values
- [ ] Carbs small card works
- [ ] Fat small card works
- [ ] Progress bars render
- [ ] Percentages calculate correctly

#### ✅ Graphs ⭐ NEW
- [ ] **Macro Trends Graph** displays
  - [ ] Orange line (Protein) visible
  - [ ] Blue line (Carbs) visible
  - [ ] Purple line (Fat) visible
  - [ ] Smooth bezier curves
  - [ ] Day labels (Mon-Sun)
  - [ ] Averages display correctly
- [ ] **Calorie Trends Graph** displays
  - [ ] Green line (Consumed) visible
  - [ ] Orange line (Burned) visible
  - [ ] Weekly average shows
  - [ ] Tap navigates to History

#### ✅ Data Refresh
- [ ] Pull-to-refresh works
- [ ] Data updates on refresh
- [ ] Loading indicator shows
- [ ] No infinite loading states

---

### Phase 4: Today Screen ⭐ NEW

#### ✅ Screen Load
- [ ] Screen loads within 2 seconds
- [ ] No infinite loading spinner
- [ ] Data displays correctly

#### ✅ Guest Mode
- [ ] Shows demo data in guest mode
- [ ] Demo nutrition goals display
- [ ] Demo meals show (Breakfast, Lunch, Dinner)
- [ ] Demo workout displays

#### ✅ Authenticated Mode
- [ ] Fetches real nutrition data
- [ ] Shows actual logged meals
- [ ] Displays today's workout schedule
- [ ] Empty states show when no data

#### ✅ UI Components
- [ ] Nutrition progress bars work
- [ ] Meal cards display properly
- [ ] Workout exercises list
- [ ] "Log Food" button navigates
- [ ] "View Workout" button works
- [ ] Pull-to-refresh functions

---

### Phase 5: Food Logging

#### ✅ Food Log Screen Access
- [ ] Navigate from Dashboard → "Log Food"
- [ ] Navigate from Today → "Log Food"  
- [ ] Screen loads without hanging

#### ✅ Guest Mode
- [ ] Shows alert: "Demo Mode - Food logging disabled"
- [ ] Doesn't hang trying to save
- [ ] Alert has OK button
- [ ] Can go back after alert

#### ✅ Authenticated Mode
- [ ] Search bar works
- [ ] Food database loads
- [ ] Popular foods show
- [ ] Search results filter correctly
- [ ] Can select food item
- [ ] Macros auto-fill
- [ ] Can edit serving size
- [ ] Macros recalculate on serving change
- [ ] Meal type selector works
- [ ] Save button works
- [ ] Success message shows
- [ ] Navigates back to previous screen
- [ ] Dashboard updates with new log

---

### Phase 6: AI Coach

#### ✅ Chat Interface
- [ ] Coach screen loads
- [ ] Can type message
- [ ] Send button works
- [ ] Response appears
- [ ] Chat history shows
- [ ] Scrolling works
- [ ] Loading indicator during response

#### ✅ Guest Mode
- [ ] Limited messages (check counter)
- [ ] Upgrade prompt shows when limit reached

#### ✅ Authenticated Mode
- [ ] Higher message limit
- [ ] Chat history persists
- [ ] Can clear chat

---

### Phase 7: Profile & Settings

#### ✅ Profile Screen
- [ ] Profile loads
- [ ] User info displays
- [ ] Stats show correctly
- [ ] **"View History" button** ⭐ NEW
- [ ] History button navigates correctly
- [ ] Logout button works

#### ✅ Settings
- [ ] Can edit profile
- [ ] Can change goals
- [ ] Can update preferences
- [ ] Save changes works

---

### Phase 8: History Screen

#### ✅ Access Points
- [ ] From Profile → "View History"
- [ ] From Dashboard → Tap calorie graph
- [ ] Screen loads properly

#### ✅ Data Display
- [ ] Shows food logs
- [ ] Shows exercise logs
- [ ] Shows water logs
- [ ] Date filtering works
- [ ] Can delete entries
- [ ] Data accuracy

---

### Phase 9: Meal Planner

#### ✅ Functionality
- [ ] Meal planner loads
- [ ] Can view meal distribution
- [ ] Pie chart displays
- [ ] Meal recommendations show
- [ ] Can accept/reject meals

---

### Phase 10: Workout System

#### ✅ Workout Planner
- [ ] Templates load
- [ ] Can select program
- [ ] Exercises display
- [ ] Can log workout
- [ ] Personal records update

---

### Phase 11: Error Handling

#### ✅ Network Errors
- [ ] Shows error message (not infinite load)
- [ ] Can retry after error
- [ ] Offline mode graceful
- [ ] No app crashes

#### ✅ Empty States
- [ ] Empty meals: Shows "No meals yet"
- [ ] Empty workout: Shows placeholder
- [ ] Empty history: Shows empty state
- [ ] All have call-to-action buttons

---

### Phase 12: Performance

#### ✅ Loading Times
- [ ] Dashboard loads < 2 seconds
- [ ] Today screen loads < 2 seconds
- [ ] Food log loads < 1 second
- [ ] No laggy scrolling
- [ ] Smooth animations

#### ✅ Memory
- [ ] No memory leaks
- [ ] App doesn't slow down over time
- [ ] Graphs don't cause lag

---

## 🐛 Known Issues to Watch

### Potential Issues
1. **Authentication Token Expiry**: Watch for "Session expired" errors
2. **Network Timeout**: 30-second timeout on slow connections
3. **Database Connection**: Backend might lose DB connection
4. **Graph Rendering**: First render might take 200ms
5. **Food Database**: 20k+ items might slow search on older devices

---

## 🚨 Critical Test Scenarios

### Scenario 1: Fresh Install (Guest Mode)
1. Install app
2. Launch without login
3. Browse all screens
4. Try to log food (should see alert)
5. View Today screen (should see demo data)
6. View graphs (should show demo data)

### Scenario 2: Sign Up & First Use
1. Sign up new account
2. Complete onboarding
3. Log first meal
4. Check Dashboard updates
5. Check Today screen updates
6. View graphs (should show real data)

### Scenario 3: Daily Usage Flow
1. Open app in morning
2. Check Today screen for goals
3. Log breakfast
4. Log workout
5. Check progress on Dashboard
6. Log lunch, dinner
7. Review history at end of day

### Scenario 4: Offline → Online
1. Open app offline
2. Should show last cached data
3. Try to log food (should queue or show error)
4. Go online
5. Pull to refresh
6. Data should sync

---

## 📱 Device Testing Matrix

### iOS
- [ ] iPhone 14 Pro (iOS 17)
- [ ] iPhone 12 (iOS 16)
- [ ] iPad Air (iPadOS 17)

### Android
- [ ] Pixel 7 (Android 14)
- [ ] Samsung Galaxy S22 (Android 13)
- [ ] Older device (Android 11)

---

## ✅ Pre-Testing Setup

### Backend
```bash
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/backend
npm run dev
# Should show: "🚀 FitCoach Backend running on port 5001"
```

### Frontend
```bash
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/fitcoach-expo
npx expo start
# Scan QR code with phone
```

### Verify Connections
```bash
# Check backend health
curl http://192.168.31.240:5001/health

# Check API responds
curl http://192.168.31.240:5001/api/analytics/daily
```

---

## 🎯 Success Criteria

### Must Pass (Blockers)
- [ ] App launches without crash
- [ ] Dashboard loads and displays data
- [ ] Today screen loads without infinite spinner
- [ ] Food logging works (or shows proper alert in guest mode)
- [ ] Both graphs display correctly
- [ ] Navigation between all screens works
- [ ] No infinite loading states anywhere

### Should Pass (Important)
- [ ] All 16+ screens load successfully
- [ ] Pull-to-refresh works everywhere
- [ ] Error messages are user-friendly
- [ ] Guest mode handles all cases gracefully
- [ ] Authenticated mode shows real data

### Nice to Have
- [ ] Animations are smooth
- [ ] Load times under 2 seconds
- [ ] Search is instant
- [ ] Graphs are beautiful

---

## 📊 Test Results Template

```
## Test Session: [Date/Time]
Device: [Device Name]
OS: [iOS/Android Version]
Connection: [WiFi/Cellular/Offline]
Mode: [Guest/Authenticated]

### Results:
- Dashboard: ✅/❌
- Today Screen: ✅/❌  
- Food Log: ✅/❌
- Graphs: ✅/❌
- Navigation: ✅/❌
- Performance: ✅/❌

### Issues Found:
1. [Issue description]
2. [Issue description]

### Notes:
[Additional observations]
```

---

## 🔧 Quick Fixes Reference

### If Today Screen Still Loading Forever:
```typescript
// Check TodayScreen.tsx line 81
// Should have guest mode check:
if (user?.email === 'guest@fitcoach.ai' || !user) {
  // Show demo data
  return;
}
```

### If Food Log Hangs:
```typescript
// Check FoodLogScreen.tsx line 129
// Should have guest mode check before API call
if (user?.email === 'guest@fitcoach.ai' || !user) {
  Alert.alert('Demo Mode', '...');
  return;
}
```

### If Graphs Don't Show:
```bash
# Check if chart library installed:
cd fitcoach-expo
npm list react-native-chart-kit
# Should show version 6.x.x
```

### If Backend Not Responding:
```bash
# Restart backend:
cd backend
npm run dev

# Check port:
lsof -i :5001
```

---

## 🎉 Testing Complete Checklist

- [ ] All Phase 1-12 tests passed
- [ ] All critical scenarios tested
- [ ] No blockers found
- [ ] Performance acceptable
- [ ] Ready for production
- [ ] Documentation updated
- [ ] Known issues documented

---

**Last Updated**: January 14, 2026  
**Status**: Ready for Testing  
**Next Step**: Start Phase 1 - Backend Verification
