# FitCoach Mobile App - Backend Integration Guide

## 🎯 STATUS: Core Integration Complete ✅

### ✅ COMPLETED (Parts 1, 2, 6)

#### 1. Authentication & Token Management
- **Location**: `/fitcoach-expo/src/services/api.ts`, `/fitcoach-expo/src/context/AuthContext.tsx`
- **Features**:
  - ✅ JWT access token (15 min) + refresh token (7 days)
  - ✅ Automatic token refresh on 401 responses
  - ✅ Request queuing during token refresh
  - ✅ SecureStore for tokens, AsyncStorage for user data
  - ✅ Session persistence on app restart
  - ✅ Proper logout with token revocation

#### 2. Dashboard Integration
- **Location**: `/fitcoach-expo/src/screens/DashboardScreen.tsx`
- **Connected to**: `GET /api/analytics/daily`
- **Features**:
  - ✅ Real-time calorie tracking (consumed, burned, remaining)
  - ✅ Macro breakdown (protein, carbs, fat) with progress bars
  - ✅ Water intake display (ml → liters conversion)
  - ✅ Pull-to-refresh functionality
  - ✅ Loading states and error handling
  - ✅ Auto-refresh on screen focus

#### 3. API Service Layer
- **Location**: `/fitcoach-expo/src/services/api.ts`
- **All APIs Ready**:
  - ✅ `authAPI` - login, register, refresh, logout, updateProfile
  - ✅ `analyticsAPI` - getDailySummary, getWeeklyTrends, getMonthlyStats, getProgress
  - ✅ `foodAPI` - getLogs, createLog, updateLog, deleteLog, searchFood, getTotals
  - ✅ `exerciseAPI` - getLogs, createLog, updateLog, deleteLog, searchExercise, getTotals
  - ✅ `waterAPI` - getLogs, createLog, deleteLog, getTotals, getHistory

#### 4. TypeScript Types (Aligned with Backend)
All interfaces match backend response structures:

```typescript
// Daily Summary
interface DailySummary {
  date: string;
  summary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalExerciseCalories: number;
    totalExerciseMinutes: number;
    totalWaterMl: number;
    calorieTarget: number;
    waterTargetMl: number;
    netCalories: number;
  };
}

// Food Log
interface FoodLog {
  id: number;
  user_id: number;
  food_id?: number;
  custom_food_name?: string;
  food_name?: string;
  servings: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_date: string;
  logged_at: string;
}

// Exercise Log
interface ExerciseLog {
  id: number;
  exercise_id?: number;
  custom_exercise_name?: string;
  exercise_name?: string;
  duration_minutes: number;
  calories_burned: number;
  intensity: 'light' | 'moderate' | 'vigorous';
  workout_date: string;
  logged_at: string;
}

// Water Log
interface WaterLog {
  id: number;
  amount_ml: number;
  log_date: string;
  logged_at: string;
}
```

---

## 📋 REMAINING WORK (Parts 3, 4, 5, 7, 8)

### Part 3: Food Logging Screen Implementation

**File**: `/fitcoach-expo/src/screens/FoodLogScreen.tsx`

**Requirements**:
1. Display today's food logs grouped by meal type
2. Search food database with autocomplete
3. Add food log with:
   - Food selection (from database or custom)
   - Servings input
   - Meal type selector (breakfast, lunch, dinner, snack)
   - Nutrition preview
4. Delete food logs with swipe-to-delete
5. Display daily totals (calories, macros)

**API Functions Available**:
```typescript
// Get logs
const logs = await foodAPI.getLogs(); // Today's logs
const logs = await foodAPI.getLogs(startDate, endDate); // Date range

// Search food
const results = await foodAPI.searchFood('chicken breast');

// Create log
await foodAPI.createLog({
  foodId: 123,           // OR customFoodName: "My Food"
  servings: 1.5,
  mealType: 'lunch',
  calories: 165,         // Optional if foodId provided
  protein: 31,
  carbs: 0,
  fat: 3.6,
  mealDate: '2026-01-07' // Optional, defaults to today
});

// Update log
await foodAPI.updateLog(logId, { servings: 2 });

// Delete log
await foodAPI.deleteLog(logId);

// Get totals
const totals = await foodAPI.getTotals(); // Today's totals
```

**Backend Endpoints**:
- `GET /api/food/logs?date=YYYY-MM-DD` - Get logs for date
- `POST /api/food/logs` - Create log
- `PUT /api/food/logs/:id` - Update log
- `DELETE /api/food/logs/:id` - Delete log
- `GET /api/food/search?q=query` - Search food database
- `GET /api/food/totals?date=YYYY-MM-DD` - Get daily totals

---

### Part 4: Exercise Logging Screen Implementation

**File**: `/fitcoach-expo/src/screens/ExerciseLogScreen.tsx`

**Requirements**:
1. Display today's exercise logs
2. Search exercise database
3. Add exercise log with:
   - Exercise selection (from database or custom)
   - Duration input (minutes)
   - Intensity selector (light, moderate, vigorous)
   - Auto-calculated calories burned (backend calculates using MET values)
   - Optional: sets, reps, weight, distance
