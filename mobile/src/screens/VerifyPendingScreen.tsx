import ScreenWrapper from '../components/ScreenWrapper';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { resendVerification } from '../services/api';
import { colors, spacing, radius } from '../theme';

export default function VerifyPendingScreen() {
  const { user, refreshUser, logout } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Poll for verification every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => refreshUser(), 5000);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [refreshUser]);

  const handleResend = async () => {
    setSending(true);
    setMessage('');
    try {
      await resendVerification();
      setMessage('Verification email sent!');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setMessage(status === 429 ? 'Please wait before resending' : 'Failed to send');
    } finally {
      setSending(false);
      timerRef.current = setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.inner}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>@</Text>
      </View>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>We sent a verification link to</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.hint}>Click the link in the email to verify your account and start using CCBenefits.</Text>

      <TouchableOpacity
        style={[styles.button, sending && styles.buttonDisabled]}
        onPress={handleResend}
        disabled={sending}
      >
        <Text style={styles.buttonText}>{sending ? 'Sending...' : 'Resend verification email'}</Text>
      </TouchableOpacity>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TouchableOpacity onPress={logout}>
        <Text style={styles.signOut}>Sign out</Text>
      </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, justifyContent: 'center', padding: spacing.xxl },
  icon: {
    width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.accentGold,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.xxl,
  },
  iconText: { fontSize: 28, color: colors.bgPrimary, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.md },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  email: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xxl },
  hint: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xxl, lineHeight: 20 },
  button: {
    backgroundColor: colors.accentGold, borderRadius: radius.sm,
    padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.bgPrimary, fontWeight: '600', fontSize: 15 },
  message: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  signOut: { color: colors.textMuted, fontSize: 13, textAlign: 'center', textDecorationLine: 'underline' },
});
