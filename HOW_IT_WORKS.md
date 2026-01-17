# 🏋️ How FitCoach AI Works
## Complete System Architecture & User Flow Guide

**Last Updated:** January 14, 2026

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Workout Coach System](#workout-coach-system)
3. [Meal Plan System](#meal-plan-system)
4. [AI Coach Chat](#ai-coach-chat)
5. [Today Screen Integration](#today-screen-integration)
6. [Data Flow & API Integration](#data-flow--api-integration)

---

## 🎯 System Overview

FitCoach AI is a hybrid **AI + Logic-Based** fitness app that combines:
- **Template-based workout programs** (not free-form AI)
- **AI-powered meal recommendations** with strict macro tracking
- **Conversational AI coach** for guidance and motivation
- **Daily goal tracking** for meals and exercises

### Architecture Philosophy

```
┌─────────────────────────────────────────────────────────┐
│                    FitCoach AI System                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  🏋️ Workouts        🍽️ Meals          💬 AI Coach       │
│  (Template-based)   (AI + Validation)  (Conversational)  │
│                                                           │
│  ✓ 5 Templates      ✓ Macro-locked    ✓ Context-aware   │
│  ✓ MET-based cal.   ✓ 1+2 options     ✓ Memory          │
│  ✓ Progressive      ✓ Swap-friendly   ✓ Motivational    │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🏋️ Workout Coach System

### Overview
The workout system uses **pre-defined templates** (NOT AI-generated workouts) with AI only for personalization and tuning.

### 5 Workout Templates

| Template | Frequency | Best For | Level |
|----------|-----------|----------|-------|
| **Push/Pull/Legs** | 3 days/week | Balanced muscle building | Beginner-Advanced |
| **Upper/Lower** | 4 days/week | Strength & size | Beginner-Advanced |
| **Full Body** | 3 days/week | Fat loss, maintenance | Beginner-Intermediate |
| **Bro Split** | 5 days/week | Advanced bodybuilding | Advanced |
| **Powerlifting** | 3-4 days/week | Maximum strength | Intermediate-Advanced |

### How It Works: Step-by-Step

#### **Step 1: User Onboarding**
```typescript
// User completes profile during signup
const userProfile = {
  fitness_goal: 'muscle_gain',      // fat_loss, muscle_gain, recomposition
  experience_level: 'intermediate',  // beginner, intermediate, advanced
  available_equipment: ['barbell', 'dumbbells', 'machine'],
  workout_days_per_week: 4,
  restrictions: ['knee_injury']      // Optional
};
```

#### **Step 2: Template Selection (Backend)**
```javascript
// WorkoutLogicEngine.recommendProgram(user_id)

// Algorithm:
// 1. Fetch user profile (goals, experience, equipment, days)
// 2. Filter templates by compatibility
// 3. Match frequency to user's available days
// 4. Select best template
// 5. Tune exercises (AI assists here)

const recommendation = {
  template: 'upper_lower',
  program: {
    monday: 'Upper A',
    tuesday: 'Lower A',
    thursday: 'Upper B',
    friday: 'Lower B'
  }
};
```

#### **Step 3: Daily Workout Generation**
```javascript
// GET /api/workout/daily?user_id=1

// Returns today's workout based on:
// - Current day of week
// - User's assigned template
// - Progressive overload from last session
// - Exercise substitutions (if equipment unavailable)

{
  "date": "2026-01-14",
  "day_name": "Upper A",
  "exercises": [
    {
      "name": "Bench Press",
      "sets": 4,
      "reps": 8,
      "weight_kg": 80,      // From last session + 2.5kg
      "rest_seconds": 120,
      "met": 6.0,           // Used for calorie calculation
      "equipment": "barbell"
    },
    // ... more exercises
  ],
  "estimated_calories": 320,
  "duration_minutes": 65
}
```

#### **Step 4: Exercise Execution & Logging**
User performs workout and logs each set:

```javascript
// POST /api/workout/log-session

{
  "user_id": 1,
  "date": "2026-01-14",
  "template_id": "upper_lower",
  "day_name": "Upper A",
  "exercises": [
    {
      "exercise_name": "Bench Press",
      "sets_completed": 4,
      "reps_actual": [8, 8, 7, 6],    // What they actually did
      "weight_kg": 80,
      "rest_seconds": [120, 120, 130, 140],
      "calories_burned": 85           // MET-based calculation
    },
    // ... more exercises
  ],
  "total_duration_minutes": 68,
  "total_calories": 320,
  "notes": "Felt strong today!"
}
```

#### **Step 5: Progressive Overload**
The system automatically suggests weight increases:

```javascript
// Logic in WorkoutLogicEngine.calculateProgression()

if (all_sets_completed_successfully && reps >= target) {
  next_weight = current_weight + 2.5; // kg for upper body
  next_weight = current_weight + 5;   // kg for lower body
} else if (failed_multiple_sets) {
  next_weight = current_weight - 5;   // Deload
}
```

### Calorie Calculation (MET-Based)

```javascript
// Formula: Calories = MET × Weight(kg) × Time(hours)

const caloriesBurned = (exercise) => {
  const met = exercise.met;                    // e.g., 6.0 for Bench Press
  const weightKg = user.weight_kg;             // e.g., 75kg
  const timeHours = exercise.duration_min / 60; // e.g., 15 min = 0.25 hrs
  
  return met * weightKg * timeHours;
  // Example: 6.0 × 75 × 0.25 = 112.5 calories
};
```

### Personal Records (PRs)

The system tracks:
- **1 Rep Max (estimated)**: Based on weight × reps using Epley formula
- **Volume PRs**: Most total weight moved in a session
- **Endurance PRs**: Most reps at given weight

```javascript
// Displayed in Profile > Stats
{
  "personal_records": {
    "bench_press": {
      "max_weight": "100kg × 1 rep",
      "estimated_1rm": "110kg",
      "volume_pr": "4000kg total (Jan 10, 2026)"
    }
  }
}
```

---

## 🍽️ Meal Plan System

### Overview
The meal system uses **AI-powered recommendations** with **strict macro validation** to ensure daily nutrition targets are met exactly.

### How It Works: Step-by-Step

#### **Step 1: Daily Macro Targets**
Set during onboarding or in profile:

```javascript
const userDailyTargets = {
  calories: 2000,
  protein: 150,   // grams
  carbs: 200,     // grams
  fat: 65         // grams
};
```

#### **Step 2: Meal Distribution**
The **MealDistributionEngine** splits daily targets into 3 meals:

```javascript
// Default "Balanced" distribution:
{
  breakfast: {
    calories: 600,   // 30% of daily
    protein: 52.5,   // 35% of daily
    carbs: 60,       // 30% of daily
    fat: 19.5        // 30% of daily
  },
  lunch: {
    calories: 800,   // 40% of daily
    protein: 52.5,   // 35% of daily
    carbs: 80,       // 40% of daily
    fat: 26          // 40% of daily
  },
  dinner: {
    calories: 600,   // 30% of daily
    protein: 45,     // 30% of daily
    carbs: 60,       // 30% of daily
    fat: 19.5        // 30% of daily
  }
}
```

**Alternative Distribution Modes:**
- **Aggressive**: Front-loads carbs (35% breakfast, 40% lunch, 25% dinner)
- **Conservative**: Even split (33.3% each meal)

#### **Step 3: AI Meal Recommendation**
When user taps "Log Meal" on Today screen:

```javascript
// POST /api/meal-recommendations/recommend

{
  "user_id": 1,
  "meal_type": "breakfast",
  "date": "2026-01-14",
  "preferences": {
    "dietary_restrictions": ["vegetarian"],
    "cuisine": "mediterranean",
    "prep_time_max": 30
  }
}
```

**Backend Process:**
```javascript
// 1. Get remaining macros for breakfast
const remainingMacros = {
  calories: 600,
  protein: 52.5,
  carbs: 60,
  fat: 19.5
};

// 2. Generate AI prompt
const aiPrompt = `
Generate a breakfast meal suggestion that matches:
- Calories: 600 kcal
- Protein: 52.5g
- Carbs: 60g
- Fat: 19.5g
- Dietary: Vegetarian
- Cuisine: Mediterranean
- Max prep time: 30 minutes

Provide 1 PRIMARY + 2 ALTERNATIVES (same-macro swaps only)
`;

// 3. AI generates suggestions
const aiResponse = {
  primary: {
    name: "Greek Yogurt Parfait with Honey & Almonds",
    calories: 598,
    protein: 53,
    carbs: 61,
    fat: 19,
    ingredients: [
      "Greek yogurt 250g",
      "Honey 20g",
      "Almonds 15g",
      "Blueberries 100g",
      "Granola 30g"
    ],
    instructions: "Layer yogurt with fruits and top with almonds..."
  },
  alternatives: [
    {
      name: "Mediterranean Omelette with Feta",
      calories: 602,
      protein: 52,
      carbs: 60,
      fat: 20,
      // ...
    },
    {
      name: "Protein Pancakes with Berries",
      calories: 595,
      protein: 54,
      carbs: 59,
      fat: 19,
      // ...
    }
  ]
};

// 4. Validate with AISafetyValidator
const validated = AISafetyValidator.validateMealSuggestion(aiResponse, remainingMacros);

// 5. Return to app
return validated;
```

#### **Step 4: Meal Logging**
User selects a meal and logs it:

```javascript
// POST /api/meals/log

{
  "user_id": 1,
  "date": "2026-01-14",
  "meal_type": "breakfast",
  "meal_data": {
    "name": "Greek Yogurt Parfait with Honey & Almonds",
    "calories": 598,
    "protein": 53,
    "carbs": 61,
    "fat": 19,
    "ingredients": [...],
    "photo_url": "optional_photo.jpg"
  }
}
```

**Database Update:**
```sql
-- Update daily_nutrition_logs
INSERT INTO daily_nutrition_logs (user_id, date, meal_type, ...)
VALUES (1, '2026-01-14', 'breakfast', ...);

-- Update daily_macro_state
UPDATE daily_macro_state
SET 
  breakfast_calories = 598,
  breakfast_protein = 53,
  breakfast_carbs = 61,
  breakfast_fat = 19,
  total_calories = total_calories + 598,
  total_protein = total_protein + 53,
  -- ...
WHERE user_id = 1 AND date = '2026-01-14';
```

#### **Step 5: Macro Tracking & Remaining Calculation**
After breakfast is logged:

```javascript
// GET /api/meal-recommendations/remaining?user_id=1&date=2026-01-14

{
  "daily_targets": {
    "calories": 2000,
    "protein": 150,
    "carbs": 200,
    "fat": 65
  },
  "consumed": {
    "calories": 598,    // Breakfast only
    "protein": 53,
    "carbs": 61,
    "fat": 19
  },
  "remaining": {
    "calories": 1402,
    "protein": 97,
    "carbs": 139,
    "fat": 46
  },
  "meals_logged": ["breakfast"],
  "meals_pending": ["lunch", "dinner"]
}
```

#### **Step 6: Meal Swapping (Advanced)**
User can swap macros between meals:

```javascript
// POST /api/meal-recommendations/swap

{
  "user_id": 1,
  "date": "2026-01-14",
  "from_meal": "lunch",
  "to_meal": "dinner",
  "macro_type": "carbs",
  "amount_g": 20
}

// Result:
// Lunch carbs: 80g → 60g
// Dinner carbs: 60g → 80g
// (Same macro type only: Carb↔Carb, Protein↔Protein, Fat↔Fat)
```

### Meal Safety Validation

Every AI-generated meal passes through **AISafetyValidator**:

```javascript
// Checks:
✓ Calories within ±10% of target
✓ Protein within ±5g
✓ Carbs within ±5g
✓ Fat within ±3g
✓ Ingredients are real foods (no hallucinations)
✓ Instructions are safe and practical
✓ Allergens flagged if user has restrictions
```

---

## 💬 AI Coach Chat

### Overview
Conversational AI assistant for fitness guidance, motivation, and Q&A.

### How It Works

#### **Step 1: User Sends Message**
```typescript
// CoachScreen.tsx
const userMessage = "What exercises target the chest?";

// POST to backend (via AIService)
const response = await AIService.chatWithHistory([
  { role: 'user', content: userMessage }
]);
```

#### **Step 2: Backend Processing**
```javascript
// AI Service (OpenAI/Anthropic/etc.)
const systemPrompt = `
You are FitCoach AI, a professional fitness coach.

User Profile:
- Goal: Muscle gain
- Experience: Intermediate
- Current program: Upper/Lower Split
- Recent workout: Upper A (Bench Press 80kg × 4×8)

Guidelines:
- Give evidence-based advice
- Reference their current program when relevant
- Be motivating but realistic
- Suggest exercises from their template if applicable
`;

const aiResponse = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]
});

return aiResponse.choices[0].message.content;
```

#### **Step 3: Context-Aware Responses**
The AI coach has access to:
- ✅ User's current workout program
- ✅ Recent workout history
- ✅ Daily nutrition status
- ✅ Personal records
- ✅ Goals and preferences

Example response:
```
"Great question! For chest development, your current Upper/Lower 
program already includes excellent exercises:

Upper A:
- Bench Press (4×8 @ 80kg) - Your main chest builder
- Incline Dumbbell Press - Upper chest focus

Upper B:
- Incline Bench Press - Another upper chest angle

Since you're hitting 4×8 consistently at 80kg, consider progressing 
to 82.5kg next session. Also ensure you're getting 52.5g protein at 
breakfast to support recovery!"
```

### Chat Features

| Feature | Description |
|---------|-------------|
| **Memory** | Remembers conversation context within session |
| **Personalization** | References user's specific data (workouts, meals, PRs) |
| **Workout Advice** | Exercise form, program design, progression |
| **Nutrition Help** | Macro tips, meal timing, supplementation |
| **Motivation** | Encouragement, accountability, goal setting |
| **Safety** | Flags dangerous requests, suggests medical consultation |

---

## 📊 Today Screen Integration

### Overview
The **Today Screen** is your daily dashboard showing all meals and exercises for the current day.

### UI Layout

```
┌─────────────────────────────────────┐
│          📅 Today's Goals            │
│      Tuesday, January 14, 2026       │
├─────────────────────────────────────┤
│                                      │
│  🔥 Nutrition Goals                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  Calories:  598 / 2000  [====    ]  │
│  Protein:   53g / 150g  [==      ]  │
│  Carbs:     61g / 200g  [==      ]  │
│  Fat:       19g / 65g   [=       ]  │
│                                      │
├─────────────────────────────────────┤
│                                      │
│  🍽️ Today's Meals                    │
│                                      │
│  ☕ Breakfast                        │
│  ✓ Greek Yogurt Parfait              │
│     598 cal • 53p • 61c • 19f        │
│                                      │
│  🍎 Lunch                            │
│  → No lunch logged yet               │
│                                      │
│  🍕 Dinner                           │
│  → No dinner logged yet              │
│                                      │
├─────────────────────────────────────┤
│                                      │
│  💪 Today's Workout                  │
│                                      │
│  → No exercises logged yet           │
│  (Scheduled: Upper A - 5 exercises)  │
│                                      │
├─────────────────────────────────────┤
│                                      │
│  [+ Log Meal]    [+ Log Exercise]    │
│                                      │
└─────────────────────────────────────┘
```

### Data Flow

```javascript
// TodayScreen.tsx - fetchTodayData()

// 1. Fetch daily nutrition status
const nutritionStatus = await API.get('/api/analytics/daily', {
  user_id: 1,
  date: '2026-01-14'
});

// 2. Fetch logged meals
const meals = await API.get('/api/meals/daily', {
  user_id: 1,
  date: '2026-01-14'
});

// 3. Fetch today's workout schedule
const workoutSchedule = await API.get('/api/workout/daily', {
  user_id: 1
});

// 4. Fetch logged exercises
const loggedExercises = await API.get('/api/workout/sessions', {
  user_id: 1,
  date: '2026-01-14'
});

// 5. Combine and display
setState({
  nutritionGoals: {
    calories: { current: 598, target: 2000 },
    protein: { current: 53, target: 150 },
    carbs: { current: 61, target: 200 },
    fat: { current: 19, target: 65 }
  },
  meals: {
    breakfast: meals.find(m => m.meal_type === 'breakfast'),
    lunch: meals.find(m => m.meal_type === 'lunch'),
    dinner: meals.find(m => m.meal_type === 'dinner')
  },
  workout: {
    scheduled: workoutSchedule,
    completed: loggedExercises
  }
});
```

### Quick Actions

| Button | Action | Navigation |
|--------|--------|------------|
| **Log Meal** | Opens meal recommendation flow | → Food Screen → Select meal type |
| **Log Exercise** | Opens exercise logging | → Exercise Log Screen |

---

## 🔄 Data Flow & API Integration

### Complete User Journey

```mermaid
User Opens App
    ↓
Dashboard (Home Screen)
    ├─→ Today Tab
    │   ├─→ View nutrition progress
    │   ├─→ View meals (breakfast/lunch/dinner)
    │   ├─→ View workout status
    │   └─→ Quick actions (Log Meal / Log Exercise)
    │
    ├─→ Coach Tab
    │   ├─→ Chat with AI
    │   └─→ Get workout/nutrition advice
    │
    ├─→ Food Tab
    │   ├─→ Get AI meal recommendations
    │   ├─→ Select meal (primary or alternatives)
    │   └─→ Log meal
    │
    └─→ Profile Tab
        ├─→ View stats & PRs
        ├─→ View History (new button)
        └─→ Adjust settings
```

### API Endpoints Reference

#### **Workout Endpoints**
```
GET    /api/workout/templates           # List all templates
GET    /api/workout/templates/:id       # Get template details
POST   /api/workout/recommend            # Generate program
GET    /api/workout/daily                # Get today's workout
POST   /api/workout/log-session          # Log workout
GET    /api/workout/history              # Workout history
GET    /api/workout/analytics            # Progress analytics
```

#### **Meal Endpoints**
```
POST   /api/meal-recommendations/recommend    # Get AI meal suggestions
GET    /api/meal-recommendations/remaining    # Get remaining macros
POST   /api/meal-recommendations/swap         # Swap macros between meals
POST   /api/meals/log                         # Log meal
GET    /api/meals/daily                       # Get today's meals
GET    /api/meals/history                     # Meal history
```

#### **Analytics Endpoints**
```
GET    /api/analytics/daily              # Today's totals
GET    /api/analytics/weekly             # 7-day summary
GET    /api/analytics/monthly            # 30-day trends
GET    /api/analytics/yearly             # Annual progress
GET    /api/analytics/comparison         # Period comparison
```

#### **AI Coach Endpoints**
```
POST   /api/ai/chat                      # Chat with AI coach
GET    /api/ai/suggestions               # Personalized tips
```

---

## 🎯 Summary: How Everything Works Together

### Morning Flow
```
1. User opens app → Today Screen
2. Sees empty breakfast slot
3. Taps "Log Meal"
4. Selects "Breakfast"
5. AI generates 1 primary + 2 alternatives (all ~600 cal, 52g protein)
6. User picks Greek Yogurt Parfait
7. Logs meal → Progress bars update
8. Lunch/dinner slots now adjusted to remaining macros
```

### Workout Flow
```
1. User goes to Coach Tab → "Today's Workout"
2. Sees "Upper A" with 5 exercises
3. Goes to gym, performs:
   - Bench Press: 80kg × 4 sets × 8 reps
   - Barbell Row: 70kg × 4 sets × 10 reps
   - ... (3 more exercises)
4. Logs session after workout
5. System calculates:
   - Total calories burned: 320 kcal
   - Volume: 4,200kg total lifted
   - Next session: Suggests 82.5kg for bench press
6. Updates Today Screen with completed workout
```

### Evening Flow
```
1. User checks Today Screen before bed
2. Sees all meals logged ✓
3. Sees workout completed ✓
4. Daily goals met: 2000/2000 cal, 150/150 protein
5. System records:
   - Nutrition compliance: 100%
   - Workout adherence: ✓
   - Streak: 7 days
```

---

## 🚀 Next Steps

### For Developers
1. ✅ Backend is production-ready
2. ✅ All API endpoints functional
3. 🟡 Frontend integration in progress
4. ⏳ Connect Today Screen to real APIs
5. ⏳ Connect Food Screen to meal recommendation API
6. ⏳ Add workout logging UI

### For Testing
1. Test workout recommendation flow
2. Test meal recommendation with different preferences
3. Test macro swapping
4. Test Today Screen real-time updates
5. Test AI coach contextual responses

---

## 📞 Support

For technical questions or issues:
- Check `INTEGRATION_GUIDE.md` for setup instructions
- Check `API_DOCUMENTATION.md` for endpoint details
- Check `NEW_FEATURES_COMPLETE.md` for feature specifications

---

**Built with ❤️ by FitCoach AI Team**  
*Empowering your fitness journey with intelligent technology*
