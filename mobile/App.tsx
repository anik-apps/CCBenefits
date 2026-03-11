import React, { useEffect } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { useAuth } from './src/hooks/useAuth';
import { navigationRef } from './src/navigation/rootNavigation';
import { registerForPushNotifications } from './src/services/notifications';
import { setupQueryClient } from './src/setup';
import AuthStack from './src/navigation/AuthStack';
import AppStack from './src/navigation/AppStack';
import VerifyPendingScreen from './src/screens/VerifyPendingScreen';
import { colors } from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000 },
  },
});

function RootNavigator() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user && user.is_verified) {
      registerForPushNotifications();
    }
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary }}>
        <ActivityIndicator size="large" color={colors.accentGold} />
      </View>
    );
  }

  if (!user) return <AuthStack />;
  if (!user.is_verified) return <VerifyPendingScreen />;
  return <AppStack />;
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
