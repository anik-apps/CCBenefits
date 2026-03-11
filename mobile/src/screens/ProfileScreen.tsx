import ScreenWrapper from '../components/ScreenWrapper';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Display Name</Text>
        <Text style={styles.value}>{user?.display_name}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Currency</Text>
        <Text style={styles.value}>{user?.preferred_currency}</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>CCBenefits v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
  backText: { color: colors.accentGold, fontSize: 14, marginBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  value: { fontSize: 15, color: colors.textPrimary },
  logoutBtn: {
    marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.statusDanger, alignItems: 'center',
  },
  logoutText: { color: colors.statusDanger, fontWeight: '600', fontSize: 15 },
  version: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.xxl },
});
