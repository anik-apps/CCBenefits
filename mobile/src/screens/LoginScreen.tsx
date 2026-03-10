import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>CC</Text>
        </View>
        <Text style={styles.title}>Sign In</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={colors.textMuted}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkAccent}>Sign up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  inner: { flex: 1, justifyContent: 'center', padding: spacing.xxl },
  logo: {
    width: 48, height: 48, borderRadius: radius.md,
    backgroundColor: colors.accentGold, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: spacing.xxl,
  },
  logoText: { fontSize: 20, fontWeight: '700', color: colors.bgPrimary },
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
