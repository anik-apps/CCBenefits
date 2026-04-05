import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { requestPasswordReset } from '../services/api';
import { extractApiError } from '../utils/apiError';
import ScreenWrapper from '../components/ScreenWrapper';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(extractApiError(err, 'Failed to send reset email'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <ScreenWrapper keyboard>
        <View style={styles.inner}>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.description}>
            If that email is registered, a reset link has been sent. Open the link in your email to reset your password.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ResetPassword')}>
            <Text style={styles.buttonText}>Paste Reset Link</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper keyboard>
      <View style={styles.inner}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          placeholderTextColor={colors.textMuted}
          placeholder="you@example.com"
        />

        <TouchableOpacity
          style={[styles.button, (loading || !email.trim()) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !email.trim()}
        >
          <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
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
