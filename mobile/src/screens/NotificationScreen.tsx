import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInbox, markNotificationRead, markAllRead } from '../services/api';
import { colors, spacing, radius } from '../theme';
import ScreenWrapper from '../components/ScreenWrapper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Notifications'>;

function getNotifIcon(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('expir')) return '⏰';
  if (t.includes('period')) return '📅';
  if (t.includes('summary') || t.includes('utilization')) return '📊';
  if (t.includes('recap') || t.includes('unused')) return '💡';
  if (t.includes('fee')) return '💳';
  return '🔔';
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications-inbox'],
    queryFn: () => getInbox(50, 0),
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const handlePress = useCallback((item: any) => {
    if (!item.is_read) {
      markReadMutation.mutate(item.id);
    }
    if (item.data?.screen === 'CardDetail' && item.data?.cardId) {
      navigation.navigate('CardDetail', { id: item.data.cardId });
    } else {
      navigation.navigate('Dashboard');
    }
  }, [navigation, markReadMutation]);

  const items = notifications?.items ?? notifications ?? [];

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>{'\u2190'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={() => markAllMutation.mutate()}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item: any) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.accentGold}
          />
        }
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyText}>No notifications yet. We'll let you know when credits are expiring or new periods start.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifItem, !item.is_read && styles.unreadItem]}
            onPress={() => handlePress(item)}
          >
            <View style={styles.notifIconBox}>
              <Text style={styles.notifIcon}>{getNotifIcon(item.title)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, !item.is_read && styles.unreadTitle]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.notifBody} numberOfLines={2}>
                {item.body}
              </Text>
              <Text style={styles.notifTime}>{timeAgo(item.created_at)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.xl, marginBottom: spacing.lg,
  },
  backBtn: { fontSize: 14, color: colors.accentGold },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  markAllText: { fontSize: 12, color: colors.accentGold },
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.sm, marginBottom: spacing.xs,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle,
    backgroundColor: colors.bgCard,
  },
  unreadItem: {
    borderLeftWidth: 3, borderLeftColor: colors.accentGold,
    backgroundColor: colors.bgCard,
  },
  notifIconBox: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.bgTertiary, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  notifIcon: { fontSize: 16 },
  notifTitle: { fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 2 },
  unreadTitle: { fontWeight: '700' },
  notifBody: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  notifTime: { fontSize: 11, color: colors.textMuted },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xxl },
  emptyIcon: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
