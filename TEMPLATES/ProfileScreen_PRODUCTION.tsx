// ProfileScreen.tsx - Production-Grade Profile Page
// Location: /fitcoach-expo/src/screens/ProfileScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Share,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { 
  userAPI, 
  authAPI, 
  analyticsAPI, 
  handleAPIError,
  UserProfile,
  UserStats,
  ProgressOverview 
} from '../services/api';

// Color palette
const colors = {
  background: '#102219',
  surface: '#16261f',
  surfaceLight: '#1f3329',
  primary: '#13ec80',
  primaryDark: '#0fb863',
  text: '#ffffff',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  blue: '#60A5FA',
  orange: '#FB7185',
  yellow: '#FBBF24',
  red: '#EF4444',
  green: '#10B981',
  purple: '#A855F7',
};

interface EditModalData {
  visible: boolean;
  title: string;
  field: string;
  value: string;
  type: 'text' | 'number' | 'select';
  options?: { label: string; value: string }[];
}

const ProfileScreen = () => {
  const { logout, user: authUser } = useAuth();
  
  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [progress, setProgress] = useState<ProgressOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit modal
  const [editModal, setEditModal] = useState<EditModalData>({
    visible: false,
    title: '',
    field: '',
    value: '',
    type: 'text',
  });
  
  // Section expansion
  const [expandedSections, setExpandedSections] = useState({
    identity: true,
    progress: true,
    goals: false,
    health: false,
    achievements: false,
    privacy: false,
  });

  // Fetch all profile data
  const fetchProfileData = async () => {
    try {
      const [profileData, statsData, progressData] = await Promise.all([
        userAPI.getProfile(),
        userAPI.getStats(),
        analyticsAPI.getProgress(),
      ]);
      
      setProfile(profileData);
      setStats(statsData);
      setProgress(progressData);
    } catch (error: any) {
      if (error?.code !== 'SESSION_EXPIRED') {
        Alert.alert('Error', handleAPIError(error));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData();
  };

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Open edit modal
  const openEditModal = (
    title: string, 
    field: string, 
    currentValue: any, 
    type: 'text' | 'number' | 'select' = 'text',
    options?: { label: string; value: string }[]
  ) => {
    setEditModal({
      visible: true,
      title,
      field,
      value: String(currentValue || ''),
      type,
      options,
    });
  };

  // Save profile field
  const saveProfileField = async () => {
    try {
      const updateData: any = {};
      const value = editModal.type === 'number' ? parseFloat(editModal.value) : editModal.value;
      
      // Map display field names to API field names
      const fieldMap: any = {
        name: 'name',
        weight: 'weight',
        height: 'height',
        age: 'age',
        gender: 'gender',
        activityLevel: 'activityLevel',
        goal: 'goal',
        calorieTarget: 'calorieTarget',
      };
      
      updateData[fieldMap[editModal.field]] = value;
      
      await authAPI.updateProfile(updateData);
      setEditModal({ ...editModal, visible: false });
      await fetchProfileData();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', handleAPIError(error));
    }
  };

  // Export data
  const handleExportData = async () => {
    Alert.alert(
      'Export Your Data',
      'This will create a complete export of all your data including food logs, exercise logs, water logs, and AI insights.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              const exportData = await userAPI.exportData();
              
              // Convert to JSON string
              const jsonString = JSON.stringify(exportData, null, 2);
              
              // Share or save the data
              await Share.share({
                message: `FitCoach AI Data Export\n\nTotal Records: ${exportData.totalRecords?.foodLogs || 0} food logs, ${exportData.totalRecords?.exerciseLogs || 0} exercise logs, ${exportData.totalRecords?.waterLogs || 0} water logs\n\nExported: ${exportData.exportDate}`,
                title: 'FitCoach AI Data Export',
              });
              
              Alert.alert('Success', 'Data exported successfully. You can save or share this file.');
            } catch (error) {
              Alert.alert('Error', handleAPIError(error));
            }
          },
        },
      ]
    );
  };

  // Delete all data
  const handleDeleteData = () => {
    Alert.alert(
      '⚠️ Delete All Data',
      'This will PERMANENTLY delete all your data:\n\n• Food logs\n• Exercise logs\n• Water logs\n• Daily summaries\n• AI insights\n• Your account\n\nThis action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.prompt(
              'Final Confirmation',
              'Type "DELETE_MY_DATA" to confirm permanent deletion:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async (confirmation) => {
                    if (confirmation === 'DELETE_MY_DATA') {
                      try {
                        await userAPI.deleteData(confirmation);
                        Alert.alert('Deleted', 'All your data has been permanently deleted. You will now be logged out.');
                        await logout();
                      } catch (error) {
                        Alert.alert('Error', handleAPIError(error));
                      }
                    } else {
                      Alert.alert('Cancelled', 'Confirmation text did not match. Data NOT deleted.');
                    }
                  },
                },
              ],
              'plain-text'
            );
          },
        },
      ]
    );
  };

  // Deactivate account
  const handleDeactivateAccount = () => {
    Alert.alert(
      'Deactivate Account',
      'Your account will be deactivated but your data will be preserved. You can contact support to reactivate.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await userAPI.deactivateAccount();
              Alert.alert('Deactivated', 'Your account has been deactivated. Contact support to reactivate.');
              await logout();
            } catch (error) {
              Alert.alert('Error', handleAPIError(error));
            }
          },
        },
      ]
    );
  };

  // Logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  // Calculate BMI
  const calculateBMI = (): number | null => {
    if (profile?.weight && profile?.height) {
      const heightInMeters = profile.height / 100;
      return profile.weight / (heightInMeters * heightInMeters);
    }
    return null;
  };

  const getBMICategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: 'Underweight', color: colors.blue };
    if (bmi < 25) return { label: 'Normal', color: colors.green };
    if (bmi < 30) return { label: 'Overweight', color: colors.yellow };
    return { label: 'Obese', color: colors.red };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const bmi = calculateBMI();
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialCommunityIcons name="refresh" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. IDENTITY SECTION */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('identity')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="account-circle" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Identity</Text>
          </View>
          <MaterialCommunityIcons
            name={expandedSections.identity ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {expandedSections.identity && (
          <View style={styles.section}>
            <ProfileRow
              icon="account"
              label="Name"
              value={profile?.name || 'Not set'}
              onPress={() => openEditModal('Edit Name', 'name', profile?.name, 'text')}
            />
            <ProfileRow
              icon="email"
              label="Email"
              value={profile?.email || 'Not set'}
              editable={false}
            />
            <ProfileRow
              icon="target"
              label="Primary Goal"
              value={profile?.goal || 'Not set'}
              onPress={() => openEditModal('Set Goal', 'goal', profile?.goal, 'select', [
                { label: 'Lose Weight', value: 'lose_weight' },
                { label: 'Maintain Weight', value: 'maintain' },
                { label: 'Gain Muscle', value: 'gain_muscle' },
                { label: 'Stay Fit', value: 'stay_fit' },
              ])}
            />
          </View>
        )}

        {/* 2. PROGRESS SNAPSHOT */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('progress')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="chart-line" size={24} color={colors.blue} />
            <Text style={styles.sectionTitle}>Progress Snapshot</Text>
          </View>
          <MaterialCommunityIcons
            name={expandedSections.progress ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {expandedSections.progress && (
          <View style={styles.section}>
            <View style={styles.statsGrid}>
              <StatCard
                icon="weight"
                label="Current Weight"
                value={profile?.weight ? `${profile.weight} kg` : 'Not set'}
                color={colors.blue}
              />
              <StatCard
                icon="fire"
                label="Current Streak"
                value={progress?.currentStreak ? `${progress.currentStreak} days` : '0 days'}
                color={colors.orange}
              />
              <StatCard
                icon="calendar-check"
                label="Days Tracked"
                value={`${progress?.totalDaysTracked || 0}`}
                color={colors.green}
              />
              <StatCard
                icon="chart-bar"
                label="Consistency"
                value={progress?.consistency ? `${Math.round(progress.consistency.percentage)}%` : '0%'}
                color={colors.purple}
              />
            </View>
          </View>
        )}

        {/* 3. GOALS & TARGETS */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('goals')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="bullseye-arrow" size={24} color={colors.yellow} />
            <Text style={styles.sectionTitle}>Goals & Targets</Text>
          </View>
          <MaterialCommunityIcons
            name={expandedSections.goals ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {expandedSections.goals && (
          <View style={styles.section}>
            <ProfileRow
              icon="scale-bathroom"
              label="Current Weight"
              value={profile?.weight ? `${profile.weight} kg` : 'Not set'}
              onPress={() => openEditModal('Update Weight', 'weight', profile?.weight, 'number')}
            />
            <ProfileRow
              icon="human-male-height"
              label="Height"
              value={profile?.height ? `${profile.height} cm` : 'Not set'}
              onPress={() => openEditModal('Update Height', 'height', profile?.height, 'number')}
            />
            <ProfileRow
              icon="fire"
              label="Daily Calorie Target"
              value={profile?.calorie_target ? `${profile.calorie_target} kcal` : 'Not set'}
              onPress={() => openEditModal('Set Calorie Target', 'calorieTarget', profile?.calorie_target, 'number')}
            />
            <ProfileRow
              icon="run"
              label="Activity Level"
              value={profile?.activity_level || 'Not set'}
              onPress={() => openEditModal('Set Activity Level', 'activityLevel', profile?.activity_level, 'select', [
                { label: 'Sedentary', value: 'sedentary' },
                { label: 'Lightly Active', value: 'lightly_active' },
                { label: 'Moderately Active', value: 'moderately_active' },
                { label: 'Very Active', value: 'very_active' },
                { label: 'Extremely Active', value: 'extremely_active' },
              ])}
            />
          </View>
        )}

        {/* 4. HEALTH SNAPSHOT */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('health')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color={colors.red} />
            <Text style={styles.sectionTitle}>Health Snapshot</Text>
          </View>
          <MaterialCommunityIcons
            name={expandedSections.health ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {expandedSections.health && (
          <View style={styles.section}>
            {bmi && bmiCategory && (
              <View style={styles.bmiCard}>
                <Text style={styles.bmiLabel}>Body Mass Index (BMI)</Text>
                <Text style={styles.bmiValue}>{bmi.toFixed(1)}</Text>
                <View style={[styles.bmiCategory, { backgroundColor: `${bmiCategory.color}20` }]}>
                  <Text style={[styles.bmiCategoryText, { color: bmiCategory.color }]}>
                    {bmiCategory.label}
                  </Text>
                </View>
              </View>
            )}
            <ProfileRow
              icon="calendar-month"
              label="Age"
              value={profile?.age ? `${profile.age} years` : 'Not set'}
              onPress={() => openEditModal('Update Age', 'age', profile?.age, 'number')}
            />
            <ProfileRow
              icon="human"
              label="Gender"
              value={profile?.gender || 'Not set'}
              onPress={() => openEditModal('Set Gender', 'gender', profile?.gender, 'select', [
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
                { label: 'Other', value: 'other' },
              ])}
            />
          </View>
        )}

        {/* 5. ACHIEVEMENTS & MOTIVATION */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('achievements')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="trophy" size={24} color={colors.yellow} />
            <Text style={styles.sectionTitle}>Achievements</Text>
          </View>
          <MaterialCommunityIcons
            name={expandedSections.achievements ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {expandedSections.achievements && (
          <View style={styles.section}>
            <View style={styles.achievementCard}>
              <MaterialCommunityIcons name="fire" size={32} color={colors.orange} />
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementValue}>{progress?.currentStreak || 0} days</Text>
                <Text style={styles.achievementLabel}>Current Streak</Text>
              </View>
            </View>
            <View style={styles.achievementCard}>
              <MaterialCommunityIcons name="star" size={32} color={colors.yellow} />
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementValue}>{progress?.longestStreak || 0} days</Text>
                <Text style={styles.achievementLabel}>Longest Streak</Text>
              </View>
            </View>
            <View style={styles.achievementCard}>
              <MaterialCommunityIcons name="dumbbell" size={32} color={colors.primary} />
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementValue}>{stats?.exerciseLogsCount || 0}</Text>
                <Text style={styles.achievementLabel}>Total Workouts</Text>
              </View>
            </View>
            <View style={styles.achievementCard}>
              <MaterialCommunityIcons name="food-apple" size={32} color={colors.green} />
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementValue}>{stats?.daysLogged || 0}</Text>
                <Text style={styles.achievementLabel}>Days Logged</Text>
              </View>
            </View>
          </View>
        )}

        {/* 6. DATA & PRIVACY */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('privacy')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="shield-check" size={24} color={colors.green} />
            <Text style={styles.sectionTitle}>Data & Privacy</Text>
          </View>
          <MaterialCommunityIcons
            name={expandedSections.privacy ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {expandedSections.privacy && (
          <View style={styles.section}>
            <Text style={styles.privacyNote}>
              🔒 Your data is encrypted and stored securely. We never sell your personal information.
            </Text>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
              <MaterialCommunityIcons name="download" size={20} color={colors.blue} />
              <Text style={styles.actionButtonText}>Export My Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleDeleteData}
            >
              <MaterialCommunityIcons name="delete-forever" size={20} color={colors.red} />
              <Text style={[styles.actionButtonText, { color: colors.red }]}>
                Delete All My Data
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.warningButton]}
              onPress={handleDeactivateAccount}
            >
              <MaterialCommunityIcons name="account-off" size={20} color={colors.yellow} />
              <Text style={[styles.actionButtonText, { color: colors.yellow }]}>
                Deactivate Account
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 7. ACCOUNT & SECURITY */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account & Security</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.orange} />
            <Text style={[styles.actionButtonText, { color: colors.orange }]}>Logout</Text>
          </TouchableOpacity>

          <View style={styles.memberSince}>
            <Text style={styles.memberSinceText}>
              Member since {stats?.memberSince ? new Date(stats.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModal.visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editModal.title}</Text>
              <TouchableOpacity onPress={() => setEditModal({ ...editModal, visible: false })}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {editModal.type === 'select' && editModal.options ? (
                <View style={styles.optionsContainer}>
                  {editModal.options.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        editModal.value === option.value && styles.optionButtonSelected,
                      ]}
                      onPress={() => setEditModal({ ...editModal, value: option.value })}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          editModal.value === option.value && styles.optionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={styles.modalInput}
                  placeholder={`Enter ${editModal.title.toLowerCase()}`}
                  placeholderTextColor={colors.textTertiary}
                  value={editModal.value}
                  onChangeText={(text) => setEditModal({ ...editModal, value: text })}
                  keyboardType={editModal.type === 'number' ? 'numeric' : 'default'}
                  autoFocus
                />
              )}

              <TouchableOpacity style={styles.saveButton} onPress={saveProfileField}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Profile Row Component
const ProfileRow = ({
  icon,
  label,
  value,
  onPress,
  editable = true,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
  editable?: boolean;
}) => (
  <TouchableOpacity
    style={styles.profileRow}
    onPress={onPress}
    disabled={!editable}
    activeOpacity={editable ? 0.7 : 1}
  >
    <View style={styles.profileRowLeft}>
      <MaterialCommunityIcons name={icon as any} size={20} color={colors.textSecondary} />
      <Text style={styles.profileRowLabel}>{label}</Text>
    </View>
    <View style={styles.profileRowRight}>
      <Text style={styles.profileRowValue}>{value}</Text>
      {editable && <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />}
    </View>
  </TouchableOpacity>
);

// Stat Card Component
const StatCard = ({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) => (
  <View style={styles.statCard}>
    <MaterialCommunityIcons name={icon as any} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.textSecondary, marginTop: 12, fontSize: 14 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  
  scrollView: { flex: 1 },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    marginTop: 2,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  
  section: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingBottom: 16 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginBottom: 12, marginTop: 16 },
  
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  profileRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileRowLabel: { fontSize: 15, color: colors.textSecondary },
  profileRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileRowValue: { fontSize: 15, color: colors.text, fontWeight: '500' },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  
  bmiCard: {
    backgroundColor: colors.background,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  bmiLabel: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  bmiValue: { fontSize: 36, fontWeight: 'bold', color: colors.text },
  bmiCategory: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  bmiCategoryText: { fontSize: 14, fontWeight: '600' },
  
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  achievementInfo: { marginLeft: 16 },
  achievementValue: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  achievementLabel: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  
  privacyNote: {
    fontSize: 13,
    color: colors.textSecondary,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    lineHeight: 20,
  },
  
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonText: { fontSize: 15, fontWeight: '500', color: colors.text },
  dangerButton: { borderWidth: 1, borderColor: colors.red },
  warningButton: { borderWidth: 1, borderColor: colors.yellow },
  
  memberSince: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  memberSinceText: { fontSize: 13, color: colors.textTertiary },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  modalBody: { padding: 20 },
  modalInput: {
    backgroundColor: colors.background,
    color: colors.text,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    marginBottom: 20,
  },
  
  optionsContainer: { marginBottom: 20 },
  optionButton: {
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    marginBottom: 12,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  optionText: { fontSize: 15, color: colors.textSecondary },
  optionTextSelected: { color: colors.primary, fontWeight: '600' },
  
  saveButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 16, fontWeight: 'bold', color: colors.background },
});

export default ProfileScreen;