4. Delete exercise logs
5. Display daily totals (duration, calories burned)

**API Functions Available**:
```typescript
// Get logs
const logs = await exerciseAPI.getLogs();

// Search exercises
const results = await exerciseAPI.searchExercise('running');

// Create log
await exerciseAPI.createLog({
  exerciseId: 456,       // OR customExerciseName: "My Exercise"
  durationMinutes: 30,
  intensity: 'moderate',
  sets: 3,               // Optional
  reps: 10,              // Optional
  weightKg: 50,          // Optional
  distanceKm: 5,         // Optional
  notes: 'Morning run',  // Optional
  workoutDate: '2026-01-07' // Optional
});

// Delete log
await exerciseAPI.deleteLog(logId);

// Get totals
const totals = await exerciseAPI.getTotals();
// Returns: { caloriesBurned, durationMinutes, workoutCount }
```

**Backend Endpoints**:
- `GET /api/exercise/logs?date=YYYY-MM-DD` - Get logs
- `POST /api/exercise/logs` - Create log (backend calculates calories)
- `PUT /api/exercise/logs/:id` - Update log
- `DELETE /api/exercise/logs/:id` - Delete log
- `GET /api/exercise/search?q=query` - Search exercises
- `GET /api/exercise/totals?date=YYYY-MM-DD` - Get totals

**Note**: Backend auto-calculates calories using: `MET × weight(kg) × duration(hours)`

---

### Part 5: Water Tracking Screen Implementation

**File**: `/fitcoach-expo/src/screens/WaterLogScreen.tsx`

**Requirements**:
1. Display daily water progress (ml/goal)
2. Quick-add buttons:
   - 250ml (1 glass)
   - 500ml (1 bottle)
   - 1000ml (1 liter)
   - Custom amount input
3. Show individual logs with timestamps
4. Delete logs (swipe or tap)
5. Visual progress indicator (percentage)
6. Daily goal: 3000ml (3 liters)

**API Functions Available**:
```typescript
// Get logs
const logs = await waterAPI.getLogs(); // Today's logs

// Create log
await waterAPI.createLog(250); // Add 250ml
await waterAPI.createLog(500, '2026-01-07'); // With date

// Delete log
await waterAPI.deleteLog(logId);

// Get totals
const totals = await waterAPI.getTotals();
// Returns:
// {
//   date: '2026-01-07',
//   totals: { amountMl: 1500, logCount: 6 },
//   goal: { amountMl: 3000 },
//   remaining: { amountMl: 1500 },
//   progress: { percentage: 50 }
// }

// Get history
const history = await waterAPI.getHistory(7); // Last 7 days
```

**Backend Endpoints**:
- `GET /api/water/logs?date=YYYY-MM-DD` - Get logs
- `POST /api/water/logs` - Create log with `{ amountMl: 250 }`
- `DELETE /api/water/logs/:id` - Delete log
- `GET /api/water/totals?date=YYYY-MM-DD` - Get totals
- `GET /api/water/history?days=7` - Get history

---

### Part 7: Remove Mock Data

**Search for**:
```bash
cd /Users/vishavjeetsingh/Downloads/fitcoach-expo
grep -r "mock\|dummy\|fake\|hardcoded" src/screens/
grep -r "const.*=.*\[.*{.*}\]" src/screens/ # Find hardcoded arrays
```

**Common locations**:
- Initial state in `useState([...])`
- Hardcoded arrays for testing
- Static nutrition data
- Placeholder exercise lists

**Replace with**:
- API calls in `useEffect` or on user actions
- Empty initial states
- Loading states while fetching
- Error states when fetch fails

---

### Part 8: Testing Checklist

#### Authentication Flow ✅
- [x] User can register
- [x] User can login
- [x] Tokens stored securely
- [x] App restart preserves session
- [x] Token auto-refresh works on 401
- [x] Logout clears tokens and navigates to auth

#### Dashboard ✅
- [x] Displays real calories consumed/burned
- [x] Shows macros from backend
- [x] Water intake displayed correctly
- [x] Pull-to-refresh updates data
- [x] Error handling works

#### Food Logging ⏳
- [ ] Can view today's food logs
- [ ] Can search food database
- [ ] Can add food (database + custom)
- [ ] Can edit servings
- [ ] Can delete food
- [ ] Totals update immediately
- [ ] Dashboard updates after food log

#### Exercise Logging ⏳
- [ ] Can view today's exercises
- [ ] Can search exercise database
- [ ] Can add exercise (database + custom)
- [ ] Can set duration and intensity
- [ ] Calories calculated by backend
- [ ] Can delete exercise
- [ ] Dashboard updates after exercise log

#### Water Tracking ⏳
- [ ] Can see daily water progress
- [ ] Quick-add buttons work (250ml, 500ml, 1L)
- [ ] Custom amount entry works
- [ ] Can delete water logs
- [ ] Progress bar updates
- [ ] Dashboard updates after water log

