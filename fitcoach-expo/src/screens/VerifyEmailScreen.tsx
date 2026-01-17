import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { auth } from '../config/firebase';
import { User, sendEmailVerification, reload } from 'firebase/auth';

const colors = {
  primary: '#13ec80',
  backgroundDark: '#102219',
  surfaceDark: '#16261f',
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
};

export default function VerifyEmailScreen() {
  const { logout, authStatus } = useAuth();
  const [checking, setChecking] = useState(false);
  const [mins, setMins] = useState(0); // For cooldown if needed

  const handleResend = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert('Sent', 'Verification email resent. Please check your inbox.');
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        Alert.alert('Please Wait', 'You have sent too many requests. Please wait a moment.');
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  const handleRefresh = async () => {
    if (!auth.currentUser) return;
    setChecking(true);
    try {
      await reload(auth.currentUser);
      // The AuthContext onAuthStateChanged listener will pick up the change
      // if emailVerified becomes true.
      if (auth.currentUser.emailVerified) {
        Alert.alert('Success', 'Email verified! Logging you in...');
      } else {
        Alert.alert('Not Verified', 'Your email is not verified yet. Please check your inbox.');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to refresh status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>📧</Text>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.description}>
          We have sent a verification email to:
        </Text>
        <Text style={styles.email}>{auth.currentUser?.email}</Text>
        
        <Text style={styles.instructions}>
          Please check your inbox and click the link to verify your account. 
          Then come back here and tap "I've Verified".
        </Text>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleRefresh}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryButtonText}>I've Verified</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleResend}>
          <Text style={styles.secondaryButtonText}>Resend Email</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.textButton} onPress={logout}>
          <Text style={styles.textButtonText}>Sign Out / Change Email</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: colors.surfaceDark,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.textSecondary,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  textButton: {
    padding: 8,
  },
  textButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  }
});
