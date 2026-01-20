
import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';

const theme = {
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#26d9bb',
    textMain: '#1e293b',
    textSub: '#64748b',
    border: '#e2e8f0',
    red: '#EF4444',
};

export default function SettingsScreen() {
    const navigation = useNavigation<any>();
    const { user, logout } = useAuth();

    const [notifications, setNotifications] = useState({
        push: true,
        workoutReminders: true,
        mealReminders: false,
        weeklyReport: true
    });

    const [units, setUnits] = useState({
        metric: true, // true = kg/cm, false = lbs/ft
        calories: true // true = kcal, false = kJ
    });

    const [appSettings, setAppSettings] = useState({
        darkMode: false,
        sounds: true,
        haptics: true
    });

    const toggleNotification = (key: keyof typeof notifications) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
        // Ideally update backend here
    };

    const toggleUnit = (key: keyof typeof units) => {
        setUnits(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleAppSetting = (key: keyof typeof appSettings) => {
        setAppSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout }
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert('Delete Account', 'This action is irreversible.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => userAPI.deleteData('DELETE_MY_DATA') }
        ]);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={theme.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Account Section */}
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.row}>
                        <View style={styles.rowLeft}>
                            <MaterialCommunityIcons name="email" size={20} color={theme.primary} />
                            <Text style={styles.rowLabel}>{user?.email}</Text>
                        </View>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{user?.subscriptionStatus || 'Free'}</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Profile')}>
                        <View style={styles.rowLeft}>
                            <MaterialCommunityIcons name="account-edit" size={20} color={theme.primary} />
                            <Text style={styles.rowLabel}>Edit Profile</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textSub} />
                    </TouchableOpacity>
                </View>

                {/* Notifications */}
                <Text style={styles.sectionTitle}>Notifications</Text>
                <View style={styles.card}>
                    <SettingSwitch
                        label="Push Notifications"
                        value={notifications.push}
                        onValueChange={() => toggleNotification('push')}
                    />
                    <SettingSwitch
                        label="Workout Reminders"
                        value={notifications.workoutReminders}
                        onValueChange={() => toggleNotification('workoutReminders')}
                        disabled={!notifications.push}
                    />
                    <SettingSwitch
                        label="Meal Reminders"
                        value={notifications.mealReminders}
                        onValueChange={() => toggleNotification('mealReminders')}
                        disabled={!notifications.push}
                    />
                    <SettingSwitch
                        label="Weekly Report"
                        value={notifications.weeklyReport}
                        onValueChange={() => toggleNotification('weeklyReport')}
                        disabled={!notifications.push}
                    />
                </View>

                {/* Units & Preferences */}
                <Text style={styles.sectionTitle}>Preferences</Text>
                <View style={styles.card}>
                    <SettingSwitch
                        label="Use Metric System (kg/cm)"
                        value={units.metric}
                        onValueChange={() => toggleUnit('metric')}
                    />
                    <SettingSwitch
                        label="Dark Mode"
                        value={appSettings.darkMode}
                        onValueChange={() => toggleAppSetting('darkMode')}
                    />
                    <SettingSwitch
                        label="Sound Effects"
                        value={appSettings.sounds}
                        onValueChange={() => toggleAppSetting('sounds')}
                    />
                    <SettingSwitch
                        label="Haptic Feedback"
                        value={appSettings.haptics}
                        onValueChange={() => toggleAppSetting('haptics')}
                    />
                </View>

                {/* Support */}
                <Text style={styles.sectionTitle}>Support</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.row} onPress={() => Alert.alert('Help Center', 'Opening Help Center...')}>
                        <Text style={styles.rowLabel}>Help Center</Text>
                        <MaterialCommunityIcons name="open-in-new" size={18} color={theme.textSub} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.row} onPress={() => Alert.alert('Privacy Policy', 'Opening Privacy Policy...')}>
                        <Text style={styles.rowLabel}>Privacy Policy</Text>
                        <MaterialCommunityIcons name="shield-check" size={18} color={theme.textSub} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.row} onPress={handleLogout}>
                        <Text style={[styles.rowLabel, { color: theme.red }]}>Log Out</Text>
                        <MaterialCommunityIcons name="logout" size={18} color={theme.red} />
                    </TouchableOpacity>
                </View>

                {/* Danger Zone */}
                <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
                    <Text style={styles.dangerButtonText}>Delete Account</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.2.0 • Build 2405</Text>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const SettingSwitch = ({ label, value, onValueChange, disabled = false }: any) => (
    <View style={[styles.row, disabled && { opacity: 0.5 }]}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Switch
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={'white'}
        />
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    header: {
        paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.textMain },
    backBtn: { padding: 8, marginLeft: -8 },
    content: { padding: 20 },
    sectionTitle: {
        fontSize: 14, fontWeight: 'bold', color: theme.textSub,
        marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5
    },
    card: {
        backgroundColor: theme.surface, borderRadius: 12, overflow: 'hidden',
        borderWidth: 1, borderColor: theme.border
    },
    row: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowLabel: { fontSize: 15, color: theme.textMain, fontWeight: '500' },
    badge: { backgroundColor: theme.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    badgeText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
    dangerButton: { marginTop: 32, alignItems: 'center', padding: 16 },
    dangerButtonText: { color: theme.red, fontWeight: 'bold' },
    versionText: { textAlign: 'center', color: theme.textSub, fontSize: 12, marginTop: 8 }
});
