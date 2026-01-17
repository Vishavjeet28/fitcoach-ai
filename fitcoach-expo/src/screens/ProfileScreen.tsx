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
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  userAPI,
  authAPI,
  analyticsAPI,
  fitnessAPI,
  billingAPI,
  handleAPIError,
  UserProfile,
  UserStats,
  ProgressOverview
} from '../services/api';

// New Light Theme Logic
const theme = {
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  primary: '#26d9bb', // Teal
  textMain: '#1e293b', // Slate 800
  textSub: '#64748b',   // Slate 500
  border: '#e2e8f0',
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#FBBF24',
  green: '#10B981',
  blue: '#3B82F6',
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
  const navigation = useNavigation<any>();
  const { logout, user: authUser } = useAuth();

  // Profile data
  const [profile, setProfile] = useState<UserProfile | null>(authUser);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [progress, setProgress] = useState<ProgressOverview | null>(null);
  const [fitnessTargets, setFitnessTargets] = useState<{
    bmr?: number;
    tdee?: number;
    calorie_target?: number;
    protein_target_g?: number;
    carb_target_g?: number;
    fat_target_g?: number;
  } | null>(null);
  const [aiUsage, setAiUsage] = useState<{
    tier: string;
    remaining: number;
    limit: number;
  } | null>(null);
  const [loading, setLoading] = useState(!authUser);
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
    goals: true,
    health: false,
    achievements: false,
    privacy: false,
  });

  // Fetch all profile data
  const fetchProfileData = async () => {
    // Check for Guest Mode
    if (authUser?.email === 'guest@fitcoach.ai') {
      console.log('👤 [PROFILE] Guest mode detected - simulating API data for Demo');

      setFitnessTargets({
        bmr: 1650,
        tdee: 2350,
        calorie_target: 2000,
        protein_target_g: 150,
        carb_target_g: 225,
        fat_target_g: 65,
      });

      setAiUsage({
        tier: 'guest',
        remaining: 5,
        limit: 5
      });

      setLoading(false);
      return;
    }

    try {
      const [profileData, statsData, progressData, fitnessData, billingData] = await Promise.all([
        userAPI.getProfile(),
        userAPI.getStats(),
        analyticsAPI.getProgress(),
        fitnessAPI.getTargets().catch(() => null),
        billingAPI.getAIUsage().catch(() => null),
      ]);

      setProfile(profileData);
      setStats(statsData);
      setProgress(progressData);

      if (fitnessData?.targets) {
        setFitnessTargets(fitnessData.targets);
      }

      if (billingData) {
        setAiUsage({
          tier: billingData.tier,
          remaining: billingData.remaining,
          limit: billingData.limit,
        });
      }
    } catch (error: any) {
      if (error?.code !== 'SESSION_EXPIRED') {
        if (loading || refreshing) {
          Alert.alert('Error', handleAPIError(error));
        } else {
          console.warn('[Profile] Background refresh failed:', error);
        }
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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

  const saveProfileField = async () => {
    try {
      const updateData: any = {};
      const value = editModal.type === 'number' ? parseFloat(editModal.value) : editModal.value;

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
              const jsonString = JSON.stringify(exportData, null, 2);
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
            Alert.prompt(
              'Final Confirmation',
              'Type "DELETE_MY_DATA" to confirm permanent deletion:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async (confirmation?: string) => {
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

  const calculateBMI = (): number | null => {
    if (profile?.weight && profile?.height) {
      const heightInMeters = profile.height / 100;
      return profile.weight / (heightInMeters * heightInMeters);
    }
    return null;
  };

  const getBMICategory = (bmi: number): { label: string; color: string } => {
    if (bmi < 18.5) return { label: 'Underweight', color: theme.blue };
    if (bmi < 25) return { label: 'Normal', color: theme.green };
    if (bmi < 30) return { label: 'Overweight', color: theme.yellow };
    return { label: 'Obese', color: theme.red };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const bmi = calculateBMI();
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.iconBtn}>
          <MaterialCommunityIcons name="refresh" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <MaterialCommunityIcons name="account" size={36} color="white" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{profile?.email}</Text>
          </View>
          <View style={styles.planBadge}>
            <Text style={styles.planText}>{profile?.subscriptionStatus ? profile.subscriptionStatus.toUpperCase() : 'FREE'}</Text>
          </View>
        </View>

        {/* 1. IDENTITY SECTION */}
        <Section title="Identity" icon="account-circle" isExpanded={expandedSections.identity} onToggle={() => toggleSection('identity')}>
          <ProfileRow
            icon="account"
            label="Name"
            value={profile?.name || 'Not set'}
            onPress={() => openEditModal('Edit Name', 'name', profile?.name, 'text')}
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
        </Section>

        {/* 2. PROGRESS SNAPSHOT */}
        <Section title="Progress Snapshot" icon="chart-line" isExpanded={expandedSections.progress} onToggle={() => toggleSection('progress')}>
          <View style={styles.statsGrid}>
            <StatCard
              icon="weight"
              label="Weight"
              value={profile?.weight ? `${profile.weight} kg` : '-'}
              color={theme.blue}
            />
            <StatCard
              icon="fire"
              label="Streak"
              value={progress?.currentStreak ? `${progress.currentStreak}` : '0'}
              color={theme.orange}
            />
            <StatCard
              icon="calendar-check"
              label="Days"
              value={`${progress?.totalDaysTracked || 0}`}
              color={theme.green}
            />
          </View>
        </Section>

        {/* 3. GOALS & TARGETS */}
        <Section title="Goals & Targets" icon="bullseye-arrow" isExpanded={expandedSections.goals} onToggle={() => toggleSection('goals')}>
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
            label="Calorie Target"
            value={profile?.calorieTarget ? `${profile.calorieTarget} kcal` : 'Not set'}
            onPress={() => openEditModal('Set Calorie Target', 'calorieTarget', profile?.calorieTarget, 'number')}
          />
          <ProfileRow
            icon="run"
            label="Activity Level"
            value={profile?.activityLevel || 'Not set'}
            onPress={() => openEditModal('Set Activity Level', 'activityLevel', profile?.activityLevel, 'select', [
              { label: 'Sedentary', value: 'sedentary' },
              { label: 'Lightly Active', value: 'lightly_active' },
              { label: 'Moderately Active', value: 'moderately_active' },
              { label: 'Very Active', value: 'very_active' },
            ])}
          />

          {/* FLE-Calculated Targets */}
          {fitnessTargets && (
            <View style={styles.fleCard}>
              <Text style={styles.fleTitle}>🔥 Calculated Metabolism</Text>
              <View style={styles.fleRow}>
                <View style={styles.fleItem}>
                  <Text style={styles.fleLabel}>BMR</Text>
                  <Text style={styles.fleValue}>{fitnessTargets.bmr || '-'} <Text style={{ fontSize: 12, fontWeight: '400' }}>kcal</Text></Text>
                </View>
                <View style={styles.fleItem}>
                  <Text style={styles.fleLabel}>TDEE</Text>
                  <Text style={styles.fleValue}>{fitnessTargets.tdee || '-'} <Text style={{ fontSize: 12, fontWeight: '400' }}>kcal</Text></Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={[styles.fleRow, { paddingTop: 12 }]}>
                <View style={styles.fleItem}>
                  <Text style={[styles.fleValue, { color: theme.green }]}>{fitnessTargets.protein_target_g || '-'}</Text>
                  <Text style={styles.fleLabel}>Protein (g)</Text>
                </View>
                <View style={styles.fleItem}>
                  <Text style={[styles.fleValue, { color: theme.yellow }]}>{fitnessTargets.carb_target_g || '-'}</Text>
                  <Text style={styles.fleLabel}>Carbs (g)</Text>
                </View>
                <View style={styles.fleItem}>
                  <Text style={[styles.fleValue, { color: theme.orange }]}>{fitnessTargets.fat_target_g || '-'}</Text>
                  <Text style={styles.fleLabel}>Fat (g)</Text>
                </View>
              </View>
            </View>
          )}
        </Section>

        {/* 4. HEALTH SNAPSHOT */}
        <Section title="Health Snapshot" icon="heart-pulse" isExpanded={expandedSections.health} onToggle={() => toggleSection('health')}>
          {bmi && bmiCategory && (
            <View style={styles.bmiCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.bmiLabel}>BMI Score</Text>
                <View style={[styles.bmiCategory, { backgroundColor: bmiCategory.color }]}>
                  <Text style={styles.bmiCategoryText}>{bmiCategory.label}</Text>
                </View>
              </View>
              <Text style={styles.bmiValue}>{bmi.toFixed(1)}</Text>
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
        </Section>

        {/* 5. DATA & PRIVACY */}
        <Section title="Data & Privacy" icon="shield-check" isExpanded={expandedSections.privacy} onToggle={() => toggleSection('privacy')}>
          <TouchableOpacity style={styles.actionRow} onPress={handleExportData}>
            <MaterialCommunityIcons name="download" size={24} color={theme.blue} />
            <Text style={styles.actionRowText}>Export My Data</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSub} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={handleDeleteData}>
            <MaterialCommunityIcons name="delete-forever" size={24} color={theme.red} />
            <Text style={[styles.actionRowText, { color: theme.red }]}>Delete All Data</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSub} />
          </TouchableOpacity>
        </Section>

        {/* 6. ACCOUNT */}
        <View style={[styles.sectionContainer, { marginTop: 8 }]}>
          <Text style={styles.sectionHeaderTitle}>Account</Text>

          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('History')}>
            <MaterialCommunityIcons name="history" size={24} color={theme.textMain} />
            <Text style={styles.actionRowText}>View Log History</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSub} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={24} color={theme.orange} />
            <Text style={[styles.actionRowText, { color: theme.orange }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Member since {stats?.memberSince ? new Date(stats.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
          </Text>
        </View>

      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModal.visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editModal.title}</Text>
              <TouchableOpacity onPress={() => setEditModal({ ...editModal, visible: false })}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textMain} />
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
                  placeholder={`Enter ${editModal.field}`}
                  placeholderTextColor={theme.textSub}
                  value={editModal.value}
                  onChangeText={(text) => setEditModal({ ...editModal, value: text })}
                  keyboardType={editModal.type === 'number' ? 'numeric' : 'default'}
                  autoFocus
                />
              )}

              <TouchableOpacity style={styles.saveButton} onPress={saveProfileField}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Helper Components
const Section = ({ title, icon, isExpanded, onToggle, children }: any) => (
  <View style={styles.sectionContainer}>
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name={icon} size={20} color={theme.primary} />
        </View>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
      </View>
      <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color={theme.textSub} />
    </TouchableOpacity>
    {isExpanded && <View style={styles.sectionBody}>{children}</View>}
  </View>
);

const ProfileRow = ({ icon, label, value, onPress, editable = true }: any) => (
  <TouchableOpacity
    style={styles.row}
    onPress={editable ? onPress : undefined}
    activeOpacity={editable ? 0.7 : 1}
  >
    <View style={styles.rowLeft}>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    <View style={styles.rowRight}>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      {editable && <MaterialCommunityIcons name="chevron-right" size={18} color={theme.textSub} />}
    </View>
  </TouchableOpacity>
);

const StatCard = ({ icon, label, value, color }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bg,
  },
  loadingText: {
    marginTop: 12,
    color: theme.textSub,
    fontSize: 16,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.textMain,
    letterSpacing: -0.5
  },
  iconBtn: {
    padding: 8,
    backgroundColor: theme.surface,
    borderRadius: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6
  },
  avatarContainer: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 4
  },
  userEmail: {
    fontSize: 14, color: 'rgba(255,255,255,0.8)'
  },
  planBadge: {
    backgroundColor: 'white',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12
  },
  planText: {
    fontSize: 10, fontWeight: 'bold', color: theme.primary
  },

  // Sections
  sectionContainer: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${theme.primary}15`,
    justifyContent: 'center', alignItems: 'center'
  },
  sectionHeaderTitle: {
    fontSize: 16, fontWeight: '700', color: theme.textMain
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },

  // Rows
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.border
  },
  rowLeft: {
    flexDirection: 'row', alignItems: 'center'
  },
  rowLabel: {
    fontSize: 15, color: theme.textSub, fontWeight: '500'
  },
  rowRight: {
    flexDirection: 'row', alignItems: 'center', gap: 4
  },
  rowValue: {
    fontSize: 15, color: theme.textMain, fontWeight: '600'
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row', gap: 12, justifyContent: 'space-between'
  },
  statCard: {
    flex: 1, backgroundColor: theme.bg, borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center'
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8
  },
  statValue: {
    fontSize: 16, fontWeight: 'bold', color: theme.textMain
  },
  statLabel: {
    fontSize: 11, color: theme.textSub, marginTop: 2
  },

  // FLE Card
  fleCard: {
    marginTop: 16,
    backgroundColor: `${theme.primary}10`,
    borderRadius: 16,
    padding: 16
  },
  fleTitle: {
    fontSize: 14, fontWeight: 'bold', color: theme.primary, marginBottom: 12
  },
  fleRow: {
    flexDirection: 'row', justifyContent: 'space-between'
  },
  fleItem: {
    alignItems: 'center', flex: 1
  },
  fleLabel: {
    fontSize: 12, color: theme.textSub, marginTop: 4
  },
  fleValue: {
    fontSize: 18, fontWeight: '700', color: theme.textMain
  },
  divider: {
    height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 12
  },

  // BMI
  bmiCard: {
    backgroundColor: theme.bg, borderRadius: 16, padding: 16, marginBottom: 12
  },
  bmiLabel: {
    fontSize: 14, color: theme.textSub, fontWeight: '500'
  },
  bmiValue: {
    fontSize: 28, fontWeight: '800', color: theme.textMain, marginTop: 4
  },
  bmiCategory: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10
  },
  bmiCategoryText: {
    fontSize: 12, fontWeight: 'bold', color: 'white'
  },

  // Action Rows (Account)
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1, borderBottomColor: theme.border,
    backgroundColor: theme.surface
  },
  actionRowText: {
    flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '500', color: theme.textMain
  },
  footer: {
    alignItems: 'center', marginBottom: 30
  },
  footerText: {
    fontSize: 13, color: theme.textSub
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20
  },
  modalTitle: {
    fontSize: 20, fontWeight: 'bold', color: theme.textMain
  },
  modalBody: {
    gap: 16
  },
  modalInput: {
    backgroundColor: theme.bg,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: theme.textMain,
    borderWidth: 1, borderColor: theme.border
  },
  saveButton: {
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  saveButtonText: {
    color: 'white', fontWeight: 'bold', fontSize: 16
  },
  optionsContainer: {
    gap: 8
  },
  optionButton: {
    padding: 16,
    backgroundColor: theme.bg,
    borderRadius: 12,
    borderWidth: 1, borderColor: theme.border
  },
  optionButtonSelected: {
    backgroundColor: `${theme.primary}10`,
    borderColor: theme.primary
  },
  optionText: {
    fontSize: 16, color: theme.textMain
  },
  optionTextSelected: {
    color: theme.primary, fontWeight: '600'
  }
});

export default ProfileScreen;
