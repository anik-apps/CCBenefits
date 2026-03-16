import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useAuth } from '../hooks/useAuth';
import ScreenWrapper from '../components/ScreenWrapper';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<any, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login, oauthLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: Constants.expoConfig?.extra?.googleClientId,
    androidClientId: Constants.expoConfig?.extra?.googleClientIdAndroid,
    iosClientId: Constants.expoConfig?.extra?.googleClientIdIos,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      oauthLogin('google', id_token).catch(() => setError('Google sign-in failed'));
    }
  }, [response]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
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
    <ScreenWrapper keyboard>
      <View style={styles.inner}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>Sign In</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholderTextColor={colors.textMuted}
          placeholder="you@example.com"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          ref={passwordRef}
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
        />

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotLink}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (loading || !email.trim() || !password.trim()) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !email.trim() || !password.trim()}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <Text style={styles.divider}>or</Text>

        <TouchableOpacity
          style={[styles.oauthButton, !request && styles.buttonDisabled]}
          onPress={() => promptAsync()}
          disabled={!request}
        >
          <Text style={styles.oauthButtonText}>Sign in with Google</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.sm}
            style={{ height: 48, width: '100%', marginTop: spacing.sm }}
            onPress={async () => {
              try {
                const credential = await AppleAuthentication.signInAsync({
                  requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                  ],
                });
                const displayName = [credential.fullName?.givenName, credential.fullName?.familyName]
                  .filter(Boolean).join(' ') || undefined;
                await oauthLogin('apple', credential.identityToken!, displayName);
              } catch (err: any) {
                if (err.code !== 'ERR_REQUEST_CANCELED') {
                  setError('Apple sign-in failed');
                }
              }
            }}
          />
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkAccent}>Sign up</Text></Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, justifyContent: 'center', padding: spacing.xxl },
  logo: {
    width: 64, height: 64, borderRadius: 12,
    alignSelf: 'center', marginBottom: spacing.xxl,
  },
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
  forgotLink: { color: colors.accentGold, fontSize: 13, textAlign: 'right', marginTop: -8, marginBottom: spacing.lg },
  divider: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginVertical: spacing.md },
  oauthButton: {
    backgroundColor: '#4285F4', borderRadius: radius.sm,
    padding: spacing.lg, alignItems: 'center',
  },
  oauthButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  link: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.lg },
  linkAccent: { color: colors.accentGold },
});
