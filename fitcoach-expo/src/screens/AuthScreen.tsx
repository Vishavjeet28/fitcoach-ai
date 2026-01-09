import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const colors = {
  primary: '#13ec80',
  backgroundDark: '#102219',
  surfaceDark: '#16261f',
  textPrimary: '#ffffff',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  error: '#EF4444',
};

  type Mode = 'login' | 'register';

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function isValidName(name: string) {
    // Name can only contain letters, spaces, hyphens, and apostrophes
    return /^[a-zA-Z\s'-]+$/.test(name.trim());
  }

  export default function AuthScreen() {
    const { login, signup, loginWithGoogle, loginWithApple, continueAsGuest, error, clearError, isLoading } = useAuth();

    const [mode, setMode] = useState<Mode>('login');
    const isLogin = mode === 'login';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const busy = submitting || isLoading;

    const canSubmit = useMemo(() => {
      if (!email.trim() || !password) return false;
      if (!isValidEmail(email)) return false;
      if (password.length < 6) return false;
      if (!isLogin) {
        if (!name.trim()) return false;
        if (!isValidName(name)) return false;
        if (password !== confirmPassword) return false;
      }
      return true;
    }, [email, password, confirmPassword, name, isLogin]);

    const showError = (message: string) => {
      Alert.alert('Authentication', message);
    };

    const handleSubmit = async () => {
      clearError();

      const trimmedEmail = email.trim();
      const trimmedName = name.trim();

      if (!trimmedEmail || !password) return showError('Please enter email and password.');
      if (!isValidEmail(trimmedEmail)) return showError('Please enter a valid email address.');
      if (password.length < 6) return showError('Password must be at least 6 characters.');
      if (!isLogin) {
        if (!trimmedName) return showError('Please enter your name.');
        if (!isValidName(trimmedName)) return showError('Name can only contain letters, spaces, hyphens, and apostrophes.');
        if (password !== confirmPassword) return showError('Passwords do not match.');
      }

      setSubmitting(true);
      try {
        const ok = isLogin
          ? await login(trimmedEmail, password)
          : await signup(trimmedEmail, password, trimmedName);

        if (!ok) {
          showError(error ?? 'Request failed. Please try again.');
        }
      } catch {
        showError('Authentication failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    const handleGuest = async () => {
      clearError();
      setSubmitting(true);
      try {
        await continueAsGuest();
      } catch {
        showError('Failed to continue as guest.');
      } finally {
        setSubmitting(false);
      }
    };

    const toggleMode = () => {
      clearError();
      setMode((m) => (m === 'login' ? 'register' : 'login'));
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    };

    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>FitCoach AI</Text>
            <Text style={styles.title}>{isLogin ? 'Welcome back' : 'Create your account'}</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Sign in to continue your fitness journey.' : 'Register to unlock AI coaching.'}
            </Text>
          </View>

          <View style={styles.card}>
            {!isLogin ? (
              <View style={styles.field}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                  style={styles.input}
                  editable={!busy}
                />
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                editable={!busy}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  secureTextEntry={!showPassword}
                  style={[styles.input, styles.passwordInput]}
                  editable={!busy}
                />
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}
                  accessibilityRole="button"
                  disabled={busy}
                >
                  <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </View>

            {!isLogin ? (
              <View style={styles.field}>
                <Text style={styles.label}>Confirm password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    secureTextEntry={!showConfirmPassword}
                    style={[styles.input, styles.passwordInput]}
                    editable={!busy}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword((s) => !s)}
                    style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}
                    accessibilityRole="button"
                    disabled={busy}
                  >
                    <Text style={styles.eyeText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {!!error ? <Text style={styles.inlineError}>{error}</Text> : null}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit || busy}
              style={({ pressed }) => [
                styles.primaryButton,
                (!canSubmit || busy) && styles.primaryButtonDisabled,
                pressed && canSubmit && !busy && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator color={colors.backgroundDark} />
              ) : (
                <Text style={styles.primaryButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
              )}
            </Pressable>

            <Pressable
              onPress={toggleMode}
              disabled={busy}
              style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.linkTextStrong}>{isLogin ? 'Sign up' : 'Sign in'}</Text>
              </Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            <Pressable
              onPress={async () => {
                setSubmitting(true);
                const success = await loginWithGoogle();
                if (!success && error) {
                  Alert.alert('Google Sign-In', error);
                }
                setSubmitting(false);
              }}
              disabled={busy}
              style={({ pressed }) => [styles.oauthButton, styles.googleButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={[styles.oauthButtonText, { color: '#1F2937' }]}>🔍 Continue with Google</Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                setSubmitting(true);
                const success = await loginWithApple();
                if (!success && error) {
                  Alert.alert('Apple Sign-In', error);
                }
                setSubmitting(false);
              }}
              disabled={busy}
              style={({ pressed }) => [styles.oauthButton, styles.appleButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={[styles.oauthButtonText, { color: '#FFFFFF' }]}>🍎 Continue with Apple</Text>
            </Pressable>

            <Pressable
              onPress={handleGuest}
              disabled={busy}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Continue as Guest</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>By continuing, you agree to our Terms and Privacy Policy.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundDark,
    },
    scroll: {
      paddingHorizontal: 20,
      paddingTop: 80,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 22,
      alignItems: 'center',
    },
    brand: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      marginTop: 10,
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
      lineHeight: 20,
    },
    card: {
      backgroundColor: colors.surfaceDark,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    field: {
      marginBottom: 14,
    },
    label: {
      color: colors.textSecondary,
      marginBottom: 8,
      fontSize: 13,
      fontWeight: '600',
    },
    input: {
      backgroundColor: 'rgba(0,0,0,0.25)',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
      fontSize: 15,
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    passwordInput: {
      flex: 1,
    },
    eyeButton: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.25)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    eyeText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    inlineError: {
      color: colors.error,
      marginBottom: 10,
      fontSize: 13,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    primaryButtonDisabled: {
      opacity: 0.55,
    },
    primaryButtonText: {
      color: colors.backgroundDark,
      fontWeight: '800',
      fontSize: 15,
      letterSpacing: 0.2,
    },
    linkButton: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    linkText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    linkTextStrong: {
      color: colors.primary,
      fontWeight: '700',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: 8,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    dividerText: {
      color: colors.textTertiary,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    secondaryButton: {
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 14,
    },
    oauthButton: {
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
      borderWidth: 1,
    },
    googleButton: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E7EB',
    },
    appleButton: {
      backgroundColor: '#000000',
      borderColor: '#1F2937',
    },
    oauthButtonText: {
      fontWeight: '700',
      fontSize: 14,
    },
    footer: {
      marginTop: 18,
      color: colors.textTertiary,
      textAlign: 'center',
      fontSize: 12,
      lineHeight: 18,
    },
    pressed: {
      opacity: 0.9,
    },
  });