#### Error Handling ✅
- [x] Network errors shown to user
- [x] 401 triggers token refresh
- [x] Session expired logs out user
- [x] Validation errors displayed

#### Data Persistence ✅
- [x] User data persists on restart
- [ ] Food logs persist and sync
- [ ] Exercise logs persist and sync
- [ ] Water logs persist and sync

---

## 🚀 IMPLEMENTATION GUIDE

### Quick Start for Each Screen

#### 1. FoodLogScreen Pattern:
```typescript
const [logs, setLogs] = useState<FoodLog[]>([]);
const [loading, setLoading] = useState(true);

const fetchLogs = async () => {
  try {
    setLoading(true);
    const data = await foodAPI.getLogs();
    setLogs(data);
  } catch (error) {
    Alert.alert('Error', handleAPIError(error));
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchLogs();
}, []);

const handleAddFood = async (foodData) => {
  try {
    await foodAPI.createLog(foodData);
    await fetchLogs(); // Refresh list
    // Optional: Navigate back or show success
  } catch (error) {
    Alert.alert('Error', handleAPIError(error));
  }
};

const handleDeleteFood = async (logId) => {
  try {
    await foodAPI.deleteLog(logId);
    setLogs(logs.filter(log => log.id !== logId));
  } catch (error) {
    Alert.alert('Error', handleAPIError(error));
  }
};
```

#### 2. ExerciseLogScreen Pattern:
```typescript
// Similar to FoodLogScreen, replace foodAPI with exerciseAPI
const [logs, setLogs] = useState<ExerciseLog[]>([]);
// ... same pattern as above
```

#### 3. WaterLogScreen Pattern:
```typescript
const [logs, setLogs] = useState<WaterLog[]>([]);
const [totals, setTotals] = useState<WaterTotals | null>(null);

const fetchData = async () => {
  try {
    const [logsData, totalsData] = await Promise.all([
      waterAPI.getLogs(),
      waterAPI.getTotals()
    ]);
    setLogs(logsData);
    setTotals(totalsData);
  } catch (error) {
    Alert.alert('Error', handleAPIError(error));
  }
};

const handleQuickAdd = async (amount: number) => {
  try {
    await waterAPI.createLog(amount);
    await fetchData(); // Refresh
  } catch (error) {
    Alert.alert('Error', handleAPIError(error));
  }
};
```

---

## 📝 NOTES

### Backend Validation Rules
- **Password**: Min 8 chars, must have uppercase, lowercase, number
- **Name**: Letters, spaces, hyphens only
- **Email**: Valid email format
- **Servings**: Positive number
- **Calories**: 0-10000
- **Duration**: Positive minutes
- **Water amount**: 1-10000 ml

### Date Formats
- All dates in `YYYY-MM-DD` format
- Backend uses ISO timestamps for `logged_at`
- Use `new Date().toISOString().split('T')[0]` for today

### Error Codes
- `401` - Unauthorized (triggers token refresh)
- `403` - Forbidden (invalid refresh token)
- `404` - Not found
- `409` - Conflict (e.g., email already registered)
- `429` - Too many requests (rate limited)
- `500` - Server error

### Refresh Strategy
- Auto-refresh on screen focus: Use `useFocusEffect` from `@react-navigation/native`
- Pull-to-refresh: Use `RefreshControl` component
- After mutations: Call fetch function after create/update/delete

---

## ✅ SUCCESS CRITERIA

The integration is complete when:
1. ✅ User can login and session persists on restart
2. ✅ Dashboard displays real backend data
3. ⏳ User can log food and see it persist
4. ⏳ User can log exercise and see it persist
5. ⏳ User can log water and see it persist
6. ⏳ All screens fetch from backend (no mock data)
7. ✅ Errors are handled gracefully
8. ✅ Token refresh works automatically
9. ⏳ Dashboard updates reflect logged data
10. ⏳ All CRUD operations work end-to-end

---

## 🔗 Backend API Base URL

**Development**: Check `/fitcoach-expo/src/config/api.config.ts`
```typescript
export const API_BASE_URL = 'https://nonnutritive-drusilla-phosphoric.ngrok-free.dev/api';
```

**Health Check**: `GET /health` (without /api prefix)

---

## 📞 SUPPORT

For backend documentation, see:
- `/fitcoach-ai-main/backend/README.md`
- `/fitcoach-ai-main/backend/PROJECT_SUMMARY.md`
- `/fitcoach-ai-main/backend/PHASE4_COMPLETE.md`

For API testing:
- Use Postman/Insomnia with exported collection
- Test credentials: test123456@example.com / Test12345
- Or run: `cd backend && chmod +x test-api.sh && ./test-api.sh`

---

**Status**: Core integration complete. Food/Exercise/Water screens need wiring.
**Next**: Implement Food → Exercise → Water screens in that order.
**Time Estimate**: ~2-3 hours for all three screens.
