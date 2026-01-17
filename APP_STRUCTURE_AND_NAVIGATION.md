# FitCoach AI - Complete App Structure & Navigation Guide

**Generated:** January 16, 2026  
**Purpose:** Comprehensive documentation of all screens, buttons, and navigation flows

---

## 📱 APP STRUCTURE OVERVIEW

### Navigation Architecture
- **Bottom Tab Navigator** (Main App)
  - 5 Primary Tabs: Dashboard, AI Coach, Today, Food, Profile
- **Stack Navigator** (Nested Screens)
  - Additional screens accessible via navigation
- **Auth Flow** (Pre-login)
  - Welcome → Auth → Email Verification → Profile Setup

---

## 🏠 MAIN TAB SCREENS (Bottom Navigation)

### 1. DASHBOARD SCREEN
**Tab Label:** Home  
**Icon:** view-dashboard  
**Route:** `Dashboard`

#### Buttons & Actions:
1. **"View Analytics"** (Card Button)
   - Navigates to: `AnalyticsScreen`
   - Shows detailed nutrition trends and charts

2. **"View History"** (Card Button)
   - Navigates to: `HistoryScreen`
   - Shows past food/exercise logs

3. **Quick Action Cards** (Multiple)
   - Various metric cards showing daily progress
   - Some cards are tappable for detailed views

#### Displayed Information:
- Daily calorie progress
- Macro breakdown (Protein, Carbs, Fat)
- Weight tracking summary
- Workout completion status
- Water intake progress

---

### 2. COACH SCREEN (AI Coach)
**Tab Label:** AI Coach  
**Icon:** robot-excited  
**Route:** `Coach`

#### Buttons & Actions:
1. **"Send Message"** (Input Button)
   - Sends user query to AI coach
   - Requires active subscription for unlimited use

2. **"Upgrade to Pro"** (Conditional Button)
   - Shown when AI usage limit reached
   - Navigates to: `PricingScreen`

3. **Suggested Prompts** (Quick Action Buttons)
   - Pre-filled conversation starters
   - Examples: "What should I eat?", "Workout advice", etc.

#### Features:
- Real-time AI chat interface
- Conversation history
- Context-aware fitness coaching
- Usage limit tracking (free tier)

---

### 3. TODAY SCREEN
**Tab Label:** Today  
**Icon:** calendar-today  
**Route:** `Today`

#### Buttons & Actions:
1. **"Generate Today's Meal Plan"** (Primary Button)
   - Calls: `mealAPI.generateDailyPlan()`
   - Generates AI recommendations for all meals
   - Only shown if no recommendations exist

2. **"Swap"** (Per Meal - in MealRecommendationCard)
   - Swaps current meal recommendation
   - Shows swap count: "Swap (1/3)", "Swap (2/3)", "Swap (3/3)", or "Swap (AI)"
   - After 3 swaps, uses AI auto-decision
   - Calls: `mealAPI.swapMeal(mealType, date)`

3. **"View & Log"** (Per Meal - in MealRecommendationCard)
   - Navigates to: `MealDetailScreen`
   - Shows full recipe details and logging interface

4. **"Log Meal"** (Quick Action - Bottom)
   - Navigates to: `Food` tab → `AddFood` screen
   - Pre-selects meal type

5. **"Log Exercise"** (Quick Action - Bottom)
   - Navigates to: `ExerciseLog` screen

6. **"Generate Workout Plan"** (Conditional)
   - Shown when no workout scheduled
   - Calls: `workoutAPI.recommendProgram()`
   - Navigates to: `WorkoutPlanner` with generated plan

7. **Workout Card** (Tappable)
   - Navigates to: `WorkoutPlanner` with today's workout
   - Shows exercise preview

8. **Refresh** (Pull-to-Refresh)
   - Reloads all today's data

#### Displayed Information:
- Daily nutrition progress (Calories, Protein, Carbs, Fat)
- Meal recommendations (Breakfast, Lunch, Dinner)
- Logged food items per meal
- Today's workout schedule
- Progress bars for each macro

