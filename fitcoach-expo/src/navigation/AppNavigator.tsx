/**
 * AppNavigator.tsx
 * Product Redesign - Clean 5-Tab Architecture
 * 
 * Tab Order: Home (Read-only) → Today (Action) → Coach (Explain) → Progress (Reflect) → Profile (Settings)
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Auth
import { useAuth } from '../context/AuthContext';
import AuthScreen from '../screens/AuthScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';

// Main Tab Screens
import HomeScreen from '../screens/HomeScreen'; // READ-ONLY Dashboard
import TodayScreen from '../screens/TodayScreen'; // ACTION CENTER
import CoachScreen from '../screens/CoachScreen'; // AI EXPLANATION
import ProgressScreen from '../screens/ProgressScreen'; // REFLECTION
import ProfileScreen from '../screens/ProfileScreen'; // SETTINGS

// Stack Screens
import FoodLogScreen from '../screens/FoodLogScreen';
import ExerciseLogScreen from '../screens/ExerciseLogScreen';
import WaterLogScreen from '../screens/WaterLogScreen';
import WeightScreen from '../screens/WeightScreen';
import HistoryScreen from '../screens/HistoryScreen';
import { MealDetailScreen } from '../screens/MealDetailScreen';
import WorkoutPlannerScreen from '../screens/WorkoutPlannerScreen';
import { ProfileSetupScreen } from '../screens/ProfileSetupScreen';
import PricingScreen from '../screens/PricingScreen';
import RecipesScreen from '../screens/RecipesScreen';

// Groups 1 & 2 & 3 Screens
import SettingsScreen from '../screens/SettingsScreen';
import HabitsScreen from '../screens/HabitsScreen';
import TodosScreen from '../screens/TodosScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PlannerScreen from '../screens/PlannerScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import PostureScreen from '../screens/PostureScreen';
import PainReliefScreen from '../screens/PainReliefScreen';
import PostureCareScreen from '../screens/PostureCareScreen';
import CorrectiveSessionScreen from '../screens/CorrectiveSessionScreen';

// Yoga Screens
import YogaHomeScreen from '../screens/yoga/YogaHomeScreen';
import YogaCategoryScreen from '../screens/yoga/YogaCategoryScreen';
import YogaSessionScreen from '../screens/yoga/YogaSessionScreen';
import YogaRoutineScreen from '../screens/yoga/YogaRoutineScreen';
import AllRoutinesScreen from '../screens/yoga/AllRoutinesScreen';
import YogaLiveSessionScreen from '../screens/yoga/YogaLiveSessionScreen';
import YogaCompletionScreen from '../screens/yoga/YogaCompletionScreen';

// Components
import { NotificationManager } from '../components/NotificationManager';
import { AppUpdater } from '../components/AppUpdater';

const colors = {
  primary: '#26d9bb',
  primaryDark: '#1fbda1',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  tabInactive: '#94a3b8',
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const YogaStack = createNativeStackNavigator();

/**
 * Yoga Module Navigator
 * Dedicated stack for Yoga flow
 */
function YogaNavigator() {
  return (
    <YogaStack.Navigator screenOptions={{ headerShown: false }}>
      <YogaStack.Screen name="YogaMain" component={YogaHomeScreen} />
      <YogaStack.Screen name="YogaCategory" component={YogaCategoryScreen} />
      <YogaStack.Screen name="YogaSession" component={YogaSessionScreen} />
      <YogaStack.Screen name="YogaRoutine" component={YogaRoutineScreen} />
      <YogaStack.Screen name="AllRoutines" component={AllRoutinesScreen} />
      <YogaStack.Screen
        name="YogaLiveSession"
        component={YogaLiveSessionScreen}
        options={{ gestureEnabled: false }}
      />
      <YogaStack.Screen
        name="YogaCompletion"
        component={YogaCompletionScreen}
        options={{ gestureEnabled: false }}
      />
    </YogaStack.Navigator>
  );
}

/**
 * Main Tab Navigator
 * Clean 5-tab structure with strict responsibilities
 */
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      {/* TAB 1: HOME - Read-only awareness */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'home' : 'home-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* TAB 2: TODAY - Action center */}
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'calendar-check' : 'calendar-check-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* TAB 3: COACH - AI explanation only */}
      <Tab.Screen
        name="Coach"
        component={CoachScreen}
        options={{
          tabBarLabel: 'Coach',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'robot-excited' : 'robot-excited-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* TAB 4: YOGA - Mindfulness & Movement */}
      <Tab.Screen
        name="YogaTab"
        component={YogaNavigator}
        options={{
          tabBarLabel: 'Yoga',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'meditation' : 'meditation'}
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* TAB 5: PROFILE - Settings & data */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'account' : 'account-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Main App Navigator
 * State machine based routing
 */
export default function AppNavigator() {
  const { authStatus, user, isLoading } = useAuth();

  // State 1: Loading
  if (isLoading || authStatus === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // State 2: Unauthenticated
  if (authStatus === 'unauthenticated') {
    return (
      <>
        <AppUpdater />
        <NotificationManager />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Auth" component={AuthScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </>
    );
  }

  // State 3: Email Verification Pending
  if (authStatus === 'email_verification_pending') {
    return (
      <>
        <AppUpdater />
        <NotificationManager />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </>
    );
  }

  // State 4: Profile Setup Required (ONE-TIME ONLY)
  if (authStatus === 'profile_setup_required') {
    return (
      <>
        <AppUpdater />
        <NotificationManager />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="ProfileSetup"
              component={ProfileSetupScreen}
              options={{ gestureEnabled: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </>
    );
  }

  // State 5: Authenticated - Full App Access
  if (authStatus === 'authenticated') {
    return (
      <>
        <AppUpdater />
        <NotificationManager />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/* Main tabs */}
            <Stack.Screen name="Main" component={TabNavigator} />

            {/* Logging screens (accessed from Today) */}
            <Stack.Screen name="FoodLog" component={FoodLogScreen} />
            <Stack.Screen name="ExerciseLog" component={ExerciseLogScreen} />
            <Stack.Screen name="WaterLog" component={WaterLogScreen} />
            <Stack.Screen name="Weight" component={WeightScreen} />
            <Stack.Screen name="Recipes" component={RecipesScreen} />

            {/* Detail screens */}
            <Stack.Screen
              name="MealDetail"
              component={MealDetailScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="WorkoutPlanner"
              component={WorkoutPlannerScreen}
              options={{ presentation: 'card' }}
            />

            {/* History & settings */}
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen
              name="Pricing"
              component={PricingScreen}
              options={{ presentation: 'modal' }}
            />

            {/* New Premium Features */}
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Habits" component={HabitsScreen} />
            <Stack.Screen name="Todos" component={TodosScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Planner" component={PlannerScreen} />
            <Stack.Screen
              name="ActiveWorkout"
              component={ActiveWorkoutScreen}
              options={{
                presentation: 'fullScreenModal',
                gestureEnabled: false // Prevent accidental swipe down
              }}
            />

            <Stack.Screen name="Posture" component={PostureScreen} />
            <Stack.Screen name="PainRelief" component={PainReliefScreen} />

            {/* Posture & Pain Care */}
            <Stack.Screen name="PostureCare" component={PostureCareScreen} />
            <Stack.Screen
              name="CorrectiveSession"
              component={CorrectiveSessionScreen}
              options={{
                presentation: 'fullScreenModal',
                gestureEnabled: false
              }}
            />


            {/* Yoga Module */}
            <Stack.Screen
              name="Yoga"
              component={YogaNavigator}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </>
    );
  }

  // Fallback
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
