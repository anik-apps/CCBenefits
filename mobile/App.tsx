import React, { useEffect, useState, useRef } from 'react';
import { StatusBar, ActivityIndicator, View, Animated, Image } from 'react-native';
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

  useNotificationListener(navigationRef, !!user);

  useEffect(() => {
    if (user && user.is_verified) {
      registerForPushNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setAppReady(true));
    }
  }, [loading]);

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
          <Image source={require('./assets/icon.png')} style={{ width: 120, height: 120, borderRadius: 20 }} />
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
