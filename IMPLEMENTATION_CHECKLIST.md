# FitCoach AI - Implementation Checklist
## Quick Reference for Product Redesign

**Date:** 2026-01-17  
**Status:** ✅ IMPLEMENTATION COMPLETE

**Phases Completed:**
- ✅ Phase 1: Database Migration (014_product_redesign.sql)
- ✅ Phase 2: Backend Controllers (habits, todos, tips, streaks)
- ✅ Phase 3: Navigation Restructure (5-tab architecture)
- ✅ Phase 4: Home Screen (read-only dashboard)
- ✅ Phase 5: Today Screen (action center)
- ✅ Phase 6: MealDetail Screen (swap logic)
- ✅ Phase 7: Progress Screen (reflection)

---

## 🎯 Core Changes Summary

| Area | Before | After |
|------|--------|-------|
| **Home Tab** | Mixed actions + display | **Read-only** awareness |
| **Today Tab** | Separate screens | **Action center** with meals + workout |
| **Food Tab** | Primary tab | **Removed** (access via Today) |
| **Progress Tab** | Analytics (stack only) | **Main tab** for reflection |
| **AI Coach** | Could influence numbers | **Explanation only**, never calculates |

---

## 📋 Implementation Phases

### Phase 1: Database (Estimated: 2 hours)

```bash
# Apply the migration
cd backend
psql -U postgres -d fitcoach_db -f src/config/migrations/014_product_redesign.sql
```

**Tables Created:**
- ✅ `habits` - User's daily habits
- ✅ `habit_logs` - Habit completion tracking
- ✅ `daily_tips` - AI-generated daily tips
- ✅ `daily_todos` - Auto-generated todo list
- ✅ `milestones` - Achievements tracking
- ✅ `user_streaks` - Streak tracking
- ✅ `meal_swaps` - Swap history tracking

---

### Phase 2: Backend Controllers (Estimated: 4 hours)

**Create these files:**

```
backend/src/controllers/
├── habits.controller.js     # CRUD for habits
├── todos.controller.js      # Daily todo generation
├── tips.controller.js       # Daily tip generation
└── milestones.controller.js # Milestone tracking
```

**Add routes in `backend/src/routes/index.js`:**

```javascript
// Habits
router.get('/habits', auth, habitsController.getUserHabits);
router.post('/habits', auth, habitsController.createHabit);
router.post('/habits/:id/toggle', auth, habitsController.toggleHabit);
router.get('/habits/today', auth, habitsController.getTodayHabits);

// Todos
router.get('/todos/today', auth, todosController.getTodayTodos);
router.post('/todos/:id/complete', auth, todosController.completeTodo);

// Tips
router.get('/tips/daily', auth, tipsController.getDailyTip);

// Milestones
router.get('/milestones', auth, milestonesController.getUserMilestones);
router.get('/milestones/check', auth, milestonesController.checkMilestones);

// Streaks
router.get('/streaks', auth, streaksController.getUserStreaks);
```

---

### Phase 3: Navigation Restructure (Estimated: 2 hours)

**Edit `fitcoach-expo/src/navigation/AppNavigator.tsx`:**

```typescript
// NEW TAB ORDER
<Tab.Navigator>
  <Tab.Screen name="Home" component={HomeScreen} />      // Read-only
  <Tab.Screen name="Today" component={TodayScreen} />    // Action center
  <Tab.Screen name="Coach" component={CoachScreen} />    // Explanation
  <Tab.Screen name="Progress" component={ProgressScreen} /> // Reflection
  <Tab.Screen name="Profile" component={ProfileScreen} /> // Settings
</Tab.Navigator>

// REMOVE from tabs:
// - Food (now accessed via Today → Log)
// - Old Dashboard (renamed to Home)
```

**Rename files:**
- `DashboardScreen.tsx` → Keep but modify to be read-only
- `AnalyticsScreen.tsx` → Rename to `ProgressScreen.tsx`

---

### Phase 4: Home Screen (Estimated: 3 hours)

**Make DashboardScreen READ-ONLY:**

```typescript
// REMOVE these from Home:
// - All "Log" buttons
// - All "Generate" buttons  
// - All navigation to logging screens
// - Any input fields

// ADD these components:
// - <CalorieRing /> (consumed vs target)
// - <ProteinRing /> (consumed vs target)
// - <WeeklyTrendChart /> (7-day calorie trend)
// - <MacroBreakdown /> (P/C/F pie or bar)
// - <HydrationCard /> (read-only display)
// - <StepsCard /> (read-only display)
// - <HabitTracker /> (tap-only to toggle)
// - <DailyTip /> (1 sentence)
// - <StreakBadge /> (current streak)
```

---

### Phase 5: Today Screen (Estimated: 4 hours)

**Rebuild TodayScreen as Action Center:**

```typescript
interface TodayScreenProps {
  // Three meal cards
  meals: {
    breakfast: MealCardData;
    lunch: MealCardData;
    dinner: MealCardData;
  };
  
  // Workout section
  workout: WorkoutData;
  
  // Todo list
  todos: TodoItem[];
}

// MealCard should show:
// - Target macros (from backend)
// - Logged macros (from backend)
// - Status badge (Pending/Done)
// - "View Meal" button → opens MealDetailScreen
// - "Generate" button (if no recommendation)
// - "Swap" button (if recommendation exists, show count)
```