---

### 4. FOOD SCREEN (Food Log)
**Tab Label:** Food  
**Icon:** food-apple  
**Route:** `Food`

#### Buttons & Actions:
1. **"Add Food"** (Primary FAB/Button)
   - Navigates to: `AddFood` screen (nested)
   - Opens food search and logging interface

2. **"Search Food"** (Search Bar)
   - Calls: `foodAPI.searchFood(query)`
   - Shows food database results

3. **"Log Custom Food"** (Button)
   - Manual entry form for custom foods
   - Inputs: Name, Calories, Protein, Carbs, Fat, Serving

4. **"Delete"** (Per Food Item)
   - Calls: `foodAPI.deleteLog(id)`
   - Removes logged food entry

5. **"Edit"** (Per Food Item)
   - Calls: `foodAPI.updateLog(id, data)`
   - Modifies existing food log

6. **Meal Type Tabs** (Segmented Control)
   - Breakfast, Lunch, Dinner, Snack
   - Filters displayed logs

#### Displayed Information:
- Daily food logs grouped by meal type
- Total calories and macros per meal
- Daily totals and remaining calories
- Progress toward daily targets

---

### 5. PROFILE SCREEN
**Tab Label:** Profile  
**Icon:** account  
**Route:** `Profile`

#### Buttons & Actions:
1. **"Edit Profile"** (Button)
   - Opens profile editing form
   - Updates: Name, Weight, Height, Age, etc.

2. **"Subscription"** (Card Button)
   - Navigates to: `PricingScreen`
   - Shows current plan and upgrade options

3. **"Settings"** (List Items)
   - Various toggles and preferences
   - Notification settings
   - Theme preferences (if applicable)

4. **"Export Data"** (Button)
   - Calls: `userAPI.exportData()`
   - Downloads user data as JSON

5. **"Delete Account"** (Danger Button)
   - Calls: `userAPI.deleteData(confirmation)`
   - Requires confirmation

6. **"Logout"** (Button)
   - Calls: `authAPI.logout()`
   - Clears tokens and returns to auth flow

#### Displayed Information:
- User profile details
- Current subscription status
- Account statistics
- App version

---

## 📄 NESTED/STACK SCREENS

### 6. MEAL DETAIL SCREEN
**Route:** `MealDetail`  
**Accessed From:** Today Screen → "View & Log" button

#### Buttons & Actions:
1. **"Back"** (Header Button)
   - Returns to: Previous screen (Today)

2. **"Swap"** (Footer Button)
   - Swaps meal recommendation
   - Calls: `mealAPI.swapMeal(mealType, date)`
   - Updates current meal in-place

3. **"Log Meal"** (Primary Footer Button)
   - **DIRECTLY LOGS** all meal items
   - Calls: `foodAPI.createLog()` for each item
   - Shows success alert
   - Returns to: Today Screen

4. **Collapse/Expand** (Chevron Icon)
   - Toggles recommendation details visibility
   - Auto-collapses when meal is logged

#### Displayed Information:
- Meal name and food items
- Detailed macros (Calories, Protein, Carbs, Fat)
- Ingredients list with quantities
- Recipe instructions (step-by-step)
- Prep time, cook time, difficulty
- AI reasoning for recommendation
- Swap count indicator

---

### 7. ANALYTICS SCREEN
**Route:** `Analytics`  
**Accessed From:** Dashboard → "View Analytics" card

#### Buttons & Actions:
1. **"Back"** (Header Button)
   - Returns to: Dashboard

2. **Period Selector** (Segmented Control)
   - Options: 1W, 1M, 3M, 6M, 1Y
   - Calls: `analyticsAPI.getChartData(period)`
   - Updates charts dynamically

3. **"Sync Analytics"** (Refresh Button)
   - Calls: `analyticsAPI.syncAnalytics()`
   - Recalculates all snapshots

#### Displayed Information:
- Line charts for calories, weight, macros
- Trend analysis
- Average values
- Goal progress over time

---

