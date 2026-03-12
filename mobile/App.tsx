import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, ActivityIndicator, View, Animated, Image, Easing, Dimensions } from 'react-native';
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

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000 },
  },
});

function RootNavigator() {
  const { user, loading } = useAuth();
  const [appReady, setAppReady] = useState(false);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  // Animate from 0 (start: big, centered) to 1 (end: small, at destination)
  const progress = useRef(new Animated.Value(0)).current;

  // Start size and end size
  const startSize = 200;
  // Logged in: 32px icon in top-left header. Not logged in: 64px icon centered above login form
  const endSize = user ? 32 : 64;
  const scaleEnd = endSize / startSize;

  useNotificationListener(navigationRef, !!user);

  useEffect(() => {
    if (user && user.is_verified) {
      registerForPushNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();

      // Phase 1: Pulsing gold glow for 3.5s
      const glowPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      glowPulse.start();

      // Phase 2: After 3.5s, animate icon to destination
      setTimeout(() => {
        glowPulse.stop();

        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          // Main progress animation: 0 → 1
          Animated.timing(progress, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          // Fade overlay
          Animated.sequence([
            Animated.delay(800),
            Animated.timing(splashOpacity, {
              toValue: 0,
              duration: 1200,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => setAppReady(true));
      }, 3500);
    }
  }, [loading]);

  // Interpolate progress to scale and translation
  const iconScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, scaleEnd],
  });

  const screenH = Dimensions.get('window').height;
  const screenW = Dimensions.get('window').width;

  // Login screen layout:
  //   ScreenWrapper: paddingTop = safeAreaTop (~50px)
  //   inner: flex:1, justifyContent:'center', padding: 24px
  //   Form content ~350px tall, icon is first element (64px + 24px margin)
  //   Icon center from screen top ≈ safeTop + (available - formH)/2 + 32
  //
  // With safe area ~50, screenH ~850:
  //   available = 850 - 50 - 34 = 766
  //   iconCenterFromTop = 50 + (766-350)/2 + 32 = 290
  //   offsetFromScreenCenter = -(screenH/2 - 290) = -(425-290) = -135
  //
  // BUT: translateY is applied BEFORE scale in the transform array.
  // At scale 0.4, the image shrinks around its center but translateY moves
  // the pre-scaled center. So the visual offset = translateY * scale.
  // To get visual offset of -135, we need translateY = -135 / scaleEnd
  const safeTop = 50; // approximate safe area
  const safeBottom = 34;
  const available = screenH - safeTop - safeBottom;
  const formHeight = 350;
  const iconCenterFromTop = safeTop + (available - formHeight) / 2 + 32;
  const loginOffsetFromCenter = -(screenH / 2 - iconCenterFromTop);
  // No scale compensation needed — RN applies transforms in order,
  // and translate happens before scale, so visual position = translate * scale + original_center * (1 - scale)
  // Actually in RN, transforms are applied right-to-left (matrix multiplication).
  // Our transform array is [scale, translateX, translateY] — scale applies LAST visually.
  // So translate moves first, then scale shrinks around the new center.
  // Visual center = (originalCenter + translate) — no scale factor on translate.
  // So loginOffsetFromCenter should be correct as-is.
  //
  // If it's still not reaching, the issue might be that the splash overlay's
  // justifyContent:'center' places the icon at a different center than screenH/2
  // (safe area insets shift it). Let's just use a larger empirical value.

  // Scale is applied AFTER translate in our transform array [scale, translateX, translateY]
  // RN applies right-to-left: translateY first, then translateX, then scale
  // This means scale multiplies the translate visually: visual_offset = translate * scale
  // To get the desired visual offset, divide by the end scale:
  const loginIconOffsetY = loginOffsetFromCenter / scaleEnd;

  // Logged in: header icon at (16, ~55) from top-left
  const headerOffsetFromCenter_Y = -(screenH / 2 - 55);
  const headerOffsetFromCenter_X = -(screenW / 2 - 32);
  const headerIconOffsetY = headerOffsetFromCenter_Y / scaleEnd;
  const headerIconOffsetX = headerOffsetFromCenter_X / scaleEnd;

  const iconTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, user ? headerIconOffsetY : loginIconOffsetY],
  });

  const iconTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, user ? headerIconOffsetX : 0],
  });

  const content = loading ? null : !user ? <AuthStack /> : !user.is_verified ? <VerifyPendingScreen /> : <AppStack />;

  return (
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
              { scale: iconScale },
              { translateX: iconTranslateX },
              { translateY: iconTranslateY },
            ],
          }} />
          <Animated.Image
            source={require('./assets/icon.png')}
            style={{
              width: startSize, height: startSize, borderRadius: 30,
              transform: [
                { scale: iconScale },
                { translateX: iconTranslateX },
                { translateY: iconTranslateY },
              ],
            }}
          />
        </Animated.View>
      )}
    </View>
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
