# 📐 Profile Screen Architecture

## Component Hierarchy

```
ProfileScreen (Main Container)
│
├── Header
│   ├── Title: "Profile"
│   └── Refresh Button
│
├── ScrollView (with Pull-to-Refresh)
│   │
│   ├── 1. IDENTITY SECTION ▼
│   │   ├── ProfileRow: Name (editable)
│   │   ├── ProfileRow: Email (read-only)
│   │   └── ProfileRow: Primary Goal (editable, select)
│   │
│   ├── 2. PROGRESS SNAPSHOT ▼
│   │   └── StatsGrid (2x2)
│   │       ├── StatCard: Current Weight
│   │       ├── StatCard: Current Streak
│   │       ├── StatCard: Days Tracked
│   │       └── StatCard: Consistency %
│   │
│   ├── 3. GOALS & TARGETS ▼
│   │   ├── ProfileRow: Current Weight (editable)
│   │   ├── ProfileRow: Height (editable)
│   │   ├── ProfileRow: Daily Calorie Target (editable)
│   │   └── ProfileRow: Activity Level (editable, select)
│   │
│   ├── 4. HEALTH SNAPSHOT ▼
│   │   ├── BMI Card (calculated)
│   │   │   ├── BMI Value (e.g., 24.2)
│   │   │   └── BMI Category Badge (Normal/Green)
│   │   ├── ProfileRow: Age (editable)
│   │   └── ProfileRow: Gender (editable, select)
│   │
│   ├── 5. ACHIEVEMENTS ▼
│   │   ├── AchievementCard: Current Streak 🔥
│   │   ├── AchievementCard: Longest Streak ⭐
│   │   ├── AchievementCard: Total Workouts 💪
│   │   └── AchievementCard: Days Logged 🍎
│   │
│   ├── 6. DATA & PRIVACY ▼
│   │   ├── Privacy Note 🔒
│   │   ├── ActionButton: Export My Data (blue)
│   │   ├── ActionButton: Delete All My Data (red border)
│   │   └── ActionButton: Deactivate Account (yellow border)
│   │
│   └── 7. ACCOUNT & SECURITY
│       ├── ActionButton: Logout (orange)
│       └── Member Since Text
│
└── Edit Modal (Conditional)
    ├── Modal Header
    │   ├── Title
    │   └── Close Button
    └── Modal Body
        ├── TextInput (for text/number)
        │   OR
        ├── Option Buttons (for select)
        └── Save Button
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PROFILE SCREEN                        │
└─────────────────────────────────────────────────────────┘
                           │
                           │ useFocusEffect()
                           ▼
┌─────────────────────────────────────────────────────────┐
│              fetchProfileData()                          │
│  [Parallel API Calls via Promise.all()]                 │
└─────────────────────────────────────────────────────────┘
          │                │                 │
          ▼                ▼                 ▼
    ┌─────────┐     ┌──────────┐     ┌──────────────┐
    │ userAPI │     │ userAPI  │     │ analyticsAPI │
    │.getProfile()  │.getStats()│     │.getProgress()│
    └─────────┘     └──────────┘     └──────────────┘
          │                │                 │
          ▼                ▼                 ▼
┌────────────────────────────────────────────────────────┐
│                  BACKEND APIs                           │
├─────────────────────────────────────────────────────────┤
│  GET /api/user/profile         → UserProfile           │
│  GET /api/user/stats           → UserStats             │
│  GET /api/analytics/progress   → ProgressOverview      │
└────────────────────────────────────────────────────────┘
          │                │                 │
          ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│              STATE UPDATES                               │
├──────────────────────────────────────────────────────────┤
│  setProfile(profileData)                                │
│  setStats(statsData)                                    │
│  setProgress(progressData)                              │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│               UI RENDER                                  │
├──────────────────────────────────────────────────────────┤
│  • Identity Section (profile.name, profile.email)       │
│  • Progress Snapshot (progress.currentStreak)           │
│  • Goals & Targets (profile.weight, profile.height)     │
│  • Health Snapshot (calculated BMI)                     │
│  • Achievements (stats.exerciseLogsCount)               │
│  • Privacy Controls (export/delete/deactivate)          │
└─────────────────────────────────────────────────────────┘
```