### 8. MEAL DISTRIBUTION SCREEN
**Route:** `MealDistribution`  
**Accessed From:** Dashboard or Profile

#### Buttons & Actions:
1. **"Save Distribution"** (Primary Button)
   - Calls: `mealAPI.recalculateDistribution()`
   - Updates meal targets

2. **Meal Style Selector** (Radio Buttons)
   - Options: 3 meals, 4 meals, 5 meals, etc.
   - Adjusts calorie distribution

3. **Goal Style Selector** (Radio Buttons)
   - Options: Balanced, High Protein, Low Carb, etc.

#### Displayed Information:
- Current meal distribution
- Calories per meal
- Macro split per meal

---

### 9. MEAL PLANNER SCREEN
**Route:** `MealPlanner`  
**Accessed From:** Dashboard or navigation

#### Buttons & Actions:
1. **"Generate Weekly Plan"** (Button)
   - Generates meal plan for 7 days
   - Uses AI recommendations

2. **"Swap Meal"** (Per Meal)
   - Similar to Today Screen swap

3. **"View Recipe"** (Per Meal)
   - Navigates to: `MealDetail`

#### Displayed Information:
- Weekly meal calendar
- Meal recommendations per day
- Shopping list (if applicable)

---

### 10. WORKOUT PLANNER SCREEN
**Route:** `WorkoutPlanner`  
**Accessed From:** Today Screen → Workout card

#### Buttons & Actions:
1. **"Start Workout"** (Primary Button)
   - Begins workout session
   - Tracks exercise completion

2. **"Mark as Complete"** (Per Exercise)
   - Toggles exercise completion
   - Updates workout progress

3. **"Log Session"** (Footer Button)
   - Calls: `workoutAPI.logSession(data)`
   - Saves workout completion

4. **"Generate New Program"** (Button)
   - Calls: `workoutAPI.recommendProgram()`
   - Creates personalized workout plan

#### Displayed Information:
- Exercise list with sets/reps/weight
- Rest timers
- Progress tracking
- Exercise instructions

---

### 11. EXERCISE LOG SCREEN
**Route:** `ExerciseLog`  
**Accessed From:** Today Screen → "Log Exercise" button

#### Buttons & Actions:
1. **"Add Exercise"** (Primary Button)
   - Opens exercise search/entry form

2. **"Search Exercise"** (Search Bar)
   - Calls: `exerciseAPI.searchExercise(query)`

3. **"Log Custom Exercise"** (Button)
   - Manual entry for custom exercises

4. **"Delete"** (Per Exercise)
   - Calls: `exerciseAPI.deleteLog(id)`

5. **"Save"** (Form Button)
   - Calls: `exerciseAPI.createLog(data)`

#### Displayed Information:
- Exercise logs for selected date
- Total calories burned
- Total duration
- Exercise history

---

### 12. WATER LOG SCREEN
**Route:** `WaterLog`  
**Accessed From:** Dashboard or navigation

#### Buttons & Actions:
1. **Quick Add Buttons** (250ml, 500ml, 750ml, 1L)
   - Calls: `waterAPI.createLog(amountMl)`
   - Instantly logs water intake

2. **"Custom Amount"** (Input + Button)
   - Manual water entry
   - Calls: `waterAPI.createLog(amountMl)`

3. **"Delete"** (Per Log Entry)
   - Calls: `waterAPI.deleteLog(id)`

#### Displayed Information:
- Daily water intake progress
- Goal vs. consumed
- Log history with timestamps
- Progress bar

---

### 13. WEIGHT SCREEN
**Route:** `Weight`  
**Accessed From:** Dashboard or Profile

#### Buttons & Actions:
1. **"Log Weight"** (Primary Button)
   - Opens weight entry form
   - Calls: `fitnessAPI.logWeight(data)`

2. **"Set Goal Weight"** (Button)
   - Calls: `fitnessAPI.setGoal(goalData)`

3. **"Delete Entry"** (Per Weight Log)
   - Removes weight entry

#### Displayed Information:
- Weight trend chart
- Current weight vs. goal
- Weight change over time
- Body fat percentage (if logged)

