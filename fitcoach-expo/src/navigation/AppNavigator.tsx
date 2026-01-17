import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { logScreenView } from '../config/firebase';

// Auth
import { useAuth } from '../context/AuthContext';
import AuthScreen from '../screens/AuthScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import CoachScreen from '../screens/CoachScreen';
import FoodLogScreen from '../screens/FoodLogScreen';
import HistoryScreen from '../screens/HistoryScreen';
import TodayScreen from '../screens/TodayScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ExerciseLogScreen from '../screens/ExerciseLogScreen';
import WaterLogScreen from '../screens/WaterLogScreen';
import { NotificationManager } from '../components/NotificationManager';
import { AppUpdater } from '../components/AppUpdater';
import PricingScreen from '../screens/PricingScreen';
import MealPlannerScreen from '../screens/MealPlannerScreen';
import WorkoutPlannerScreen from '../screens/WorkoutPlannerScreen';
import WeightScreen from '../screens/WeightScreen';
import { MealDistributionScreen } from '../screens/MealDistributionScreen';
import { ProfileSetupScreen } from '../screens/ProfileSetupScreen';
import { MealDetailScreen } from '../screens/MealDetailScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen'; // Added

const colors = {
  primary: '#26d9bb', // Teal
  primaryDark: '#0fb863',
  backgroundLight: '#FFFFFF',
  surfaceLight: '#FFFFFF',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surfaceLight,
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Coach"
        component={CoachScreen}
        options={{
          tabBarLabel: 'AI Coach',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'robot-excited' : 'robot-excited-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Food"
        component={FoodLogScreen}
        options={{
          tabBarLabel: 'Food',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'silverware-fork-knife' : 'silverware-fork-knife'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'calendar-today' : 'calendar-today'}
              color={color}
              size={size}
            />
          ),
        }}
      />
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

export default function AppNavigator() {
  const { authStatus, user, isLoading } = useAuth();

  /**
   * PRODUCTION RULE: Routing is DETERMINISTIC and state-machine based
   * 5 states map to 3 routing decisions
   */

  // State 1: Loading
  if (isLoading || authStatus === 'loading') {
    console.log('📱 [NAVIGATOR] State: loading → show spinner');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // State 2: Unauthenticated
  if (authStatus === 'unauthenticated') {
    console.log('📱 [NAVIGATOR] State: unauthenticated → show LoginScreen');
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
    console.log('📱 [NAVIGATOR] State: email_verification_pending → show VerifyEmailScreen');
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

  // State 4: Profile Setup Required
  if (authStatus === 'profile_setup_required') {
    console.log('📱 [NAVIGATOR] State: profile_setup_required → show ProfileSetupScreen (ONE TIME)');
    return (
      <>
        <AppUpdater />
        <NotificationManager />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="ProfileSetup"
              component={ProfileSetupScreen}
              options={{ gestureEnabled: false }} // Prevent swipe back
            />
          </Stack.Navigator>
        </NavigationContainer>
      </>
    );
  }

  // State 5: Authenticated (Profile Complete)
  if (authStatus === 'authenticated') {
    console.log('📱 [NAVIGATOR] State: authenticated → show Dashboard');
    return (
      <>
        <AppUpdater />
        <NotificationManager />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Pricing" component={PricingScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="FoodLog" component={FoodLogScreen} />
            <Stack.Screen name="ExerciseLog" component={ExerciseLogScreen} />
            <Stack.Screen name="WaterLog" component={WaterLogScreen} />
            <Stack.Screen name="MealPlanner" component={MealPlannerScreen} />
            <Stack.Screen name="WorkoutPlanner" component={WorkoutPlannerScreen} />
            <Stack.Screen name="Weight" component={WeightScreen} />
            <Stack.Screen name="MealDistribution" component={MealDistributionScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="MealDetail" component={MealDetailScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </>
    );
  }

  // Fallback (should never happen)
  console.error('❌ [NAVIGATOR] Unknown auth status:', authStatus);
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
    backgroundColor: colors.backgroundLight,
  },
});