---

## Edit Flow Architecture

```
USER INTERACTION
       │
       │ Tap "Current Weight"
       ▼
┌──────────────────────────────────────┐
│    openEditModal()                   │
│  • Set modal visible                 │
│  • Set field name: 'weight'          │
│  • Set current value: 70             │
│  • Set type: 'number'                │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│       MODAL RENDERS                  │
│  • Shows title: "Update Weight"      │
│  • Shows TextInput with value: 70    │
│  • Shows Save button                 │
└──────────────────────────────────────┘
       │
       │ User enters 75, taps Save
       ▼
┌──────────────────────────────────────┐
│    saveProfileField()                │
│  • Create updateData: { weight: 75 } │
│  • Call authAPI.updateProfile()      │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│      BACKEND API                     │
│  PATCH /api/auth/profile             │
│  { weight: 75 }                      │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│     DATABASE UPDATE                  │
│  UPDATE users SET weight = 75        │
│  WHERE id = user.id                  │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│    RESPONSE SUCCESS                  │
│  { message: "Profile updated" }      │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│    UI UPDATE                         │
│  • Close modal                       │
│  • Show success alert                │
│  • Refresh profile data              │
│  • BMI recalculates automatically    │
└──────────────────────────────────────┘
```

---

## Delete Data Flow (Double Confirmation)

```
USER ACTION
    │
    │ Tap "Delete All My Data"
    ▼
┌─────────────────────────────────────┐
│  FIRST ALERT                        │
│  ⚠️ Warning Message                 │
│  • Lists what will be deleted       │
│  • "This CANNOT be undone"          │
│  [Cancel] [Delete Everything]       │
└─────────────────────────────────────┘
    │
    │ User taps "Delete Everything"
    ▼
┌─────────────────────────────────────┐
│  SECOND ALERT (Text Prompt)        │
│  "Type DELETE_MY_DATA to confirm"   │
│  [Cancel] [Delete]                  │
└─────────────────────────────────────┘
    │
    │ User types: "DELETE_MY_DATA"
    ▼
┌─────────────────────────────────────┐
│  VALIDATION                         │
│  if (confirmation === "DELETE_MY_DATA") │
│    ✅ Proceed                       │
│  else                               │
│    ❌ Show error, cancel            │
└─────────────────────────────────────┘
    │
    │ ✅ Confirmed
    ▼
┌─────────────────────────────────────┐
│  API CALL                           │
│  userAPI.deleteData("DELETE_MY_DATA") │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  BACKEND DELETE                     │
│  DELETE FROM users WHERE id = ?     │
│  • Cascade deletes all related data │
│  • food_logs, exercise_logs, etc.   │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  SUCCESS RESPONSE                   │
│  { message: "Data deleted" }        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  LOGOUT & NAVIGATE                  │
│  • Show success alert               │
│  • Call logout()                    │
│  • Clear tokens                     │
│  • Navigate to Auth screen          │
└─────────────────────────────────────┘
```

---

## BMI Calculation Flow

```
PROFILE DATA LOADED
    │
    ▼
┌─────────────────────────────────────┐
│  profile.weight = 70 kg             │
│  profile.height = 170 cm            │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  calculateBMI()                     │
│  heightInMeters = 170 / 100 = 1.7   │
│  bmi = 70 / (1.7 * 1.7) = 24.2     │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  getBMICategory(24.2)               │
│  18.5 ≤ 24.2 < 25                   │
│  → "Normal" (Green)                 │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  RENDER BMI CARD                    │
│  ┌─────────────────────────────┐   │
│  │  Body Mass Index (BMI)      │   │
│  │         24.2                │   │
│  │  ┌───────────────────┐      │   │
│  │  │ Normal (Green)    │      │   │
│  │  └───────────────────┘      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## State Management Architecture

```typescript
// Core Profile State
const [profile, setProfile] = useState<UserProfile | null>(null);
const [stats, setStats] = useState<UserStats | null>(null);
const [progress, setProgress] = useState<ProgressOverview | null>(null);

