import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { resetPassword } from '../services/api';
import { extractApiError } from '../utils/apiError';
import ScreenWrapper from '../components/ScreenWrapper';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'ResetPassword'>;

function parseToken(input: string): string {
  const match = input.match(/token=([^&\s]+)/);
  return match ? match[1] : input.trim();
}

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const prefilledToken = route.params?.token as string | undefined;

  const [tokenInput, setTokenInput] = useState(prefilledToken || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    setError('');

    const token = parseToken(tokenInput);
    if (!token) {
      setError('Please paste the reset link from your email');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password.length > 72) {
      setError('Password must be at most 72 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(extractApiError(err, 'Invalid or expired reset link'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ScreenWrapper keyboard>
        <View style={styles.inner}>
          <Text style={styles.title}>Password Reset</Text>
          <Text style={styles.description}>Your password has been reset successfully.</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper keyboard>
      <View style={styles.inner}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your new password.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!prefilledToken && (
          <>
            <Text style={styles.label}>Reset Link or Token</Text>
            <Text style={styles.helperText}>Copy the full link from your email and paste it here.</Text>
            <TextInput
              style={styles.input}
              value={tokenInput}
              onChangeText={setTokenInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholderTextColor={colors.textMuted}
              placeholder="Paste link or token"
            />
          </>
        )}

        <Text style={styles.label}>New Password</Text>
        <TextInput
          ref={passwordRef}
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          placeholder="Min 8 characters"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          ref={confirmRef}
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          placeholder="Confirm password"
          placeholderTextColor={colors.textMuted}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, justifyContent: 'center', padding: spacing.xxl },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xxl },
  description: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xxl, lineHeight: 22 },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xs },
  helperText: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
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
  link: { color: colors.accentGold, fontSize: 13, textAlign: 'center' },
});