---

### 14. HISTORY SCREEN
**Route:** `History`  
**Accessed From:** Dashboard → "View History" card

#### Buttons & Actions:
1. **"Back"** (Header Button)
   - Returns to: Dashboard

2. **Date Picker** (Calendar Icon)
   - Selects specific date to view
   - Loads historical data

3. **"View Details"** (Per Day)
   - Expands daily summary
   - Shows all logs for that day

#### Displayed Information:
- Historical food logs
- Historical exercise logs
- Daily summaries
- Streak tracking

---

### 15. PRICING SCREEN
**Route:** `Pricing`  
**Accessed From:** Coach Screen, Profile Screen

#### Buttons & Actions:
1. **"Subscribe"** (Per Plan)
   - Options: Weekly, Monthly, Yearly
   - Calls: `billingAPI.subscribe(planData)`
   - Initiates payment flow

2. **"Restore Purchases"** (Button)
   - Restores previous subscriptions
   - iOS/Android specific

3. **"Cancel Subscription"** (Button)
   - Calls: `billingAPI.cancel()`

#### Displayed Information:
- Plan comparison table
- Feature list per tier
- Current subscription status
- Pricing details

---

### 16. PROFILE SETUP SCREEN
**Route:** `ProfileSetup`  
**Accessed From:** First-time user flow after registration

#### Buttons & Actions:
1. **"Next"** (Multi-step Form)
   - Progresses through setup steps
   - Validates input

2. **"Complete Setup"** (Final Button)
   - Calls: `userAPI.setupProfile(data)`
   - Navigates to: Main app

3. **"Skip"** (Optional - if allowed)
   - Bypasses setup

#### Form Fields:
- Age, Gender, Height, Weight
- Activity Level
- Goal (Fat Loss, Muscle Gain, Maintenance)
- Goal Aggressiveness
- Workout Level
- Meal Style
- Dietary Restrictions
- Allergies
- Preferred Cuisines

---

## 🔐 AUTH FLOW SCREENS

### 17. WELCOME SCREEN
**Route:** `Welcome`  
**First Screen (Unauthenticated)**

#### Buttons & Actions:
1. **"Get Started"** (Primary Button)
   - Navigates to: `Auth` screen

2. **"Sign In"** (Secondary Button)
   - Navigates to: `Auth` screen (login mode)

#### Displayed Information:
- App logo and branding
- Feature highlights
- Value proposition

---

### 18. AUTH SCREEN
**Route:** `Auth`  
**Accessed From:** Welcome Screen

#### Buttons & Actions:
1. **"Sign Up"** (Tab/Mode Toggle)
   - Switches to registration form

2. **"Sign In"** (Tab/Mode Toggle)
   - Switches to login form

3. **"Continue with Email"** (Primary Button)
   - Calls: `authAPI.register(data)` or `authAPI.login(data)`
   - Navigates to: Email Verification or Main App

4. **"Continue with Google"** (OAuth Button)
   - Calls: `authAPI.firebaseLogin(idToken)`
   - Google Sign-In flow

5. **"Continue with Apple"** (OAuth Button)
   - Apple Sign-In flow

6. **"Forgot Password?"** (Link)
   - Password reset flow

#### Form Fields:
- Email
- Password
- Name (Sign Up only)

---

### 19. VERIFY EMAIL SCREEN
**Route:** `VerifyEmail`  
**Accessed From:** Auth Screen (after registration)

#### Buttons & Actions:
1. **"Resend Verification Email"** (Button)
   - Sends new verification email

2. **"I've Verified"** (Button)
   - Checks verification status
   - Navigates to: Profile Setup or Main App

3. **"Logout"** (Button)
   - Returns to: Auth Screen

#### Displayed Information:
- Verification instructions
- User email address
- Status messages

---

## 🔄 NAVIGATION FLOWS

### Primary User Journeys:

#### 1. **First-Time User Flow**
```
Welcome → Auth (Sign Up) → Verify Email → Profile Setup → Dashboard
```

