import ScreenWrapper from '../components/ScreenWrapper';
import LoadingScreen from '../components/LoadingScreen';
import CardIcon from '../components/CardIcon';
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Animated } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getUserCards, getUnreadCount } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, radius, getIssuerColor } from '../theme';
import { useAppReady } from '../contexts/AppReadyContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Dashboard'>;

function AnimatedCard({ item, index, appReady, navigation }: { item: any; index: number; appReady: boolean; navigation: any }) {
  const hasAnimated = useRef(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (appReady && !hasAnimated.current) {
      hasAnimated.current = true;
      const delay = index * 250;
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
      ]).start();
    }
  }, [appReady]);

  const { bg: issuerBg } = getIssuerColor(item.issuer);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: issuerBg, backgroundColor: issuerBg + '12' }]}
        onPress={() => navigation.navigate('CardDetail', { id: item.id })}
      >
        <View style={styles.cardHeader}>
          <CardIcon issuer={item.issuer} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.cardName}>{item.nickname || item.card_name}</Text>
            {item.nickname ? <Text style={styles.cardSubname}>{item.card_name}</Text> : null}
            <Text style={styles.cardIssuer}>{item.issuer}</Text>
          </View>
        </View>
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
              {(item.utilization_pct ?? 0).toFixed(0)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DashboardScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { data: cards, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-cards'],
    queryFn: getUserCards,
  });
  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
  });
  const unreadCount = unreadData?.unread_count ?? 0;
  const appReady = useAppReady();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accentGold} />
      </View>
    );
  }

  return (
    <ScreenWrapper padBottom={false}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/icon.png')} style={{ width: 32, height: 32, borderRadius: 6 }} />
          <View style={{ marginLeft: spacing.sm }}>
            <Text style={styles.greeting}>Hello, {user?.display_name}</Text>
            <Text style={styles.subtitle}>Your credit cards</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.allCreditsBtn} onPress={() => navigation.navigate('AllCredits')}>
            <Text style={styles.allCreditsText}>All Credits</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.bellIcon}>{'\u{1F514}'}</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.profileText}>{user?.display_name?.[0] || '?'}</Text>
          </TouchableOpacity>
        </View>
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
          renderItem={({ item, index }) => (
            <AnimatedCard item={item} index={index} appReady={appReady} navigation={navigation} />
          )}
        />
      )}

      {/* Floating buttons */}
      <TouchableOpacity style={styles.fabFeedback} onPress={() => navigation.navigate('Feedback')}>
        <Text style={styles.fabFeedbackText}>💬</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddCard')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  cardSubname: { fontSize: 12, color: colors.textSecondary, marginBottom: 1 },
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  allCreditsBtn: {
    paddingVertical: 6, paddingHorizontal: spacing.md,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderMedium,
  },
  allCreditsText: { fontSize: 12, color: colors.textMuted },
  bellBtn: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 20 },
  badge: {
    position: 'absolute', top: -2, right: -4,
    backgroundColor: colors.accentGold, borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: colors.bgPrimary },
  fabFeedback: {
    position: 'absolute', bottom: 24, left: 24,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderMedium,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6,
  },
  fabFeedbackText: { fontSize: 18, color: colors.textMuted, fontWeight: '600' },
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