// UI State
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);

// Modal State
const [editModal, setEditModal] = useState<EditModalData>({
  visible: false,
  title: '',
  field: '',
  value: '',
  type: 'text',
  options: undefined,
});

// Section Expansion State
const [expandedSections, setExpandedSections] = useState({
  identity: true,      // Expanded by default
  progress: true,      // Expanded by default
  goals: false,
  health: false,
  achievements: false,
  privacy: false,
});
```

---

## API Integration Mapping

```
┌────────────────────────────────────────────────────────────┐
│                    PROFILE SCREEN                           │
└────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌───────────────┐  ┌─────────────────┐
│   Identity   │  │   Progress    │  │  Goals/Health   │
│   Section    │  │   Snapshot    │  │    Sections     │
└──────────────┘  └───────────────┘  └─────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌───────────────┐  ┌─────────────────┐
│ userAPI      │  │ analyticsAPI  │  │  authAPI        │
│.getProfile() │  │.getProgress() │  │.updateProfile() │
└──────────────┘  └───────────────┘  └─────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────┐
│               BACKEND ENDPOINTS                       │
├───────────────────────────────────────────────────────┤
│  GET /api/user/profile                               │
│  GET /api/user/stats                                 │
│  GET /api/analytics/progress                         │
│  PATCH /api/auth/profile                             │
│  PATCH /api/user/preferences                         │
│  GET /api/user/export-data                           │
│  DELETE /api/user/delete-data                        │
│  POST /api/user/deactivate                           │
│  POST /api/auth/logout                               │
└──────────────────────────────────────────────────────┘
```

---

## Security Architecture

```
┌──────────────────────────────────────────────────────┐
│                 AXIOS INTERCEPTOR                     │
│  (Automatic for all API calls)                       │
└──────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌─────────────┐
│ Add Bearer   │ │ Handle 401  │ │ Retry Failed│
│ Token        │ │ Refresh     │ │ Requests    │
└──────────────┘ └─────────────┘ └─────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────┐
│              SECURE TOKEN STORAGE                     │
├───────────────────────────────────────────────────────┤
│  • Access Token: SecureStore (encrypted)              │
│  • Refresh Token: AsyncStorage (persistent)           │
│  • User Data: AsyncStorage (non-sensitive)            │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────┐
│           DOUBLE CONFIRMATION FLOW                    │
├───────────────────────────────────────────────────────┤
│  Delete Data:                                         │
│  1. Warning Alert                                     │
│  2. Text Prompt ("DELETE_MY_DATA")                   │
│  3. Exact Match Validation                           │
│  4. API Call                                          │
│  5. Logout                                            │
└──────────────────────────────────────────────────────┘
```

---

## Performance Optimization

```
┌──────────────────────────────────────────────────────┐
│            PROFILE SCREEN OPTIMIZATIONS              │
└──────────────────────────────────────────────────────┘
        │
        ├─► PARALLEL API CALLS
        │   Promise.all([getProfile(), getStats(), getProgress()])
        │   → Reduces load time by 66%
        │
        ├─► COLLAPSIBLE SECTIONS
        │   Only render expanded sections
        │   → Reduces initial render cost
        │
        ├─► MEMOIZED CALCULATIONS
        │   BMI calculated once per profile change
        │   → Prevents unnecessary recalculations
        │
        ├─► PULL-TO-REFRESH
        │   Manual refresh only
        │   → Saves bandwidth
        │
        └─► FOCUS-BASED FETCHING
            useFocusEffect() only
            → Data fetched only when screen is active