#### 2. **Returning User Flow**
```
Auth (Sign In) → Dashboard
```

#### 3. **Daily Meal Logging Flow**
```
Today → View & Log (Meal Detail) → Log Meal → Today (Updated)
```

#### 4. **Meal Generation Flow**
```
Today → Generate Today's Meal Plan → Today (With Recommendations)
```

#### 5. **Meal Swap Flow**
```
Today → Swap (1/3) → Swap (2/3) → Swap (3/3) → Swap (AI)
```

#### 6. **Food Logging Flow (Manual)**
```
Food Tab → Add Food → Search/Select → Log → Food Tab (Updated)
```

#### 7. **Workout Flow**
```
Today → Workout Card → Workout Planner → Start Workout → Mark Complete → Log Session
```

#### 8. **Analytics Review Flow**
```
Dashboard → View Analytics → Analytics Screen (Charts & Trends)
```

---

## 📊 DATA FLOW SUMMARY

### Backend API Endpoints Used:

#### Meal APIs:
- `POST /api/meals/generate-daily-plan` - Generate daily meal recommendations
- `POST /api/meals/swap-meal` - Swap a specific meal
- `GET /api/meals/daily-with-recommendations` - Get today's meals with recs + logs
- `GET /api/meals/daily` - Get meal distribution targets
- `POST /api/meals/recalculate` - Recalculate meal distribution

#### Food APIs:
- `GET /api/food/logs` - Get food logs
- `POST /api/food/logs` - Create food log
- `PUT /api/food/logs/:id` - Update food log
- `DELETE /api/food/logs/:id` - Delete food log
- `GET /api/food/search` - Search food database
- `GET /api/food/totals` - Get daily food totals

#### Exercise APIs:
- `GET /api/exercise/logs` - Get exercise logs
- `POST /api/exercise/logs` - Create exercise log
- `DELETE /api/exercise/logs/:id` - Delete exercise log
- `GET /api/exercise/search` - Search exercise database

#### Workout APIs:
- `GET /api/workout/daily` - Get today's workout
- `POST /api/workout/recommend` - Generate workout program
- `POST /api/workout/log-session` - Log workout completion

#### Analytics APIs:
- `GET /api/analytics/daily` - Get daily summary
- `GET /api/analytics/chart-data` - Get chart data for period
- `POST /api/analytics/sync` - Sync analytics snapshots

#### Auth APIs:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/firebase-login` - OAuth login

#### User APIs:
- `GET /api/user/profile` - Get user profile
- `POST /api/user/profile-setup` - One-time profile setup
- `PATCH /api/user/profile` - Update profile

#### Fitness APIs:
- `GET /api/fitness/targets` - Get calculated targets
- `POST /api/fitness/weight` - Log weight
- `GET /api/fitness/weight` - Get weight history

#### Billing APIs:
- `GET /api/billing/status` - Get subscription status
- `POST /api/billing/subscribe` - Create subscription
- `POST /api/billing/cancel` - Cancel subscription

---

## 🎨 UI COMPONENTS

### Reusable Components:
1. **MealRecommendationCard** - Shows meal recommendation with swap/log buttons
2. **NotificationManager** - Handles push notifications
3. **AppUpdater** - Checks for app updates
4. **ProgressBar** - Visual progress indicators
5. **MacroDisplay** - Shows protein/carbs/fat breakdown

---

## 🔔 KEY FEATURES

### Implemented Features:
✅ AI-powered meal recommendations  
✅ Meal swap system (3 manual + AI auto)  
✅ Direct meal logging from detail screen  
✅ Workout generation and tracking  
✅ Food and exercise logging  
✅ Water intake tracking  
✅ Weight tracking with trends  
✅ Analytics and charts  
✅ Subscription management  
✅ OAuth authentication (Google, Apple)  
✅ Email verification  
✅ Profile setup wizard  
✅ Meal distribution customization  

---

**End of Documentation**  
**Total Screens:** 19  
**Total Primary Buttons:** 50+  
**Total Navigation Routes:** 25+