---

### Phase 6: MealDetail Screen (Estimated: 3 hours)

**Create or enhance MealDetailScreen:**

```typescript
// Screen shows:
// 1. Target macros (LOCKED - from Meal Distribution Engine)
// 2. Recommended meal with:
//    - Total calories/macros
//    - Ingredient list with portions
//    - Recipe steps (if available)
//    - Prep/cook time
// 3. Action buttons:
//    - "Swap Meal" (shows 3/3 remaining)
//    - "Log This Meal" (quick log all items)
//    - "Log Different Food" (manual entry)

// SWAP LOGIC:
const handleSwap = async () => {
  if (swapsRemaining > 0) {
    // Use pre-validated alternative
    const newMeal = await mealAPI.getNextAlternative(mealId);
    setSwapsRemaining(prev => prev - 1);
  } else {
    // Prompt for AI swap
    Alert.confirm("Use AI to generate a new meal?");
    const newMeal = await mealAPI.aiSwap(mealId, macroTargets);
    // AI MUST stay within ±5% of targets
  }
};
```

---

### Phase 7: Progress Screen (Estimated: 2 hours)

**Rename and enhance AnalyticsScreen:**

```typescript
// Add:
// - Weight journey chart (line chart, filterable by period)
// - Compliance trends (% adherence to calorie/protein targets)
// - Streaks section (current, longest, this week, this month)
// - Milestones list (achieved + upcoming)

// REMOVE:
// - All action buttons
// - Any editing capability
// - Log weight button (move to separate WeightScreen)
```

---

## ✅ Testing Checklist

### Fresh User Flow
- [ ] Sign up → ProfileSetupScreen
- [ ] Complete profile → Targets calculated by FLE
- [ ] Navigate to Home → See zeros (not logged yet)
- [ ] Navigate to Today → See generated recommendations

### Returning User Flow
- [ ] Login → Direct to Home (skip setup)
- [ ] Home shows yesterday's streak
- [ ] Today shows fresh recommendations

### Meal Swap Flow
- [ ] Tap meal → MealDetailScreen
- [ ] Swap 1 → New meal appears, "2/3 remaining"
- [ ] Swap 2 → "1/3 remaining"
- [ ] Swap 3 → "0/3 remaining"
- [ ] Swap 4 → AI prompt, generates within constraints

### AI Constraint Validation
- [ ] Ask AI "What should my calories be?" → Responds with FLE value, doesn't calculate
- [ ] AI generates meal → Verify within ±5% of target
- [ ] AI cannot modify goals table directly

---

## 🚫 Things NOT to Change

1. **Fitness Logic Engine** - Keep as-is (BMR/TDEE/macros)
2. **Meal Distribution Engine** - Keep as-is (splits meals)
3. **Workout Logic Engine** - Keep as-is (workout programs)
4. **Analytics Logic Engine** - Keep as-is (trends/compliance)
5. **Auth Flow** - Keep as-is (login/signup/verify)

---

## 📁 Files Modified/Created

### New Files
```
backend/src/config/migrations/014_product_redesign.sql ✅
backend/src/controllers/habits.controller.js
backend/src/controllers/todos.controller.js
backend/src/controllers/tips.controller.js
backend/src/controllers/milestones.controller.js
backend/src/controllers/streaks.controller.js
fitcoach-expo/src/screens/ProgressScreen.tsx
fitcoach-expo/src/context/DailyContext.tsx
```

### Modified Files
```
fitcoach-expo/src/navigation/AppNavigator.tsx (tab restructure)
fitcoach-expo/src/screens/DashboardScreen.tsx (make read-only)
fitcoach-expo/src/screens/TodayScreen.tsx (action center)
fitcoach-expo/src/screens/MealDetailScreen.tsx (swap logic)
fitcoach-expo/src/services/api.ts (new endpoints)
backend/src/routes/index.js (new routes)
```

### Removed Files (or consolidated)
```
fitcoach-expo/src/screens/MealPlannerScreen.tsx (→ Today)
fitcoach-expo/src/screens/MealDistributionScreen.tsx (auto)
fitcoach-expo/src/screens/HomeScreen.tsx (duplicate)
fitcoach-expo/src/screens/HydrationScreen.tsx (→ Today)
fitcoach-expo/src/screens/WelcomeScreen.tsx (not needed)
fitcoach-expo/src/screens/RecipesScreen.tsx (→ MealDetail)
```

---

## 🎨 Design Tokens

```typescript
// Use these consistently
export const DESIGN = {
  colors: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#26D9BB',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    statusPending: '#F59E0B',  // Amber (not red)
    statusComplete: '#3B82F6', // Blue (not green)
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  }
};
```

---

## ⏱️ Estimated Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | Database migration | 2 hours |
| 2 | Backend controllers | 4 hours |
| 3 | Navigation restructure | 2 hours |
| 4 | Home screen (read-only) | 3 hours |
| 5 | Today screen (actions) | 4 hours |
| 6 | MealDetail screen | 3 hours |
| 7 | Progress screen | 2 hours |
| 8 | Testing & polish | 4 hours |
| **Total** | | **24 hours** |

---

**Reference:** See `PRODUCT_ARCHITECTURE_REDESIGN.md` for full specifications.