```

---

## User Experience Timeline

```
Time     Action                              UI Feedback
────────────────────────────────────────────────────────────
0.0s     User taps Profile tab               Screen appears
0.1s     useFocusEffect triggers             Loading spinner
0.2s     3 API calls start (parallel)        "Loading profile..."
0.5s     APIs return data                    Spinner continues
0.6s     State updates complete              Sections render
0.7s     BMI calculated                      BMI card appears
0.8s     Achievements rendered               Cards appear
0.9s     Privacy section rendered            Buttons appear
1.0s     Scroll enabled                      User can interact
         ✅ Profile fully loaded             Ready
```

---

## Edge Cases Handled

```
1. NO DATA SCENARIOS
   ├─► profile?.weight = undefined
   │   → Display "Not set"
   ├─► progress?.currentStreak = 0
   │   → Display "0 days"
   └─► stats = null
       → Hide stats grid

2. NETWORK ERRORS
   ├─► ECONNREFUSED
   │   → "Cannot connect to server"
   ├─► ETIMEDOUT
   │   → "Request timeout"
   └─► SESSION_EXPIRED
       → Silent logout (no alert)

3. INVALID INPUTS
   ├─► Weight = negative
   │   → Backend validation error
   ├─► Height = 0
   │   → Backend validation error
   └─► Age = 200
       → Backend validation error

4. BMI CALCULATION
   ├─► Missing weight
   │   → Don't show BMI card
   ├─► Missing height
   │   → Don't show BMI card
   └─► Both present
       → Calculate and display

5. DELETE CONFIRMATION
   ├─► User types "delete_my_data" (lowercase)
   │   → Reject (case-sensitive)
   ├─► User types "DELETE MY DATA" (spaces)
   │   → Reject (exact match required)
   └─► User types "DELETE_MY_DATA"
       → Proceed ✅
```

---

## Component Reusability

```
ProfileScreen
    ├─► ProfileRow Component
    │   (Used 8 times)
    │   Props: icon, label, value, onPress, editable
    │
    ├─► StatCard Component
    │   (Used 4 times)
    │   Props: icon, label, value, color
    │
    ├─► AchievementCard Component
    │   (Used 4 times - inline)
    │   Structure: icon + info + value + label
    │
    └─► Edit Modal
        (Single instance, dynamic content)
        Props: visible, title, field, value, type, options
```

---

## Testing Strategy

```
UNIT TESTS
    ├─► calculateBMI() function
    ├─► getBMICategory() function
    └─► Field validation helpers

INTEGRATION TESTS
    ├─► Profile data fetching
    ├─► Edit modal save flow
    ├─► Data export generation
    └─► Logout flow

E2E TESTS
    ├─► Full profile load
    ├─► Edit weight → Save → Refresh
    ├─► Export data → Share sheet
    └─► Delete data → Logout
```

---

## Scalability Considerations

```
FUTURE ENHANCEMENTS (Easy to Add)

1. AI COACH SETTINGS SECTION
   ├─► Coaching Style (strict/friendly/minimal)
   ├─► Insight Frequency (daily/weekly)
   ├─► Tone (motivational/factual)
   └─► Implementation: Copy Goals section pattern

2. DIETARY PREFERENCES SECTION
   ├─► Diet Type (veg/vegan/keto/paleo)
   ├─► Food Dislikes
   ├─► Allergies
   └─► Implementation: Use userAPI.updatePreferences()

3. CHARTS & VISUALIZATIONS
   ├─► Weight Trend (30 days)
   ├─► Calorie Trend (7 days)
   ├─► Water Intake Trend
   └─► Implementation: Use analyticsAPI.getWeeklyTrends()

4. BADGE/ACHIEVEMENT SYSTEM
   ├─► Milestone badges
   ├─► Level progression
   ├─► Unlock animations
   └─► Implementation: New section below Achievements
```

---

**Architecture Summary**: The Profile Screen is built with a **modular, scalable, and maintainable architecture** that prioritizes **user trust, motivation, and personalization** while maintaining **production-grade code quality** and **security best practices**. 🚀
