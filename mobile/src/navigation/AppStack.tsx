import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import CardDetailScreen from '../screens/CardDetailScreen';
import AddCardScreen from '../screens/AddCardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AllCreditsScreen from '../screens/AllCreditsScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import NotificationScreen from '../screens/NotificationScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.bgPrimary },
    }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="CardDetail" component={CardDetailScreen} />
      <Stack.Screen name="AddCard" component={AddCardScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="AllCredits" component={AllCreditsScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
    </Stack.Navigator>
  );
}
