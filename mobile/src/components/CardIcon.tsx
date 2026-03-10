import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getIssuerColor, radius } from '../theme';

interface Props {
  issuer: string;
  size?: 'small' | 'medium';
}

export default function CardIcon({ issuer, size = 'medium' }: Props) {
  const { bg, text } = getIssuerColor(issuer);
  const isSmall = size === 'small';

  return (
    <View style={[
      styles.card,
      { backgroundColor: bg },
      isSmall ? styles.small : styles.medium,
    ]}>
      <Text style={[styles.issuerText, { color: text }, isSmall && styles.issuerTextSmall]}>
        {(issuer || '?').split(' ').map(w => w[0] || '').join('') || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medium: { width: 48, height: 32 },
  small: { width: 36, height: 24 },
  issuerText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  issuerTextSmall: { fontSize: 9 },
});
