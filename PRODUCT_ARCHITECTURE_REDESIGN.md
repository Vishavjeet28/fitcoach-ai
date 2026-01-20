# FitCoach AI - Product Architecture Redesign
## Complete Implementation Specification

**Version:** 2.0  
**Created:** 2026-01-17  
**Status:** Implementation Ready

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Core Product Philosophy](#2-core-product-philosophy)
3. [Logic Engine Ownership](#3-logic-engine-ownership)
4. [Navigation Architecture](#4-navigation-architecture)
5. [Page Specifications](#5-page-specifications)
6. [Database Schema Changes](#6-database-schema-changes)
7. [API Dependencies](#7-api-dependencies)
8. [State Management](#8-state-management)
9. [Implementation Steps](#9-implementation-steps)
10. [UI/UX Guidelines](#10-uiux-guidelines)

---

## 1. Executive Summary

### Current State Analysis
The existing app has:
- **23 screens** (many redundant or overlapping)
- **5 logic engines** (Fitness, Meal Distribution, Meal Recommendation, Workout, Analytics)
- **5 bottom tabs** (Home, AI Coach, Food, Today, Profile)
- Mixed responsibilities between screens
- AI currently can influence calculations (violation)

### Target State
- **Clean 5-tab architecture** with strict responsibilities
- **Read-only Home** for awareness
- **Action-based Today** for execution
- **AI constrained** to explanation only
- **Zero drift** in daily macro totals

---

## 2. Core Product Philosophy

### Non-Negotiable Principles

| Principle | Implementation |
|-----------|---------------|
| Calm & Supportive | Soft colors, positive framing, no red/green judgment colors |
| Value in 2-3 minutes | Today page shows exactly what to do |
| Never feel behind | Progress shown as journey, not deficit |
| AI never decides macros | All numbers from Fitness Logic Engine only |
| Deterministic truth | Logic engines are single source; AI reads, never writes |

### AI Usage Boundaries

```
✅ ALLOWED:
- Explain why calories are set at X
- Motivate after a skipped day
- Suggest meal alternatives (within macro constraints)
- Provide workout encouragement

❌ FORBIDDEN:
- Calculate BMR/TDEE
- Modify calorie targets
- Override meal distribution
- Set macro goals
- Adjust workout intensity numbers
```

---

## 3. Logic Engine Ownership

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER PROFILE (One-Time Setup)                │
│   Age, Height, Weight, Gender, Activity, Goal, Preferences      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              FITNESS LOGIC ENGINE (FLE)                         │
│   • calculateBMR()                                              │
│   • calculateTDEE()                                             │
│   • calculateCalorieTarget()                                    │
│   • calculateMacroTargets()                                     │
│   OUTPUT: Daily calories, protein_g, carb_g, fat_g              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│           MEAL DISTRIBUTION ENGINE (MDE)                        │
│   • distributePlan()                                            │
│   • getRemainingMacros()                                        │
│   • executeMacroSwap()                                          │
│   OUTPUT: Breakfast/Lunch/Dinner targets                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│          MEAL RECOMMENDATION ENGINE (MRE)                       │
│   • generateMealRecommendation()                                │
│   • swapMeal() [max 3 manual, then AI]                          │
│   • getMealAlternatives()                                       │
│   OUTPUT: Food items that FIT the meal targets                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              WORKOUT LOGIC ENGINE (WLE)                         │
│   • recommendProgram()                                          │
│   • getDailyWorkout()                                           │
│   • logSession()                                                │
│   OUTPUT: Today's workout plan                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│             ANALYTICS LOGIC ENGINE (ALE)                        │
│   • refreshDailySnapshot()                                      │
│   • getWeeklyAnalytics()                                        │
│   • getMonthlyAnalytics()                                       │
│   OUTPUT: Trends, streaks, compliance                           │
└─────────────────────────────────────────────────────────────────┘
```

### Ownership Matrix

| Data Type | Owner Engine | Can Read | Cannot Modify |
|-----------|--------------|----------|---------------|
| Calories Target | FLE | All screens, AI | AI, Meal Engine |
| Macro Targets | FLE | All screens, AI | AI, Meal Engine |
| Meal Split | MDE | Today, MealDetail | AI |
| Meal Suggestions | MRE | Today, MealDetail | - |
| Workout Plan | WLE | Today, WorkoutPlanner | AI |
| Trends/Streaks | ALE | Home, Progress, Profile | - |

---

## 4. Navigation Architecture

### New Tab Structure

```
┌──────────────────────────────────────────────────────────────┐
│                    BOTTOM TAB BAR                            │
├──────────┬──────────┬──────────┬──────────┬──────────────────┤
│   Home   │  Today   │ AI Coach │ Progress │     Profile      │
│  (Read)  │ (Action) │ (Explain)│ (Reflect)│    (Settings)    │
└──────────┴──────────┴──────────┴──────────┴──────────────────┘
```

### Screen Hierarchy

```
AppNavigator
├── AuthStack (unauthenticated)
│   └── AuthScreen
│
├── ProfileSetupStack (profile_setup_required)
│   └── ProfileSetupScreen (ONE-TIME ONLY)
│
└── MainStack (authenticated)
    ├── TabNavigator
    │   ├── Home (DashboardScreen) ──────── READ ONLY
    │   ├── Today (TodayScreen) ─────────── ACTION CENTER
    │   │   └── [Modal] MealDetailScreen
    │   │   └── [Modal] WorkoutSessionScreen
    │   ├── Coach (CoachScreen) ─────────── EXPLANATION
    │   ├── Progress (ProgressScreen) ──── REFLECTION
    │   └── Profile (ProfileScreen) ─────── SETTINGS
    │
    └── StackScreens
        ├── FoodLog (logging interface)
        ├── WaterLog
        ├── WeightLog
        ├── History
        └── Settings
```

### Removed/Consolidated Screens

| Screen | Action |
|--------|--------|
| `FoodLogScreen` | Keep (used for quick logging) |
| `MealPlannerScreen` | REMOVE (consolidated into Today) |
| `MealDistributionScreen` | REMOVE (auto-calculated) |
| `WorkoutPlannerScreen` | CONSOLIDATE into Today |
| `AnalyticsScreen` | RENAME to ProgressScreen |
| `HomeScreen` | REMOVE (DashboardScreen is Home) |
| `HydrationScreen` | REMOVE (consolidated into Today) |
| `RecipesScreen` | REMOVE (recipes shown in MealDetail) |
| `WelcomeScreen` | REMOVE (not needed post-login) |

---

## 5. Page Specifications

### 5.1 HOME (DashboardScreen) — READ ONLY

**Purpose:** Awareness & Reassurance  
**Question Answered:** "Am I doing okay?"

#### Required Components

```typescript
interface HomeScreenData {
  // Primary Rings (TOP)
  caloriesRing: {
    consumed: number;
    target: number;
    percentage: number;
  };
  proteinRing: {
    consumed: number;
    target: number;
    percentage: number;
  };
  
  // Charts (MIDDLE)
  weeklyIntakeTrend: {
    dates: string[];
    calories: number[];
    target: number;
  };
  macroDistribution: {
    protein: number;
    carbs: number;
    fat: number;
  };
  
  // Quick Stats (CARDS)
  hydration: {
    current_ml: number;
    target_ml: number;
  };
  steps: {
    current: number;
    goal: number;
  };
  
  // Habits (TAP-ONLY)
  habits: {
    id: string;
    name: string;
    completed: boolean;
    icon: string;
  }[];
  
  // Motivation
  dailyTip: string; // 1 sentence max
  currentStreak: number;
}
```

#### Data Sources
- `GET /api/fitness/targets` → Calorie/Macro targets
- `GET /api/analytics/daily-snapshot` → Today's consumed totals
- `GET /api/analytics/weekly` → 7-day trend
- `GET /api/water/totals` → Hydration
- `GET /api/habits/today` → Habit status (NEW)
- `GET /api/tips/daily` → AI-generated tip (read-only)

#### Forbidden Actions
- ❌ No logging buttons
- ❌ No editing
- ❌ No "Generate" buttons
- ❌ No AI interactions
- ❌ No settings changes

#### Layout Specification

```
┌─────────────────────────────────────────┐
│         Good Morning, [Name]!           │
│            Today's Overview             │
├─────────────────────────────────────────┤
│   ┌───────────┐   ┌───────────┐         │
│   │  CALORIES │   │  PROTEIN  │         │
│   │   Ring    │   │   Ring    │         │
│   │  1450/    │   │   85g/    │         │
│   │  2000     │   │  120g     │         │
│   └───────────┘   └───────────┘         │
├─────────────────────────────────────────┤
│   📊 7-Day Intake Trend                 │
│   ┌─────────────────────────────────┐   │
│   │        Bar/Line Chart           │   │
│   │   Mon Tue Wed Thu Fri Sat Sun   │   │
│   └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│   🥧 Today's Macros                     │
│   ┌─────────────────────────────────┐   │
│   │      Protein: 35% (85g)         │   │
│   │      Carbs: 45% (180g)          │   │
│   │      Fat: 20% (55g)             │   │
│   └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│   💧 Water: 1.5L / 3L   🚶 Steps: 5k/10k │
├─────────────────────────────────────────┤
│   ✅ Habits  [Stretch] [Meditate] [Walk]│
├─────────────────────────────────────────┤
│   💡 "Protein at breakfast improves     │
│      satiety throughout the day"        │
├─────────────────────────────────────────┤
│   🔥 12-day streak!                     │
└─────────────────────────────────────────┘
```

---

### 5.2 TODAY (TodayScreen) — ACTION CENTER

**Purpose:** Execution  
**Question Answered:** "What should I do today?"

#### Required Components

```typescript
interface TodayScreenData {
  // MEALS SECTION
  meals: {
    breakfast: MealCard;
    lunch: MealCard;
    dinner: MealCard;
  };
  
  // WORKOUT SECTION
  workout: {
    name: string;
    isRestDay: boolean;
    estimatedCalories: number;
    duration: number;
    exerciseCount: number;
    status: 'pending' | 'in_progress' | 'completed';
  };
  
  // TO-DO COLUMN
  todos: {
    id: string;
    label: string;
    completed: boolean;
    icon: string;
    action?: () => void;
  }[];
}

interface MealCard {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  status: 'pending' | 'logged' | 'skipped';
  
  // Targets (from Meal Distribution Engine)
  target: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  
  // Logged (from food_logs)
  logged: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  
  // Recommendation (if status === 'pending')
  recommendation?: {
    id: number;
    foods: FoodItem[];
    swapsRemaining: number;
  };
}
```

#### Data Sources
- `GET /api/meals/daily-with-recommendations` → All meal data
- `GET /api/workout/daily` → Today's workout
- `GET /api/todos/today` → To-do list (NEW)

#### Actions Available
- ✅ Tap meal card → Open MealDetailScreen
- ✅ "Generate Meal" → Call MRE.generateMealRecommendation()
- ✅ "Swap Meal" → Call MRE.swapMeal() (max 3)
- ✅ "Start Workout" → Open WorkoutSessionScreen
- ✅ "Log Workout" → Call WLE.logSession()
- ✅ Tap todo → Mark complete

#### Layout Specification

```
┌─────────────────────────────────────────┐
│              Today                      │
│         Friday, Jan 17                  │
├─────────────────────────────────────────┤
│   🍳 MEALS                              │
│   ┌─────────────────────────────────┐   │
│   │ BREAKFAST          [Generate ▶] │   │
│   │ Target: 600 kcal | 45g protein  │   │
│   │ Logged: 580 kcal | 42g protein  │   │
│   │ Status: ✅ Logged               │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │ LUNCH              [Pending...] │   │
│   │ Target: 750 kcal | 55g protein  │   │
│   │ Logged: 0 kcal | 0g protein     │   │
│   │ Status: ⏳ Pending              │   │
│   │     Recommended: Grilled...     │   │
│   │     [View Meal] [Swap] 🔄 3/3   │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │ DINNER                          │   │
│   │ Target: 650 kcal | 50g protein  │   │
│   │ (Auto-adjusted from breakfast)  │   │
│   │ Status: ⏳ Pending              │   │
│   └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│   🏋️ WORKOUT                           │
│   ┌─────────────────────────────────┐   │
│   │ Upper Body Day A                │   │
│   │ 45 min | ~320 kcal | 6 exercises│   │
│   │         [Start Workout]         │   │
│   └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│   📋 TO-DO                              │
│   ☑️ Log breakfast                      │
│   ☐ Log lunch                          │
│   ☐ Drink 3L water (1.5L done)         │
│   ☐ Walk 10,000 steps                  │
│   ☐ Complete workout                    │
│   ☐ 5-min stretch (post-workout)       │
└─────────────────────────────────────────┘
```

---

### 5.3 MEAL DETAIL (MealDetailScreen) — DECISION SUPPORT

**Purpose:** Decision Support  
**Question Answered:** "What should I eat now?"

**Opened when:** User taps Breakfast/Lunch/Dinner card

#### Required Components

```typescript
interface MealDetailData {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  date: string;
  
  // Target (from MDE - LOCKED)
  target: MacroSet;
  
  // Current Recommendation
  recommendation: {
    id: number;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    
    ingredients: {
      name: string;
      quantity: number;
      unit: string;
      calories: number;
      protein: number;
    }[];
    
    recipe?: {
      prepTime: number;
      cookTime: number;
      steps: string[];
      tips: string[];
    };
    
    alternativesCount: number;
  };
  
  // Swap Status
  swap: {
    manualSwapsRemaining: number; // Max 3
    totalSwapsToday: number;
    aiSwapAvailable: boolean;
  };
  
  // Logging
  logged: {
    items: FoodLogItem[];
    totals: MacroSet;
  };
}
```

#### Swap Rules (STRICT)

```typescript
const SWAP_RULES = {
  MAX_MANUAL_SWAPS: 3,
  
  // First 3 swaps: Pre-validated alternatives
  manualSwap: async (mealId: number) => {
    if (swapsRemaining <= 0) {
      return showAISwapPrompt();
    }
    return MealRecommendationEngine.getNextAlternative(mealId);
  },
  
  // After manual swaps exhausted: AI generates
  aiSwap: async (mealId: number, macroTargets: MacroSet) => {
    // AI MUST stay within ±5% of target
    const newMeal = await AI.generateMealWithinConstraints(macroTargets);
    
    // VALIDATE before saving
    if (!validateMacroTolerance(newMeal, macroTargets, 0.05)) {
      throw new Error('AI meal exceeds tolerance');
    }
    
    return newMeal;
  }
};
```

#### Layout Specification

```
┌─────────────────────────────────────────┐
│  ← Back                                 │
│              LUNCH                      │
│         Friday, Jan 17                  │
├─────────────────────────────────────────┤
│   TARGET (Locked)                       │
│   750 kcal | 55g P | 80g C | 28g F     │
├─────────────────────────────────────────┤
│   🥗 RECOMMENDED MEAL                   │
│   ┌─────────────────────────────────┐   │
│   │ Grilled Chicken Salad           │   │
│   │ Total: 745 kcal                 │   │
│   ├─────────────────────────────────┤   │
│   │ INGREDIENTS                     │   │
│   │ • Chicken breast (150g) - 247cal│   │
│   │ • Mixed greens (100g) - 20cal   │   │
│   │ • Quinoa (80g) - 280cal         │   │
│   │ • Olive oil (15ml) - 120cal     │   │
│   │ • Cherry tomatoes (50g) - 18cal │   │
│   │ • Feta cheese (30g) - 80cal     │   │
│   ├─────────────────────────────────┤   │
│   │ RECIPE                          │   │
│   │ Prep: 10 min | Cook: 15 min     │   │
│   │ 1. Season chicken...            │   │
│   │ 2. Grill for 6-7 min...         │   │
│   │ ...                             │   │
│   └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│   [🔄 Swap Meal (3/3 remaining)]        │
│   [✅ Log This Meal]                    │
│   [✏️ Log Different Food]               │
└─────────────────────────────────────────┘
```

---

### 5.4 AI COACH (CoachScreen) — EXPLANATION

**Purpose:** Explanation & Motivation  
**Question Answered:** "Why is this happening & what should I do?"

#### AI Boundaries (CRITICAL)

```typescript
const AI_COACH_RULES = {
  // ALLOWED
  canExplain: true,      // "Your calories are set to 2000 because..."
  canMotivate: true,     // "Great job logging 5 days in a row!"
  canSuggestAlt: true,   // "If you don't like chicken, try fish"
  canEducate: true,      // "Protein helps muscle recovery because..."
  
  // FORBIDDEN
  cannotSetCalories: true,
  cannotModifyMacros: true,
  cannotOverrideGoals: true,
  cannotAccessRawDB: true,
  
  // Every AI response must include source attribution
  responseFormat: {
    answer: string,
    source: 'fitness_engine' | 'meal_engine' | 'workout_engine' | 'analytics',
    numbers_from: string, // "Calories from Fitness Logic Engine"
    disclaimer: "Numbers are calculated by FitCoach algorithms, not AI"
  }
};
```

#### Suggested Prompts

```typescript
const COACH_PROMPTS = [
  "Why are my calories set to this level?",
  "How can I hit my protein target today?",
  "What's a good alternative to my lunch?",
  "Why am I not losing weight?",
  "How do I build more muscle?",
  "Explain my weekly trend"
];
```

---

### 5.5 PROGRESS (ProgressScreen) — REFLECTION

**Purpose:** Reflection  
**Question Answered:** "Is this working long-term?"

#### Required Components

```typescript
interface ProgressScreenData {
  // Weight Journey
  weight: {
    current: number;
    start: number;
    goal?: number;
    trend: 'losing' | 'gaining' | 'stable';
    weeklyChange: number;
    history: WeightDataPoint[];
  };
  
  // Compliance Trends
  compliance: {
    calorieCompliance: number; // 0-100%
    proteinCompliance: number;
    mealLoggingRate: number;
    workoutCompletionRate: number;
  };
  
  // Streaks
  streaks: {
    current: number;
    longest: number;
    thisWeek: number;
    thisMonth: number;
  };
  
  // Milestones
  milestones: {
    reached: Milestone[];
    upcoming: Milestone[];
  };
  
  // Time Period Selector
  period: 'week' | 'month' | '3months' | 'year' | 'all';
}
```

#### No Actions Allowed
- ❌ No logging
- ❌ No goal changes
- ❌ No plan modifications
- Pure visualization only

---

### 5.6 PROFILE SETUP (ProfileSetupScreen) — ONE-TIME ONLY

**Purpose:** System Configuration  
**Shown:** ONLY when `profile_completed = false`

#### Collection Flow

```typescript
const PROFILE_SETUP_STEPS = [
  {
    step: 1,
    title: "Basic Info",
    fields: ['age', 'height', 'weight', 'gender']
  },
  {
    step: 2,
    title: "Activity Level",
    fields: ['activity_level'],
    options: ['sedentary', 'lightly_active', 'moderately_active', 'very_active']
  },
  {
    step: 3,
    title: "Your Goal",
    fields: ['goal'],
    options: ['fat_loss', 'maintenance', 'muscle_gain', 'recomposition']
  },
  {
    step: 4,
    title: "Preferences",
    fields: ['meal_style', 'workout_level', 'dietary_restrictions']
  }
];

const onProfileComplete = async (profileData) => {
  // 1. Save to DB
  await userAPI.updateProfile(profileData);
  
  // 2. Compute targets via FLE
  const targets = await FitnessLogicEngine.calculateAllTargets(profileData);
  
  // 3. Save computed targets
  await userAPI.saveComputedTargets(targets);
  
  // 4. Set flag
  await userAPI.setProfileCompleted(true);
  
  // 5. Generate first meal distribution
  await MealDistributionEngine.distributePlan(targets, profileData.preferences);
  
  // 6. Generate first workout program
  await WorkoutLogicEngine.recommendProgram(userId);
  
  // 7. Navigate to main app (NEVER SHOW SETUP AGAIN)
  navigation.reset({ routes: [{ name: 'Main' }] });
};
```

---

## 6. Database Schema Changes

### New Tables Required

```sql
-- ============================================================================
-- MIGRATION: Product Architecture Redesign
-- ============================================================================

-- 1. HABITS TRACKING
CREATE TABLE IF NOT EXISTS habits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'checkbox-marked-circle',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, habit_name)
);

CREATE TABLE IF NOT EXISTS habit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    
    UNIQUE(user_id, habit_id, log_date)
);

-- 2. DAILY TIPS (AI-generated, cached)
CREATE TABLE IF NOT EXISTS daily_tips (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tip_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tip_content TEXT NOT NULL,
    tip_category VARCHAR(50), -- nutrition, motivation, workout, recovery
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, tip_date)
);

-- 3. TODO ITEMS (Generated daily)
CREATE TABLE IF NOT EXISTS daily_todos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    todo_date DATE NOT NULL DEFAULT CURRENT_DATE,
    todo_type VARCHAR(50) NOT NULL, -- meal_log, water, workout, stretch, walk
    label TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    priority INTEGER DEFAULT 1,
    
    UNIQUE(user_id, todo_date, todo_type)
);

-- 4. MILESTONES
CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_type VARCHAR(50) NOT NULL, -- weight_goal, streak, consistency, etc.
    milestone_value DECIMAL(10,2),
    achieved_at TIMESTAMP,
    is_achieved BOOLEAN DEFAULT FALSE,
    
    UNIQUE(user_id, milestone_type, milestone_value)
);

-- 5. MEAL RECIPE DETAILS (Extend recommended_meals)
ALTER TABLE recommended_meals 
ADD COLUMN IF NOT EXISTS recipe_steps JSONB,
ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS cook_time_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS tips TEXT[];

-- 6. USER PREFERENCES (Extended)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS ai_control_level VARCHAR(20) DEFAULT 'balanced', -- minimal, balanced, guided
ADD COLUMN IF NOT EXISTS meal_style VARCHAR(20) DEFAULT 'fixed', -- fixed, swap_friendly
ADD COLUMN IF NOT EXISTS workout_level VARCHAR(20) DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_daily_todos_date ON daily_todos(user_id, todo_date);
CREATE INDEX IF NOT EXISTS idx_milestones_user ON milestones(user_id, is_achieved);
```

---

## 7. API Dependencies

### New Endpoints Required

```typescript
// ============================================================================
// NEW API ENDPOINTS
// ============================================================================

// HABITS
GET    /api/habits                  → List user's habits
POST   /api/habits                  → Create new habit
GET    /api/habits/today            → Get today's habit status
POST   /api/habits/:id/toggle       → Toggle habit completion

// TODOS
GET    /api/todos/today             → Get today's auto-generated todos
POST   /api/todos/:id/complete      → Mark todo complete

// TIPS
GET    /api/tips/daily              → Get/generate today's tip

// MILESTONES
GET    /api/milestones              → Get all milestones (achieved + upcoming)
GET    /api/milestones/check        → Check for newly achieved milestones

// ENHANCED MEAL ENDPOINTS
GET    /api/meals/:mealType/detail  → Full meal detail with recipe
POST   /api/meals/:mealType/swap    → Swap meal (respects 3-swap limit)
GET    /api/meals/:mealType/alternatives → Get pre-validated alternatives

// ONBOARDING
POST   /api/onboarding/complete     → Complete profile setup with full calculation
```

### Existing Endpoints (Used As-Is)

```typescript
// FITNESS
GET    /api/fitness/targets         → FLE-computed targets

// MEALS (Enhanced)
GET    /api/meals/daily-with-recommendations → Today's meals + recommendations

// WORKOUT
GET    /api/workout/daily           → Today's workout
POST   /api/workout/log-session     → Log completed workout

// ANALYTICS
GET    /api/analytics/daily-snapshot
GET    /api/analytics/weekly
GET    /api/analytics/monthly
```

---

## 8. State Management

### Global State (Context)

```typescript
// AuthContext (EXISTS - no changes)
interface AuthState {
  authStatus: 'loading' | 'unauthenticated' | 'email_verification_pending' 
              | 'profile_setup_required' | 'authenticated';
  user: User | null;
  isLoading: boolean;
}

// NEW: DailyContext (for Today screen)
interface DailyState {
  date: string; // YYYY-MM-DD
  
  // Targets (from FLE - cached)
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  
  // Meal Distribution (from MDE)
  mealDistribution: {
    breakfast: MacroSet;
    lunch: MacroSet;
    dinner: MacroSet;
  };
  
  // Logged Data
  logged: {
    breakfast: MacroSet;
    lunch: MacroSet;
    dinner: MacroSet;
    water_ml: number;
    workout_completed: boolean;
  };
  
  // Recommendations
  recommendations: {
    breakfast: MealRecommendation | null;
    lunch: MealRecommendation | null;
    dinner: MealRecommendation | null;
  };
  
  // Refresh
  refreshAll: () => Promise<void>;
  refreshMeal: (mealType: string) => Promise<void>;
}
```

### Screen-Level State

```typescript
// Each screen manages its own loading/error state
// No prop drilling - use context or fetch on mount

// Pattern for all screens:
const SomeScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );
  
  // Auto-refresh on return to screen
};
```

---

## 9. Implementation Steps

### Phase 1: Database & Backend (Day 1-2)

```bash
# Step 1: Create migration file
touch backend/src/config/migrations/014_product_redesign.sql

# Step 2: Apply migration
psql -U postgres -d fitcoach_db -f backend/src/config/migrations/014_product_redesign.sql

# Step 3: Create new controllers
touch backend/src/controllers/habits.controller.js
touch backend/src/controllers/todos.controller.js
touch backend/src/controllers/tips.controller.js
touch backend/src/controllers/milestones.controller.js

# Step 4: Add routes
# Edit backend/src/routes/index.js
```

### Phase 2: Navigation Restructure (Day 2-3)

```typescript
// 1. Update AppNavigator.tsx
// - Change tab order to: Home, Today, Coach, Progress, Profile
// - Remove Food tab
// - Rename Dashboard to Home
// - Rename Analytics to Progress

// 2. Update TabNavigator icons
// - Home: view-dashboard
// - Today: calendar-check
// - Coach: robot-excited
// - Progress: chart-line
// - Profile: account
```

### Phase 3: Home Screen Rebuild (Day 3-4)

```typescript
// 1. Make fully read-only
// 2. Remove all action buttons
// 3. Add components:
//    - CalorieRing, ProteinRing
//    - WeeklyTrendChart
//    - MacroBreakdownChart
//    - HydrationCard, StepsCard
//    - HabitTracker (tap-only)
//    - DailyTipCard
//    - StreakBadge
```

### Phase 4: Today Screen Rebuild (Day 4-6)

```typescript
// 1. Restructure layout
// 2. Implement MealCard component with:
//    - Target display
//    - Logged display
//    - Status indicator
//    - Generate/Swap buttons
// 3. Implement WorkoutCard
// 4. Implement TodoList
// 5. Add navigation to MealDetailScreen
```

### Phase 5: MealDetail Screen (Day 6-7)

```typescript
// 1. Create new MealDetailScreen
// 2. Fetch full meal data with recipe
// 3. Implement swap logic:
//    - Track swapsRemaining
//    - First 3: use alternatives
//    - After 3: AI with constraints
// 4. Implement "Log This Meal" quick action
// 5. Link to FoodLogScreen for manual logging
```

### Phase 6: Progress Screen (Day 7-8)

```typescript
// 1. Rename AnalyticsScreen to ProgressScreen
// 2. Add weight journey visualization
// 3. Add compliance trends
// 4. Add streaks display
// 5. Add milestones (achieved + upcoming)
// 6. Remove all action buttons
```

### Phase 7: Testing & Polish (Day 8-10)

```bash
# Test all flows:
1. Fresh user → ProfileSetup → Home
2. Returning user → Home (no setup)
3. Today → MealDetail → Swap (3 times) → AI Swap
4. Today → Workout → Log
5. Progress → View all periods
6. Coach → Ask question (verify no numbers changed)
```

---

## 10. UI/UX Guidelines

### Color Palette

```typescript
const COLORS = {
  // Background (Calm)
  background: '#FAFAFA',       // Light gray
  surface: '#FFFFFF',          // White cards
  
  // Primary (Encouraging)
  primary: '#26D9BB',          // Teal (unchanged)
  primaryLight: '#E6FAF6',     // Teal tint
  
  // Text (Readable)
  textPrimary: '#1E293B',      // Slate 800
  textSecondary: '#64748B',    // Slate 500
  textTertiary: '#94A3B8',     // Slate 400
  
  // Status (Non-judgmental)
  // NO RED/GREEN for success/failure
  statusPending: '#F59E0B',    // Amber (warm)
  statusComplete: '#3B82F6',   // Blue (calm)
  statusInfo: '#8B5CF6',       // Purple (neutral)
  
  // Progress (Encouraging)
  progressFill: '#26D9BB',     // Primary teal
  progressTrack: '#E2E8F0',    // Light gray
};
```

### Typography

```typescript
const TYPOGRAPHY = {
  h1: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
  h2: { fontSize: 22, fontWeight: '600', lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
};
```

### Card Styling

```typescript
const CARD_STYLE = {
  backgroundColor: COLORS.surface,
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
  
  // NO borders - rely on shadow
  borderWidth: 0,
};
```

### Empty States (Non-punishing)

```typescript
const EMPTY_STATE_MESSAGES = {
  no_meals_logged: {
    icon: '🍽️',
    title: "Ready to eat?",
    subtitle: "Tap a meal to see your recommendation",
    // NO "You haven't logged anything"
  },
  no_workout_today: {
    icon: '🧘',
    title: "Rest day!",
    subtitle: "Your body is recovering and getting stronger",
    // Positive framing
  },
  no_weight_data: {
    icon: '📊',
    title: "Let's track your journey",
    subtitle: "Log your weight to see progress over time",
    // Invitation, not criticism
  }
};
```

---

## Summary Checklist

### ✅ Architecture Complete
- [x] Logic engine ownership defined
- [x] Page responsibilities strict
- [x] AI boundaries enforced
- [x] Navigation restructured

### 🔲 Implementation Required
- [ ] Database migration (014_product_redesign.sql)
- [ ] New controllers (habits, todos, tips, milestones)
- [ ] AppNavigator.tsx restructure
- [ ] DashboardScreen → Home (read-only)
- [ ] TodayScreen rebuild (action center)
- [ ] MealDetailScreen (new)
- [ ] ProgressScreen (rename + enhance)
- [ ] DailyContext provider

### 🔲 Testing Required
- [ ] Fresh user flow
- [ ] Returning user flow
- [ ] Meal swap limit enforcement
- [ ] AI constraint validation
- [ ] No macro drift after logging

---

**This document is the implementation specification. Follow it exactly.**
