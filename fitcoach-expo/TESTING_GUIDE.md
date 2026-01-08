# FitCoach AI - Testing Guide
**Date**: January 7, 2026

---

## 🧪 CRITICAL TEST CASES

### Test 1: Auth Readiness (MUST PASS)
**Goal**: Verify no API calls fire before auth is ready

1. Close app completely
2. Open Metro bundler logs: `npx expo start --dev-client`
3. Launch app
4. Watch console output

**Expected**:
```
🔐 [AUTH] Starting auth restoration...
✅ [AUTH] Token and user found in storage
✅ [AUTH] Auth system ready
📊 [DASHBOARD] Auth ready, fetching dashboard data
📊 [DASHBOARD] Fetching dashboard data...
```

**FAIL if**: Dashboard data fetch happens before "Auth system ready"

---

### Test 2: History Updates After Adding Food
**Goal**: Verify history updates immediately after adding food

1. Navigate to Dashboard (Home tab)
2. Note current calorie count
3. Tap "Log Food" or navigate to Food tab
4. Add a food item (e.g., "Banana, 100 calories")
5. Save and go back
6. Navigate to History tab

**Expected**:
- Console shows: `📜 [HISTORY] Auth ready, loading history`
- Console shows: `📜 [HISTORY] Fetching history data...`
- Food item appears in history immediately
- Dashboard calories increased by 100

**FAIL if**: 
- History is empty
- Food doesn't appear
- Dashboard calories don't update

---

### Test 3: Data Persistence Across Restarts
**Goal**: Verify data survives app restart

1. Add food: "Apple, 50 calories"
2. Add water: 250ml
3. Note dashboard totals
4. Force close app completely
5. Reopen app

**Expected**:
- Auth restoration succeeds
- Dashboard shows same totals
- History shows Apple + water
- No data loss

**FAIL if**:
- Data is missing
- Dashboard shows 0
- History is empty

---

### Test 4: AI Chat Works
**Goal**: Verify AI uses backend Gemini

1. Navigate to Coach tab (AI Coach)
2. Type: "What should I eat for breakfast?"
3. Send message

**Expected Console**:
```
🤖 [AI] Sending chat request to backend: 1 messages
✅ [AI] Received response from backend
```

**Expected UI**:
- AI responds with breakfast suggestions
- Response is relevant and helpful
- No "Grok" mentioned anywhere

**FAIL if**:
- No response
- Error message
- Console shows Grok API calls
- Console shows "Backend AI call failed"

---

### Test 5: Dashboard Totals Match History
**Goal**: Verify data consistency

1. Navigate to History tab
2. Manually add up all food calories from today
3. Navigate to Dashboard tab
4. Compare totals

**Expected**:
- Dashboard "Consumed" = Sum of all food calories in history
- Water consumed matches water logs
- Exercise calories match exercise logs

**FAIL if**:
- Numbers don't match
- Dashboard shows more/less than history

---

### Test 6: No Premature API Calls
**Goal**: Verify auth readiness gate works

1. Logout of app
2. Close app completely
3. Clear Metro bundler console
4. Open app
5. Login with credentials
6. Watch console carefully

**Expected**:
```
🔐 [AUTH] Starting auth restoration...
ℹ️ [AUTH] No stored credentials found
✅ [AUTH] Auth system ready
(User logs in)
✅ [AUTH] Login successful
📊 [DASHBOARD] Auth ready, fetching dashboard data
```

**FAIL if**:
- API calls happen before "Auth system ready"
- 401 errors in console
- "Session expired" errors
- Dashboard fetch before auth completes

---

## 🔍 DEBUGGING CHECKLIST

### If History Doesn't Update:
1. Check console for `📜 [HISTORY]` logs
2. Verify `useFocusEffect` fired when navigating to History
3. Check if auth is ready: look for "Auth ready" message
4. Verify backend is running on port 5001

### If AI Doesn't Respond:
1. Check console for `🤖 [AI]` logs
2. Look for "Backend AI call failed" error
3. Verify backend is running: `lsof -ti:5001`
4. Check backend logs for AI endpoint errors
5. Verify Gemini API key is set in backend `.env`

### If Dashboard Shows 0:
1. Check if auth restored successfully
2. Verify backend API is responding
3. Check console for "Error fetching dashboard data"
4. Try pull-to-refresh on dashboard
5. Check backend logs for errors

### If App Crashes on Startup:
1. Check if `isAuthReady` is defined in AuthContext
2. Verify all screens import `useAuthReady` correctly
3. Check Metro bundler for TypeScript errors
4. Clear cache: `rm -rf node_modules && npm install`

---

## 📱 QUICK TEST COMMANDS

```bash
# Start backend
cd /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/backend
node src/server.js

# Start mobile app
cd /Users/vishavjeetsingh/Downloads/fitcoach-expo
npx expo start --dev-client

# Check backend status
lsof -ti:5001 && echo "✅ Backend running" || echo "❌ Backend down"

# View backend logs
tail -f /Users/vishavjeetsingh/Downloads/fitcoach-ai-main/backend/server.log
```

---

## ✅ SUCCESS INDICATORS

All tests pass if you see:
- ✅ Console logs show auth flows correctly
- ✅ History updates immediately after adding data
- ✅ Data persists across app restarts
- ✅ AI responses come from backend
- ✅ Dashboard totals match history exactly
- ✅ No 401 errors in console
- ✅ No "Session expired" errors
- ✅ No API calls before auth is ready

---

## 🚨 KNOWN ISSUES (NONE)

No known issues at this time. All critical stability problems have been fixed.

---

## 📞 SUPPORT

If tests fail:
1. Check console logs for error patterns
2. Verify backend is running and healthy
3. Clear app data and restart
4. Review `STABILITY_FIXES_SUMMARY.md` for implementation details
