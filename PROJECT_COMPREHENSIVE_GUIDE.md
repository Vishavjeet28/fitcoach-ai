# FitCoach AI - Comprehensive Project Documentation

## 1. Project Overview
**FitCoach AI** is an advanced fitness and nutrition application that leverages Artificial Intelligence to provide personalized meal plans, workout routines, and real-time coaching.

### 🛠 Technology Stack
*   **Frontend**: React Native (Expo) - Mobile Application.
*   **Backend**: Node.js, Express.js.
*   **Database**: PostgreSQL (Structured Data: Users, Logs, Plans, Foods).
*   **AI Engine**: Google Gemini (Content Generation, Chat, Recommendations).
*   **Authentication**: Firebase Auth (Identity Management).

---

## 2. Architecture & Logic

### 🧠 Backend Services (`/backend/src/services`)
The core intelligence resides in specialized "Logic Engines":
*   **FitnessLogicEngine (FLE)**: The "Calculator". Handles BMR, TDEE, Calorie Targets, Macro Splits, and Weight projections. It is the single source of truth for numbers.
*   **MealRecommendationEngine**: The "Chef". Generates daily meal plans.
    *   **Strategy 1**: Fetches Verified Recipes from Database (High Quality).
    *   **Strategy 2**: Uses AI to generate ad-hoc meals if no DB match found.
    *   **Swap System**: Allows users to replace meals while maintaining macro targets.
*   **WorkoutLogicEngine**: The "Trainer". Generates workout programs.
    *   Selects templates (Push/Pull/Legs, Full Body) based on user level/goal.
    *   Tunes volume (Sets/Reps) based on experience.
    *   Populates exercises with rich details (Video URLs, Instructions).
*   **AnalyticsLogicEngine**: The "Analyst". Aggregates daily logs into weekly/monthly snapshots for charting.
*   **AIService**: Wrapper around Google Gemini API for prompt management.

### 📱 Frontend Structure (`/fitcoach-expo`)
*   **Navigation** (`AppNavigator.tsx`):
    *   **Auth Flow**: Login -> Verify Email -> Profile Setup -> Dashboard.
    *   **Main Flow**: Tab Navigator (Dashboard, Coach, Food, Today, Profile).
    *   **Screens**: Each feature has dedicated screens (e.g., `MealPlannerScreen`, `WorkoutPlannerScreen`, `AnalyticsScreen`).
*   **State Management**: React Context (`AuthContext`).
*   **API Layer**: `api.ts` handles all HTTP communication with the backend.

---

## 3. Database Schema

### Users & Profile
*   `users`: Core profile (height, weight, goal, activity_level).
*   `goals`: Historical goal tracking.
*   `daily_summaries`: Aggregated daily stats (calories in, burnt).

### Nutrition
*   `foods`: **Rich Recipe Database**. Contains:
    *   `instructions` (Step-by-step), `ingredients` (JSON), `image_url`
    *   `calories`, `protein`, `carbs`, `fat`, `prep_time_minutes`
*   `food_logs`: User's consumption history.
*   `recommended_meals`: The AI/DB generated plan for a specific date.
*   `meal_distribution_profiles`: Target macro splits (e.g., 30% Protein at Breakfast).

### Fitness
*   `exercises`: Library of movements (Bench Press, Squat, etc.) with MET values and target muscles.
*   `workout_plans`: Assigned routines (e.g., "Beginner Full Body").
*   `workout_sessions`: Active instances of a workout (logging sets/reps).

---

## 4. Key Features In-Depth

### 🥑 Meal Planning System
1.  **Generation**: When a user views "Today", the app checks `recommended_meals`.
2.  **Fallback**: If no plan exists, `MealRecommendationEngine` creates one.
3.  **Priority**: It searches the `foods` table for a recipe matching the user's Calorie/Macro targets (±15%).
4.  **AI Backup**: If no recipe fits, Gemini AI generates a custom meal JSON.

### 🏋️ Workout System
1.  **Planner**: User selects days/equipment.
2.  **Engine**: `WorkoutLogicEngine` picks a template (e.g., "Upper/Lower").
3.  **Rich View**: `WorkoutPlannerScreen` shows Warmup, Main Lifts, and Cooldown.
4.  **Player**: Users can tap exercises to see instructions and videos.

### 📈 Analytics
1.  **Tracking**: Daily snapshots of Weight, Calories, and Workouts.
2.  **Visuals**: `AnalyticsScreen` uses `react-native-chart-kit` to draw trends (1 Week, 1 Month).
3.  **Sync**: Data is recalculated from raw logs to ensure accuracy.

---

## 5. Setup & Commands

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL
*   Expo Go (on mobile) or Simulator

### 🚀 Running the Project
1.  **Database**:
    ```bash
    # Run Migrations (Create Tables)
    cd backend
    node run_migrations.js
    
    # Seed Data (Populate Recipes/Exercises)
    node import_recipes.js
    ```

2.  **Backend**:
    ```bash
    cd backend
    npm run dev  # Runs on Port 5001
    ```

3.  **Frontend**:
    ```bash
    cd fitcoach-expo
    npx expo start --dev-client
    ```

---

## 6. Directory Map

```text
/
├── backend/
│   ├── src/
│   │   ├── config/         # Database & Migrations
│   │   ├── controllers/    # API Request Handlers
│   │   ├── routes/         # API Endpoints
│   │   ├── services/       # BUSINESS LOGIC (The Engines)
│   │   └── utils/          # Helpers
│   ├── run_migrations.js
│   ├── import_recipes.js
│   └── package.json
│
├── fitcoach-expo/
│   ├── src/
│   │   ├── components/     # Reusable UI (Cards, headers)
│   │   ├── screens/        # Page Views
│   │   ├── navigation/     # Routing
│   │   └── services/       # API Definitions
│   ├── App.tsx             # Entry Point
│   └── package.json
```

---

**Generated by FitCoach AI Assistant**
