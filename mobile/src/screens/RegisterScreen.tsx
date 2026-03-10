import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
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
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkAccent}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
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
  link: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  linkAccent: { color: colors.accentGold },
});
