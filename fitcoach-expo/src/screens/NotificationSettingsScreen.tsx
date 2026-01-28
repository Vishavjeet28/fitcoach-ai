import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSmartNotifications } from '../hooks/useSmartNotifications';
import { NotificationPreferences } from '../services/smartNotificationService';

// ============================================================================
// THEME
// ============================================================================

const THEME = {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#26D9BB',
    secondary: '#8B5CF6',
    accent: '#FF6B6B',
    text: '#1A1A2E',
    textDim: '#6B7280',
    textLight: '#9CA3AF',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
};

// ============================================================================
// DAY PICKER COMPONENT
// ============================================================================

const DayPicker: React.FC<{
    selectedDays: number[];
    onChange: (days: number[]) => void;
}> = ({ selectedDays, onChange }) => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const toggleDay = (dayIndex: number) => {
        if (selectedDays.includes(dayIndex)) {
            onChange(selectedDays.filter(d => d !== dayIndex));
        } else {
            onChange([...selectedDays, dayIndex].sort());
        }
    };

    return (
        <View style={styles.dayPickerContainer}>
            {days.map((day, index) => (
                <TouchableOpacity
                    key={index}
                    style={[
                        styles.dayButton,
                        selectedDays.includes(index) && styles.dayButtonSelected,
                    ]}
                    onPress={() => toggleDay(index)}
                >
                    <Text
                        style={[
                            styles.dayButtonText,
                            selectedDays.includes(index) && styles.dayButtonTextSelected,
                        ]}
                    >
                        {day}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

// ============================================================================
// TIME PICKER ROW COMPONENT
// ============================================================================

const TimePickerRow: React.FC<{
    label: string;
    value: string;
    onTimeChange: (time: string) => void;
}> = ({ label, value, onTimeChange }) => {
    const [showPicker, setShowPicker] = useState(false);

    const parseTime = (timeString: string): Date => {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const formatTime = (date: Date): string => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const displayTime = (timeString: string): string => {
        const [hours, minutes] = timeString.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    return (
        <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>{label}</Text>
            <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowPicker(true)}
            >
                <Text style={styles.timeButtonText}>{displayTime(value)}</Text>
                <MaterialCommunityIcons name="clock-outline" size={18} color={THEME.primary} />
            </TouchableOpacity>

            {showPicker && (
                <DateTimePicker
                    value={parseTime(value)}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                        setShowPicker(Platform.OS === 'ios');
                        if (selectedDate) {
                            onTimeChange(formatTime(selectedDate));
                        }
                    }}
                />
            )}
        </View>
    );
};

// ============================================================================
// SETTING ROW COMPONENT
// ============================================================================

const SettingRow: React.FC<{
    icon: string;
    iconColor?: string;
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
}> = ({ icon, iconColor = THEME.primary, title, subtitle, value, onValueChange, disabled }) => (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
        <View style={[styles.settingIcon, { backgroundColor: iconColor + '15' }]}>
            <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
        </View>
        <View style={styles.settingContent}>
            <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>{title}</Text>
            {subtitle && (
                <Text style={styles.settingSubtitle}>{subtitle}</Text>
            )}
        </View>
        <Switch
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
            trackColor={{ false: THEME.border, true: THEME.primary + '60' }}
            thumbColor={value ? THEME.primary : '#F4F4F5'}
            ios_backgroundColor={THEME.border}
        />
    </View>
);

// ============================================================================
// MAIN SCREEN
// ============================================================================

const NotificationSettingsScreen: React.FC = () => {
    const navigation = useNavigation();
    const {
        isLoading,
        preferences,
        hasPermissions,
        updatePreference,
        toggleNotifications,
        requestPermissions,
    } = useSmartNotifications();

    const [isSaving, setIsSaving] = useState(false);

    // Request permissions if not granted
    useEffect(() => {
        if (!hasPermissions) {
            requestPermissions();
        }
    }, [hasPermissions]);

    const handleToggleNotifications = async (enabled: boolean) => {
        setIsSaving(true);
        await toggleNotifications(enabled);
        setIsSaving(false);
    };

    const handleUpdatePreference = async <K extends keyof NotificationPreferences>(
        key: K,
        value: NotificationPreferences[K]
    ) => {
        setIsSaving(true);
        await updatePreference(key, value);
        setIsSaving(false);
    };

    if (isLoading || !preferences) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.primary} />
                <Text style={styles.loadingText}>Loading preferences...</Text>
            </View>
        );
    }

    const notificationsEnabled = preferences.notifications_enabled;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <MaterialCommunityIcons name="arrow-left" size={24} color={THEME.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {isSaving && (
                    <ActivityIndicator size="small" color={THEME.primary} style={styles.savingIndicator} />
                )}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Permissions Warning */}
                {!hasPermissions && (
                    <TouchableOpacity
                        style={styles.permissionsBanner}
                        onPress={requestPermissions}
                    >
                        <MaterialCommunityIcons name="bell-off" size={24} color="#FFF" />
                        <View style={styles.permissionsBannerContent}>
                            <Text style={styles.permissionsBannerTitle}>Notifications Disabled</Text>
                            <Text style={styles.permissionsBannerText}>
                                Tap to enable notifications in settings
                            </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#FFF" />
                    </TouchableOpacity>
                )}

                {/* Master Toggle */}
                <View style={styles.masterToggleCard}>
                    <View style={styles.masterToggleIcon}>
                        <MaterialCommunityIcons
                            name={notificationsEnabled ? 'bell-ring' : 'bell-off'}
                            size={32}
                            color={notificationsEnabled ? THEME.primary : THEME.textDim}
                        />
                    </View>
                    <View style={styles.masterToggleContent}>
                        <Text style={styles.masterToggleTitle}>
                            {notificationsEnabled ? 'Notifications Active' : 'Notifications Paused'}
                        </Text>
                        <Text style={styles.masterToggleSubtitle}>
                            {notificationsEnabled
                                ? 'Get smart reminders and motivation'
                                : 'You won\'t receive any notifications'}
                        </Text>
                    </View>
                    <Switch
                        value={notificationsEnabled}
                        onValueChange={handleToggleNotifications}
                        trackColor={{ false: THEME.border, true: THEME.primary + '60' }}
                        thumbColor={notificationsEnabled ? THEME.primary : '#F4F4F5'}
                        ios_backgroundColor={THEME.border}
                    />
                </View>

                {/* Notification Categories */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>NOTIFICATION TYPES</Text>
                    <View style={styles.card}>
                        <SettingRow
                            icon="food-apple"
                            iconColor="#10B981"
                            title="Meal Reminders"
                            subtitle="Get reminded to log meals"
                            value={preferences.meal_reminders}
                            onValueChange={(v) => handleUpdatePreference('meal_reminders', v)}
                            disabled={!notificationsEnabled}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="water"
                            iconColor="#3B82F6"
                            title="Hydration Reminders"
                            subtitle="Stay on top of your water intake"
                            value={preferences.water_reminders}
                            onValueChange={(v) => handleUpdatePreference('water_reminders', v)}
                            disabled={!notificationsEnabled}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="dumbbell"
                            iconColor={THEME.secondary}
                            title="Workout Reminders"
                            subtitle="Never miss a scheduled workout"
                            value={preferences.workout_reminders}
                            onValueChange={(v) => handleUpdatePreference('workout_reminders', v)}
                            disabled={!notificationsEnabled}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="timer"
                            iconColor="#F59E0B"
                            title="Live Workout Alerts"
                            subtitle="Rest timers and exercise cues"
                            value={preferences.live_workout_alerts}
                            onValueChange={(v) => handleUpdatePreference('live_workout_alerts', v)}
                            disabled={!notificationsEnabled}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="fire"
                            iconColor="#EF4444"
                            title="Streak Alerts"
                            subtitle="Protect your active streak"
                            value={preferences.streak_alerts}
                            onValueChange={(v) => handleUpdatePreference('streak_alerts', v)}
                            disabled={!notificationsEnabled}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="chart-line"
                            iconColor="#14B8A6"
                            title="Progress Updates"
                            subtitle="Weekly and monthly summaries"
                            value={preferences.progress_notifications}
                            onValueChange={(v) => handleUpdatePreference('progress_notifications', v)}
                            disabled={!notificationsEnabled}
                        />
                        <View style={styles.divider} />
                        <SettingRow
                            icon="lightbulb-on"
                            iconColor="#FBBF24"
                            title="Daily Tips"
                            subtitle="One motivational tip per day"
                            value={preferences.motivation_tips}
                            onValueChange={(v) => handleUpdatePreference('motivation_tips', v)}
                            disabled={!notificationsEnabled}
                        />
                    </View>
                </View>

                {/* Workout Schedule */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>WORKOUT SCHEDULE</Text>
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Preferred Workout Time</Text>
                        <TimePickerRow
                            label="Remind me at"
                            value={preferences.preferred_workout_time || '18:00'}
                            onTimeChange={(time) => handleUpdatePreference('preferred_workout_time', time)}
                        />

                        <Text style={[styles.cardLabel, { marginTop: 20 }]}>Workout Days</Text>
                        <DayPicker
                            selectedDays={preferences.workout_days || [1, 2, 3, 4, 5]}
                            onChange={(days) => handleUpdatePreference('workout_days', days)}
                        />
                    </View>
                </View>

                {/* Quiet Hours */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>QUIET HOURS</Text>
                    <View style={styles.card}>
                        <SettingRow
                            icon="moon-waning-crescent"
                            iconColor="#6366F1"
                            title="Quiet Hours"
                            subtitle="Pause notifications during sleep"
                            value={preferences.quiet_hours_enabled}
                            onValueChange={(v) => handleUpdatePreference('quiet_hours_enabled', v)}
                            disabled={!notificationsEnabled}
                        />

                        {preferences.quiet_hours_enabled && (
                            <>
                                <View style={styles.divider} />
                                <TimePickerRow
                                    label="Start"
                                    value={preferences.quiet_hours_start || '22:00'}
                                    onTimeChange={(time) => handleUpdatePreference('quiet_hours_start', time)}
                                />
                                <TimePickerRow
                                    label="End"
                                    value={preferences.quiet_hours_end || '07:00'}
                                    onTimeChange={(time) => handleUpdatePreference('quiet_hours_end', time)}
                                />
                            </>
                        )}
                    </View>
                </View>

                {/* Meal Windows */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>MEAL REMINDER WINDOWS</Text>
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Breakfast Window</Text>
                        <View style={styles.windowRow}>
                            <TimePickerRow
                                label="From"
                                value={preferences.breakfast_window_start || '07:00'}
                                onTimeChange={(time) => handleUpdatePreference('breakfast_window_start', time)}
                            />
                            <TimePickerRow
                                label="To"
                                value={preferences.breakfast_window_end || '10:00'}
                                onTimeChange={(time) => handleUpdatePreference('breakfast_window_end', time)}
                            />
                        </View>

                        <Text style={[styles.cardLabel, { marginTop: 16 }]}>Lunch Window</Text>
                        <View style={styles.windowRow}>
                            <TimePickerRow
                                label="From"
                                value={preferences.lunch_window_start || '12:00'}
                                onTimeChange={(time) => handleUpdatePreference('lunch_window_start', time)}
                            />
                            <TimePickerRow
                                label="To"
                                value={preferences.lunch_window_end || '14:00'}
                                onTimeChange={(time) => handleUpdatePreference('lunch_window_end', time)}
                            />
                        </View>

                        <Text style={[styles.cardLabel, { marginTop: 16 }]}>Dinner Window</Text>
                        <View style={styles.windowRow}>
                            <TimePickerRow
                                label="From"
                                value={preferences.dinner_window_start || '18:00'}
                                onTimeChange={(time) => handleUpdatePreference('dinner_window_start', time)}
                            />
                            <TimePickerRow
                                label="To"
                                value={preferences.dinner_window_end || '21:00'}
                                onTimeChange={(time) => handleUpdatePreference('dinner_window_end', time)}
                            />
                        </View>
                    </View>
                </View>

                {/* Frequency Control */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>FREQUENCY</Text>
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Max notifications per day</Text>
                        <Text style={styles.cardSubtext}>(excluding live workout alerts)</Text>
                        <View style={styles.frequencyButtons}>
                            {[2, 3, 5, 7].map((num) => (
                                <TouchableOpacity
                                    key={num}
                                    style={[
                                        styles.frequencyButton,
                                        preferences.max_notifications_per_day === num && styles.frequencyButtonSelected,
                                    ]}
                                    onPress={() => handleUpdatePreference('max_notifications_per_day', num)}
                                >
                                    <Text
                                        style={[
                                            styles.frequencyButtonText,
                                            preferences.max_notifications_per_day === num && styles.frequencyButtonTextSelected,
                                        ]}
                                    >
                                        {num}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <MaterialCommunityIcons name="information" size={20} color={THEME.primary} />
                    <Text style={styles.infoText}>
                        Smart notifications only trigger when needed based on your activity.
                        We never spam — only helpful reminders!
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: THEME.background,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: THEME.textDim,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: THEME.surface,
        borderBottomWidth: 1,
        borderBottomColor: THEME.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: THEME.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: THEME.text,
        textAlign: 'center',
        marginRight: 40,
    },
    savingIndicator: {
        position: 'absolute',
        right: 20,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    permissionsBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.accent,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    permissionsBannerContent: {
        flex: 1,
        marginLeft: 12,
    },
    permissionsBannerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    permissionsBannerText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    masterToggleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    masterToggleIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: THEME.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    masterToggleContent: {
        flex: 1,
        marginLeft: 16,
    },
    masterToggleTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: THEME.text,
    },
    masterToggleSubtitle: {
        fontSize: 14,
        color: THEME.textDim,
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: THEME.textLight,
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        backgroundColor: THEME.surface,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    cardLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME.text,
        marginBottom: 12,
    },
    cardSubtext: {
        fontSize: 12,
        color: THEME.textDim,
        marginTop: -8,
        marginBottom: 12,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    settingRowDisabled: {
        opacity: 0.5,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingContent: {
        flex: 1,
        marginLeft: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME.text,
    },
    settingTitleDisabled: {
        color: THEME.textDim,
    },
    settingSubtitle: {
        fontSize: 13,
        color: THEME.textDim,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: THEME.border,
        marginVertical: 8,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    timeLabel: {
        fontSize: 14,
        color: THEME.textDim,
    },
    timeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.primary + '10',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    timeButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: THEME.primary,
    },
    windowRow: {
        gap: 8,
    },
    dayPickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    dayButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: THEME.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: THEME.border,
    },
    dayButtonSelected: {
        backgroundColor: THEME.primary,
        borderColor: THEME.primary,
    },
    dayButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME.textDim,
    },
    dayButtonTextSelected: {
        color: '#FFF',
    },
    frequencyButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    frequencyButton: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        backgroundColor: THEME.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: THEME.border,
    },
    frequencyButtonSelected: {
        backgroundColor: THEME.primary,
        borderColor: THEME.primary,
    },
    frequencyButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: THEME.textDim,
    },
    frequencyButtonTextSelected: {
        color: '#FFF',
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: THEME.primary + '10',
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: THEME.text,
        lineHeight: 20,
    },
});

export default NotificationSettingsScreen;
