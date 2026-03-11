import ScreenWrapper from '../components/ScreenWrapper';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../hooks/useAuth';
import { updateProfile } from '../services/api';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NotificationPreferences, ChannelPreferences } from '../types';

type Props = NativeStackScreenProps<any, 'Profile'>;

const DEFAULT_CHANNEL: ChannelPreferences = {
  expiring_credits: true,
  period_start: true,
  utilization_summary: false,
  unused_recap: true,
  fee_approaching: false,
};

const DEFAULT_PREFS: NotificationPreferences = {
  email: { ...DEFAULT_CHANNEL },
  push: { ...DEFAULT_CHANNEL },
  notification_hour: 9,
};

type NotifKey = keyof ChannelPreferences;

interface NotifRow {
  key: NotifKey;
  label: string;
  description: string;
}

const NOTIFICATION_TYPES: NotifRow[] = [
  { key: 'expiring_credits', label: 'Expiring Credits', description: 'Notify 3 days before unused credits expire' },
  { key: 'period_start', label: 'Period Start', description: 'Reminder when a new period begins' },
  { key: 'utilization_summary', label: 'Utilization Summary', description: 'Weekly usage digest' },
  { key: 'unused_recap', label: 'Unused Recap', description: 'Credits missed after period ends' },
  { key: 'fee_approaching', label: 'Fee Approaching', description: 'Alert 30 days before card renewal' },
];

function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export default function ProfileScreen({ navigation }: Props) {
  const { user, logout, refreshUser } = useAuth();
  const prefs = user?.notification_preferences ?? DEFAULT_PREFS;

  const [showPushInfo, setShowPushInfo] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track whether any push toggle was ever turned on this session
  const pushInfoShown = useRef(false);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  const savePrefs = useCallback(async (updated: NotificationPreferences) => {
    setSaving(true);
    try {
      await updateProfile({ notification_preferences: updated });
      await refreshUser();
    } finally {
      setSaving(false);
    }
  }, [refreshUser]);

  const debouncedSave = useCallback((updated: NotificationPreferences) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => savePrefs(updated), 400);
  }, [savePrefs]);

  const handleToggle = useCallback((channel: 'email' | 'push', key: NotifKey, value: boolean) => {
    const updated: NotificationPreferences = {
      ...prefs,
      [channel]: { ...prefs[channel], [key]: value },
    };
    if (channel === 'push' && value && !pushInfoShown.current) {
      pushInfoShown.current = true;
      setShowPushInfo(true);
    }
    debouncedSave(updated);
  }, [prefs, debouncedSave]);

  const handleHourChange = useCallback((delta: number) => {
    const current = prefs.notification_hour;
    const next = (current + delta + 24) % 24;
    const updated: NotificationPreferences = { ...prefs, notification_hour: next };
    debouncedSave(updated);
  }, [prefs, debouncedSave]);

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
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

      {/* Notifications Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        {saving && <Text style={styles.savingText}>Saving...</Text>}
      </View>

      {NOTIFICATION_TYPES.map((notif) => (
        <View key={notif.key} style={styles.notifCard}>
          <View style={styles.notifInfo}>
            <Text style={styles.notifLabel}>{notif.label}</Text>
            <Text style={styles.notifDesc}>{notif.description}</Text>
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchCol}>
              <Text style={styles.switchLabel}>Email</Text>
              <Switch
                value={prefs.email[notif.key]}
                onValueChange={(v) => handleToggle('email', notif.key, v)}
                trackColor={{ false: colors.bgTertiary, true: colors.accentGoldDim }}
                thumbColor={prefs.email[notif.key] ? colors.accentGold : colors.textMuted}
              />
            </View>
            <View style={styles.switchCol}>
              <Text style={styles.switchLabel}>Push</Text>
              <Switch
                value={prefs.push[notif.key]}
                onValueChange={(v) => handleToggle('push', notif.key, v)}
                trackColor={{ false: colors.bgTertiary, true: colors.accentGoldDim }}
                thumbColor={prefs.push[notif.key] ? colors.accentGold : colors.textMuted}
              />
            </View>
          </View>
        </View>
      ))}

      {showPushInfo && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Push notifications will be enabled in a future update.
          </Text>
        </View>
      )}

      {/* Notification Hour Picker */}
      <View style={styles.hourCard}>
        <Text style={styles.notifLabel}>Notification Hour</Text>
        <Text style={styles.notifDesc}>When to send daily notifications</Text>
        <View style={styles.hourPicker}>
          <TouchableOpacity style={styles.hourBtn} onPress={() => handleHourChange(-1)}>
            <Text style={styles.hourBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.hourValue}>{formatHour(prefs.notification_hour)}</Text>
          <TouchableOpacity style={styles.hourBtn} onPress={() => handleHourChange(1)}>
            <Text style={styles.hourBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>CCBenefits v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </ScrollView>
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
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  savingText: { fontSize: 12, color: colors.accentGold },
  notifCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  notifInfo: { marginBottom: spacing.md },
  notifLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  notifDesc: { fontSize: 12, color: colors.textMuted },
  switchRow: { flexDirection: 'row', gap: spacing.xl },
  switchCol: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  switchLabel: { fontSize: 12, color: colors.textSecondary, width: 36 },
  infoBox: {
    backgroundColor: colors.bgTertiary, borderRadius: radius.sm, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.accentGoldDim,
  },
  infoText: { fontSize: 13, color: colors.accentGold },
  hourCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg,
    marginTop: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  hourPicker: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.lg,
  },
  hourBtn: {
    width: 36, height: 36, borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.borderMedium, backgroundColor: colors.bgTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  hourBtnText: { fontSize: 18, color: colors.textPrimary, fontWeight: '600' },
  hourValue: { fontSize: 16, color: colors.textPrimary, fontWeight: '600', minWidth: 60, textAlign: 'center' },
  logoutBtn: {
    marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.statusDanger, alignItems: 'center',
  },
  logoutText: { color: colors.statusDanger, fontWeight: '600', fontSize: 15 },
  version: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.xxl },
});
