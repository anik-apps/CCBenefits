import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, View, Animated, Easing, Dimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/contexts/AuthContext';
import { useAuth } from './src/hooks/useAuth';
import { navigationRef } from './src/navigation/rootNavigation';
import { registerForPushNotifications } from './src/services/notifications';
import { useNotificationListener } from './src/hooks/useNotifications';
import { setupQueryClient } from './src/setup';
import AuthStack from './src/navigation/AuthStack';
import AppStack from './src/navigation/AppStack';
import VerifyPendingScreen from './src/screens/VerifyPendingScreen';
import { colors } from './src/theme';
import { AppReadyProvider } from './src/contexts/AppReadyContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000 },
  },
});

const START_SIZE = 200;

function RootNavigator() {
  const { user, loading } = useAuth();
  const [appReady, setAppReady] = useState(false);
  const splashStarted = useRef(false);

  // All animated values as direct Animated.Value (no interpolation)
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const iconTranslateX = useRef(new Animated.Value(0)).current;
  const iconTranslateY = useRef(new Animated.Value(0)).current;

  useNotificationListener(navigationRef, !!user);

  useEffect(() => {
    if (user && user.is_verified) {
      registerForPushNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !splashStarted.current) {
      splashStarted.current = true;
      SplashScreen.hideAsync();

      const screenH = Dimensions.get('window').height;
      const screenW = Dimensions.get('window').width;

      // Calculate end scale and position based on auth state
      const endScale = user ? (32 / START_SIZE) : (64 / START_SIZE);
      const targetY = user ? -(screenH / 2 - 55) : -(screenH * 0.20);
      const targetX = user ? -(screenW / 2 - 32) : 0;

      // Phase 1: Pulsing gold glow for 3.5s
      const glowPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      glowPulse.start();

      // Phase 2: After 3.5s, shrink + move + fade
      setTimeout(() => {
        glowPulse.stop();

        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0, duration: 600, useNativeDriver: true,
          }),
          Animated.timing(iconScale, {
            toValue: endScale, duration: 2000,
            easing: Easing.inOut(Easing.cubic), useNativeDriver: true,
          }),
          Animated.timing(iconTranslateY, {
            toValue: targetY, duration: 2000,
            easing: Easing.inOut(Easing.cubic), useNativeDriver: true,
          }),
          Animated.timing(iconTranslateX, {
            toValue: targetX, duration: 2000,
            easing: Easing.inOut(Easing.cubic), useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(800),
            Animated.timing(splashOpacity, {
              toValue: 0, duration: 1200,
              easing: Easing.out(Easing.quad), useNativeDriver: true,
            }),
          ]),
        ]).start();

        // Trigger card stagger shortly after overlay fades
        setTimeout(() => setAppReady(true), 1500);
      }, 3500);
    }
  }, [loading]);

  const content = loading ? null : !user ? <AuthStack /> : !user.is_verified ? <VerifyPendingScreen /> : <AppStack />;

  return (
    <AppReadyProvider value={appReady}>
    <View style={{ flex: 1 }}>
      {content}
      {!appReady && (
        <Animated.View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: colors.bgPrimary, zIndex: 9999,
          justifyContent: 'center', alignItems: 'center',
          opacity: splashOpacity,
        }}>
          {/* Gold glow behind icon */}
          <Animated.View style={{
            position: 'absolute',
            width: 260, height: 260, borderRadius: 130,
            backgroundColor: 'rgba(201, 168, 76, 0.2)',
            opacity: glowOpacity,
            transform: [
              { translateX: iconTranslateX },
              { translateY: iconTranslateY },
              { scale: iconScale },
            ],
          }} />
          <Animated.Image
            source={require('./assets/icon.png')}
            style={{
              width: START_SIZE, height: START_SIZE, borderRadius: 30,
              transform: [
                { translateX: iconTranslateX },
                { translateY: iconTranslateY },
                { scale: iconScale },
              ],
            }}
          />
        </Animated.View>
      )}
    </View>
    </AppReadyProvider>
  );
}

export default function App() {
  useEffect(() => { setupQueryClient(); }, []);

  return (
    <SafeAreaProvider>
    <QueryClientProvider client={queryClient}>
      <NavigationContainer ref={navigationRef} theme={{
        dark: true,
        colors: {
          primary: colors.accentGold,
          background: colors.bgPrimary,
          card: colors.bgSecondary,
          text: colors.textPrimary,
          border: colors.borderSubtle,
          notification: colors.accentGold,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </NavigationContainer>
    </QueryClientProvider>
    </SafeAreaProvider>
  );
}
