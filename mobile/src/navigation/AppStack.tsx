import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.bgPrimary },
    }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      {/* Phase 2: CardDetail, AddCard, AllCredits */}
      {/* Phase 3: Profile, Feedback */}
    </Stack.Navigator>
  );
}
