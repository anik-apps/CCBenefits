import React from 'react';
import { ActivityIndicator } from 'react-native';
import ScreenWrapper from './ScreenWrapper';
import { colors } from '../theme';

export default function LoadingScreen() {
  return (
    <ScreenWrapper>
      <ActivityIndicator size="large" color={colors.accentGold} style={{ flex: 1, justifyContent: 'center' }} />
    </ScreenWrapper>
  );
}
