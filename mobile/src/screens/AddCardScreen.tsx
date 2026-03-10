import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCardTemplates, createUserCard } from '../services/api';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'AddCard'>;

export default function AddCardScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [nickname, setNickname] = useState('');
  const [creating, setCreating] = useState<number | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['card-templates'],
    queryFn: getCardTemplates,
  });

  const handleAdd = async (templateId: number) => {
    setCreating(templateId);
    try {
      await createUserCard(templateId, nickname || undefined);
      await queryClient.invalidateQueries({ queryKey: ['user-cards'] });
      navigation.goBack();
    } catch {
      setCreating(null);
    }
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.accentGold} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add a Card</Text>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item: t }) => (
          <View>
            <View style={[styles.card, expandedId === t.id && styles.cardExpanded]}>
              <View style={styles.cardContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{t.name}</Text>
                  <Text style={styles.cardMeta}>
                    {t.issuer} · {t.benefit_count} benefits · Up to ${t.total_annual_value.toLocaleString()}/yr
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.fee}>${t.annual_fee}/yr</Text>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => {
                      setExpandedId(expandedId === t.id ? null : t.id);
                      setNickname('');
                    }}
                  >
                    <Text style={styles.addBtnText}>{expandedId === t.id ? 'Cancel' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {expandedId === t.id && (
              <View style={styles.expandedRow}>
                <TextInput
                  style={styles.input}
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="Nickname (optional)"
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={() => handleAdd(t.id)}
                  returnKeyType="go"
                />
                <TouchableOpacity
                  style={[styles.confirmBtn, creating === t.id && { opacity: 0.6 }]}
                  onPress={() => handleAdd(t.id)}
                  disabled={creating !== null}
                >
                  <Text style={styles.confirmBtnText}>{creating === t.id ? 'Adding...' : 'Add Card'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.md },
  backText: { color: colors.accentGold, fontSize: 14, marginBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  list: { padding: spacing.lg, paddingTop: 0 },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderSubtle, marginBottom: spacing.sm,
  },
  cardExpanded: { borderColor: colors.accentGold, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg },
  cardName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  cardMeta: { fontSize: 12, color: colors.textMuted },
  cardRight: { alignItems: 'flex-end', marginLeft: spacing.md },
  fee: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  addBtn: { backgroundColor: colors.accentGold, borderRadius: radius.sm, paddingVertical: 5, paddingHorizontal: 14 },
  addBtnText: { color: colors.bgPrimary, fontWeight: '600', fontSize: 12 },
  expandedRow: {
    flexDirection: 'row', gap: spacing.sm, padding: spacing.md,
    backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1, borderTopWidth: 0,
    borderColor: colors.accentGold, borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1, backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.borderMedium,
    borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    color: colors.textPrimary, fontSize: 14,
  },
  confirmBtn: { backgroundColor: colors.accentGold, borderRadius: radius.sm, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  confirmBtnText: { color: colors.bgPrimary, fontWeight: '600', fontSize: 13 },
});
