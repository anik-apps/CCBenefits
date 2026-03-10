import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getUserCards } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { data: cards, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-cards'],
    queryFn: getUserCards,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accentGold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.display_name}</Text>
          <Text style={styles.subtitle}>Your credit cards</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.profileText}>{user?.display_name?.[0] || '?'}</Text>
        </TouchableOpacity>
      </View>

      {isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load cards</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : cards?.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No cards yet</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddCard')}>
            <Text style={styles.addButtonText}>+ Add a Card</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id.toString()}
          onRefresh={refetch}
          refreshing={isLoading}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('CardDetail', { id: item.id })}
            >
              <Text style={styles.cardName}>{item.card_name}</Text>
              <Text style={styles.cardIssuer}>{item.issuer}</Text>
              <View style={styles.cardStats}>
                <View>
                  <Text style={styles.statLabel}>Annual Fee</Text>
                  <Text style={styles.statValue}>${item.annual_fee}</Text>
                </View>
                <View>
                  <Text style={styles.statLabel}>YTD Used</Text>
                  <Text style={styles.statValue}>${item.ytd_actual_used}</Text>
                </View>
                <View>
                  <Text style={styles.statLabel}>Utilization</Text>
                  <Text style={[styles.statValue, { color: item.utilization_pct > 50 ? colors.statusSuccess : colors.accentGold }]}>
                    {item.utilization_pct.toFixed(0)}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Floating Add button */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddCard')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, padding: spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.xl },
  greeting: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  profileText: {
    color: colors.bgPrimary, fontSize: 14, fontWeight: '700',
    backgroundColor: colors.accentGold, width: 32, height: 32, borderRadius: 16,
    textAlign: 'center', lineHeight: 32, overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  cardIssuer: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
  cardStats: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  statValue: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  emptyText: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.lg },
  addButton: {
    backgroundColor: colors.accentGold, borderRadius: radius.sm,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xxl,
  },
  addButtonText: { color: colors.bgPrimary, fontWeight: '600', fontSize: 15 },
  errorText: { color: colors.statusDanger, fontSize: 15, marginBottom: spacing.md },
  retryText: { color: colors.accentGold, fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.accentGold,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  fabText: { fontSize: 28, color: colors.bgPrimary, fontWeight: '600', marginTop: -2 },
});
