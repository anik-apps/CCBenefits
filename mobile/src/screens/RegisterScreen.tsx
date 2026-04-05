import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import {
  GoogleSignin, statusCodes, isErrorWithCode, isSuccessResponse, ensureGoogleSignInConfigured,
} from '../config/googleSignIn';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuth } from '../hooks/useAuth';
import { extractApiError } from '../utils/apiError';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register, oauthLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) return;
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName);
      // AuthContext sets user, navigation handled by root navigator
    } catch (err: unknown) {
      setError(extractApiError(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      ensureGoogleSignInConfigured();
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response) && response.data.idToken) {
        await oauthLogin('google', response.data.idToken, displayName || undefined);
      }
      // If cancelled, do nothing — no error message
    } catch (error) {
      // Belt-and-suspenders: v16 returns cancellation as response.type,
      // but catch handles legacy native rejection just in case
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      console.error('Google sign-up error:', error);
      setError('Google sign-up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper keyboard>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Display Name</Text>
        <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={colors.textMuted} />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholderTextColor={colors.textMuted} />

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
        </TouchableOpacity>

        <Text style={styles.divider}>or</Text>

        <TouchableOpacity
          style={[styles.oauthButton, loading && styles.buttonDisabled]}
          onPress={handleGoogleSignUp}
          disabled={loading}
        >
          <Text style={styles.oauthButtonText}>Sign up with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled
          style={[styles.oauthButton, { backgroundColor: '#333', opacity: 0.6, marginTop: spacing.sm }]}
        >
          <Text style={[styles.oauthButtonText, { color: '#888' }]}>Sign up with Apple — Coming Soon</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkAccent}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  inner: { flexGrow: 1, justifyContent: 'center', padding: spacing.xxl },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xxl },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.borderMedium,
    borderRadius: radius.sm, padding: spacing.md, color: colors.textPrimary,
    fontSize: 15, marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.accentGold, borderRadius: radius.sm,
    padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.bgPrimary, fontWeight: '600', fontSize: 16 },
  error: { color: colors.statusDanger, fontSize: 13, marginBottom: spacing.lg, textAlign: 'center' },
  divider: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginVertical: spacing.md },
  oauthButton: {
    backgroundColor: '#4285F4', borderRadius: radius.sm,
    padding: spacing.lg, alignItems: 'center',
  },
  oauthButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.lg },
  linkAccent: { color: colors.accentGold },
});
