import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInbox, markNotificationRead, markAllRead } from '../services/api';
import { colors, spacing, radius } from '../theme';
import ScreenWrapper from '../components/ScreenWrapper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Notifications'>;

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
    if (item.data?.screen === 'CardDetail' && item.data?.card_id) {
      navigation.navigate('CardDetail', { id: item.data.card_id });
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
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifItem, !item.is_read && styles.unreadItem]}
            onPress={() => handlePress(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, !item.is_read && styles.unreadTitle]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.notifBody} numberOfLines={1}>
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
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  unreadItem: {
    borderLeftWidth: 3, borderLeftColor: colors.accentGold,
    backgroundColor: colors.bgCard,
  },
  notifTitle: { fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 2 },
  unreadTitle: { fontWeight: '700' },
  notifBody: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  notifTime: { fontSize: 11, color: colors.textMuted },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: colors.textMuted },
});
