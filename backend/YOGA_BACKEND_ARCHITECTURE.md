# 🧘 FITCOACH AI - YOGA BACKEND ARCHITECTURE

## Complete Documentation v2.0

---

## 📋 TABLE OF CONTENTS

1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Logic Engine](#logic-engine)
4. [Example API Responses](#example-api-responses)
5. [Integration Guide](#integration-guide)
6. [Deployment Steps](#deployment-steps)

---

## 📊 DATABASE SCHEMA

### Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│  yoga_categories    │       │    yoga_exercises   │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │◄──────│ category_id (FK)    │
│ name                │       │ id (PK)             │
│ description         │       │ name                │
│ icon                │       │ sanskrit_name       │
│ image_url           │       │ difficulty          │
│ display_order       │       │ primary_purpose     │
│ is_active           │       │ duration_minutes    │
└─────────────────────┘       │ time_of_day         │
                              │ contraindication    │
                              │ thumbnail_url       │
                              │ video_url           │
                              │ is_active           │
                              └─────────────────────┘
                                       │
                                       │ 1:1
                                       ▼
                              ┌─────────────────────┐
                              │yoga_exercise_details│
                              ├─────────────────────┤
                              │ exercise_id (FK)    │
                              │ target_areas[]      │
                              │ benefits[]          │
                              │ instructions[]      │
                              │ common_mistakes[]   │
                              │ who_should_avoid[]  │
                              │ instructor_cues[]   │
                              └─────────────────────┘

┌─────────────────────┐       ┌─────────────────────┐
│      users          │       │ yoga_user_sessions  │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │◄──────│ user_id (FK)        │
└─────────────────────┘       │ exercise_id (FK)    │
         │                    │ session_date        │
         │                    │ duration_completed  │
         │                    │ completed           │
         │                    │ pain_feedback       │
         │                    │ mood_before/after   │
         ▼                    └─────────────────────┘
┌─────────────────────┐
│yoga_user_preferences│
├─────────────────────┤
│ user_id (PK, FK)    │
│ preferred_difficulty│
│ preferred_time      │
│ pain_areas[]        │
│ goals[]             │
│ reminder_enabled    │
└─────────────────────┘
```

### ENUM Types

```sql
-- Difficulty levels (safe naming)
difficulty_level: 'beginner' | 'beginner_safe' | 'all_levels'

-- Contraindication safety
contraindication_level: 'safe' | 'caution' | 'avoid'

-- Time of day preference
time_of_day: 'morning' | 'evening' | 'anytime'

-- Pain feedback after session
pain_feedback: 'none' | 'better' | 'same' | 'worse'
```

---

## 🌐 API ENDPOINTS

### Base URL
```
/api/yoga
```

### Public Endpoints (Guest Access)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List all active categories |
| GET | `/exercises` | List exercises with filters |
| GET | `/exercises/:id` | Get full exercise details |
| GET | `/recommendations` | Get daily recommendation |
| GET | `/post-workout` | Get recovery yoga suggestions |

### Protected Endpoints (Login Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/session/start` | Start a yoga session |
| POST | `/session/complete` | Complete/log session |
| GET | `/history` | Get session history |
| GET | `/preferences` | Get user preferences |
| PUT | `/preferences` | Update preferences |

### Query Parameters

#### GET /exercises
```
category=posture_correction    # Filter by category
difficulty=beginner           # Filter by difficulty
duration=short|medium|long    # Filter by duration
time_of_day=morning          # Filter by time
```

#### GET /post-workout
```
workout_type=upper|lower|full|cardio
```

---

## 🧠 LOGIC ENGINE

### File: `src/services/yogaLogicEngine.js`

### Core Functions

#### 1. `getSafeExercises(userProfile)`
Returns exercises that are safe for a specific user based on:
- User's reported pain areas
- Difficulty level preference
- Contraindication matching

```javascript
// Example usage
const safeExercises = await getSafeExercises({
    userId: 123,
    painAreas: ['lower_back', 'knee'],
    difficulty: 'beginner'
});
// Returns: ['childs_pose_wide', 'quad_activation', ...]
```

#### 2. `recommendDailyYoga(userId)`
Returns a personalized daily recommendation:
- Time-of-day awareness
- Rotation to avoid repetition
- Goal alignment
- Safety filtering

```javascript
const recommendation = await recommendDailyYoga(123);
// Returns full exercise object with recommendation_reason
```

#### 3. `validateExerciseForUser(exerciseId, userId)`
Validates if a specific exercise is appropriate:
- Returns warnings if concerning
- Suggests alternatives
- Does NOT block (user choice)

```javascript
const validation = await validateExerciseForUser('sphinx_pose', 123);
// Returns: { isValid: true, warnings: [...], alternatives: [...] }
```

### Safety Rules (Deterministic, NO AI)

```javascript
const RULES = {
    // Beginners only get beginner-safe exercises
    'beginner' → ['beginner', 'beginner_safe']
    
    // Pain present → exclude matching contraindications
    user.painAreas.includes('lower_back') → exclude where
        exercise.who_should_avoid.includes('lower_back')
    
    // Time-based suggestions
    morning → ['posture_correction', 'full_body_flow']
    evening → ['stress_relaxation', 'back_pain_relief']
    
    // Rotation: Don't repeat in 3 days
    recent_exercises.excludeFromRecommendation()
}
```

---

## 📦 EXAMPLE API RESPONSES

### GET /api/yoga/categories

```json
{
    "success": true,
    "data": [
        {
            "id": "posture_correction",
            "name": "Posture Correction",
            "description": "Correct forward head, rounded shoulders...",
            "icon": "human-queue",
            "image_url": "https://images.unsplash.com/...",
            "display_order": 1,
            "exercise_count": 5
        },
        {
            "id": "back_pain_relief",
            "name": "Back Pain Relief",
            "description": "Gentle relief for lower back...",
            "icon": "human-handsdown",
            "image_url": "https://images.unsplash.com/...",
            "display_order": 2,
            "exercise_count": 4
        }
    ]
}
```

### GET /api/yoga/exercises?category=posture_correction

```json
{
    "success": true,
    "data": [
        {
            "id": "seated_chest_opener",
            "name": "Seated Chest Opener",
            "sanskrit_name": "Sukhasana Variation",
            "category_id": "posture_correction",
            "category_name": "Posture Correction",
            "difficulty": "beginner_safe",
            "primary_purpose": "Counteract slouching and open the chest.",
            "duration_minutes": 3,
            "time_of_day": "anytime",
            "contraindication_level": "safe",
            "thumbnail_url": "https://...",
            "benefits": ["Reverses rounded shoulders", "..."],
            "target_areas": ["Pectorals", "Anterior Deltoids"],
            "is_safe_for_user": true,
            "safety_badge": "Safe for you"
        }
    ],
    "count": 5
}
```

### GET /api/yoga/exercises/:id

```json
{
    "success": true,
    "data": {
        "id": "cat_cow",
        "name": "Cat-Cow Flow",
        "sanskrit_name": "Marjaryasana-Bitilasana",
        "category_id": "posture_correction",
        "category_name": "Posture Correction",
        "difficulty": "all_levels",
        "primary_purpose": "Mobilize the entire spine.",
        "description": "A rhythmic flow connecting breath...",
        "duration_minutes": 5,
        "time_of_day": "morning",
        "contraindication_level": "safe",
        "thumbnail_url": "https://...",
        "video_url": null,
        "target_areas": ["Spine", "Neck", "Core"],
        "benefits": [
            "Lubricates spinal joints",
            "Improves proprioception",
            "Relieves stiffness"
        ],
        "step_by_step_instructions": [
            "Start on all fours, wrists under shoulders, knees under hips.",
            "Inhale: Drop belly, lift chest and gaze (Cow).",
            "Exhale: Press hands down, round spine, tuck chin (Cat).",
            "Move slowly with your own breath count.",
            "Repeat for 10-15 cycles."
        ],
        "common_mistakes": [
            "Moving too fast",
            "Bending elbows excessively",
            "Collapsing in the mid-back"
        ],
        "who_should_avoid": [
            "Wrist pain",
            "Knee pain"
        ],
        "instructor_cues": [
            "Move vertebra by vertebra",
            "Imagine a wave traveling through your spine"
        ],
        "safety_validation": {
            "isValid": true,
            "warnings": [],
            "alternatives": []
        },
        "related_exercises": [
            {"id": "sphinx_pose", "name": "Sphinx Pose", "duration_minutes": 4},
            {"id": "neck_stretches", "name": "Seated Neck Release", "duration_minutes": 3}
        ]
    }
}
```

### GET /api/yoga/recommendations

```json
{
    "success": true,
    "data": {
        "daily_recommendation": {
            "id": "butterfly_reclined",
            "name": "Reclined Butterfly",
            "sanskrit_name": "Supta Baddha Konasana",
            "duration_minutes": 5,
            "primary_purpose": "Open hips and relax belly.",
            "thumbnail_url": "https://...",
            "is_safe_for_user": true,
            "recommendation_reason": "Great for winding down • Matches your stress relief goal"
        },
        "is_personalized": true,
        "user_stats": {
            "total_sessions": 12,
            "total_minutes": 45,
            "days_this_week": 3,
            "done_today": false
        }
    }
}
```

### POST /api/yoga/session/complete

```json
// Request
{
    "session_id": 45,
    "duration_completed_seconds": 300,
    "completed": true,
    "pain_feedback": "better",
    "mood_after": 4,
    "notes": "Felt great after this!"
}

// Response
{
    "success": true,
    "data": {
        "id": 45,
        "user_id": 123,
        "exercise_id": "butterfly_reclined",
        "session_date": "2026-01-25",
        "duration_completed_seconds": 300,
        "completed": true,
        "pain_feedback": "better",
        "mood_before": 3,
        "mood_after": 4,
        "notes": "Felt great after this!",
        "finished_at": "2026-01-25T12:30:00Z"
    },
    "message": "Great job! Session completed. 🧘"
}
```

---

## 🔗 INTEGRATION GUIDE

### Frontend Data Contract

The frontend should expect:

```typescript
// Category Card
interface YogaCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    image_url: string;
    exercise_count: number;
}

// Exercise Card (List View)
interface YogaExerciseCard {
    id: string;
    name: string;
    duration_minutes: number;
    difficulty: 'beginner' | 'beginner_safe' | 'all_levels';
    thumbnail_url: string;
    category_name: string;
    is_safe_for_user: boolean;
    safety_badge: string | null;
}

// Exercise Detail
interface YogaExerciseDetail extends YogaExerciseCard {
    sanskrit_name: string;
    primary_purpose: string;
    description: string;
    video_url: string | null;
    target_areas: string[];
    benefits: string[];
    step_by_step_instructions: string[];
    common_mistakes: string[];
    who_should_avoid: string[];
    instructor_cues: string[];
    related_exercises: YogaExerciseCard[];
    safety_validation?: {
        isValid: boolean;
        warnings: string[];
        alternatives: YogaExerciseCard[];
    };
}
```

### Connecting from React Native

```typescript
// src/services/yogaService.ts

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

export const yogaApi = {
    getCategories: () => 
        fetch(`${API_BASE}/api/yoga/categories`).then(r => r.json()),
    
    getExercises: (params?: { category?: string }) => 
        fetch(`${API_BASE}/api/yoga/exercises?${new URLSearchParams(params)}`).then(r => r.json()),
    
    getExercise: (id: string) => 
        fetch(`${API_BASE}/api/yoga/exercises/${id}`).then(r => r.json()),
    
    getRecommendation: (token?: string) => 
        fetch(`${API_BASE}/api/yoga/recommendations`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }).then(r => r.json()),
    
    startSession: (exerciseId: string, token: string) =>
        fetch(`${API_BASE}/api/yoga/session/start`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ exercise_id: exerciseId })
        }).then(r => r.json()),
    
    completeSession: (data: any, token: string) =>
        fetch(`${API_BASE}/api/yoga/session/complete`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify(data)
        }).then(r => r.json())
};
```

---

## 🚀 DEPLOYMENT STEPS

### 1. Run Schema Migration

```bash
cd backend
psql -U postgres -d fitcoach_db -f src/migrations/yoga_schema_v2.sql
```

### 2. Seed Data

```bash
psql -U postgres -d fitcoach_db -f src/migrations/yoga_seed_v2.sql
```

### 3. Verify Tables

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'yoga%';

-- Expected:
-- yoga_categories
-- yoga_exercises
-- yoga_exercise_details
-- yoga_user_sessions
-- yoga_user_preferences
```

### 4. Test API

```bash
# Categories
curl http://localhost:5001/api/yoga/categories

# Exercises
curl http://localhost:5001/api/yoga/exercises?category=posture_correction

# Detail
curl http://localhost:5001/api/yoga/exercises/cat_cow
```

---

## ✅ PRODUCTION CHECKLIST

- [ ] Schema migration applied
- [ ] Seed data loaded (23 exercises)
- [ ] ENV variables configured
- [ ] API endpoints tested
- [ ] Frontend connected
- [ ] User preferences working
- [ ] Session logging working
- [ ] Recommendations personalized

---

## 🔒 SAFETY NOTES

1. **NO AI decides safety** - All contraindication logic is rule-based
2. **User pain areas** are used to filter, not diagnose
3. **Caution exercises** show warnings but don't block
4. **Avoid exercises** are excluded from recommendations

---

*Generated for FitCoach AI - Backend Architecture v2.0*
*Last Updated: 2026-01-25*
