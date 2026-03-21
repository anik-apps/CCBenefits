import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

interface PastYearBannerProps {
  year: number;
}

export default function PastYearBanner({ year }: PastYearBannerProps) {
  const currentYear = new Date().getFullYear();
  if (year >= currentYear) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Viewing {year}. Edits to past years will be saved.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  text: {
    fontSize: 12,
    color: colors.accentGold,
    fontWeight: '500',
  },
});
