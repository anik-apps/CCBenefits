import ScreenWrapper from '../components/ScreenWrapper';
import LoadingScreen from '../components/LoadingScreen';
import React, { useState } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserCards, getUserCard, logUsage, updateUsage, deleteUsage } from '../services/api';
import UsageModal from '../components/UsageModal';
import { colors, spacing, radius, getIssuerColor } from '../theme';
import type { BenefitStatus } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'AllCredits'>;

interface BenefitWithCard extends BenefitStatus {
  userCardId: number;
  cardName: string;
  issuer: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  travel: '\u2708\uFE0F',
  dining: '\uD83C\uDF74',
  entertainment: '\uD83C\uDFAC',
  shopping: '\uD83D\uDECD\uFE0F',
  wellness: '\uD83E\uDDD8',
  lifestyle: '\u2728',
  membership: '\uD83D\uDD11',
};

const CATEGORY_COLORS: Record<string, string> = {
  travel: '#3b82f6',
  dining: '#f59e0b',
  entertainment: '#a855f7',
  shopping: '#ec4899',
  wellness: '#10b981',
  lifestyle: '#6366f1',
  membership: '#64748b',
};

const PERIOD_ORDER = ['monthly', 'quarterly', 'semiannual', 'annual'];
const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semiannual: 'Semi-annual',
  annual: 'Annual',
};

export default function AllCreditsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitWithCard | null>(null);

  const { data: summaries } = useQuery({
    queryKey: ['user-cards'],
    queryFn: getUserCards,
  });

  const cardIds = summaries?.map(s => s.id) ?? [];

  const { data: cardDetails, isLoading } = useQuery({
    queryKey: ['all-card-details', cardIds],
    queryFn: async () => Promise.all(cardIds.map(id => getUserCard(id))),
    enabled: cardIds.length > 0,
  });

  const handleLogUsage = async (amount: number, notes?: string, targetDate?: string) => {
    if (!selectedBenefit) return;
    await logUsage(selectedBenefit.userCardId, selectedBenefit.benefit_template_id, amount, notes, targetDate);
    await queryClient.invalidateQueries({ queryKey: ['all-card-details'] });
    await queryClient.invalidateQueries({ queryKey: ['user-cards'] });
    await queryClient.invalidateQueries({ queryKey: ['user-card'] });
  };

  const handleUpdateUsage = async (usageId: number, amount: number, notes?: string) => {
    await updateUsage(usageId, amount, notes);
    await queryClient.invalidateQueries({ queryKey: ['all-card-details'] });
    await queryClient.invalidateQueries({ queryKey: ['user-cards'] });
    await queryClient.invalidateQueries({ queryKey: ['user-card'] });
  };

  const handleDeleteUsage = async (usageId: number) => {
    await deleteUsage(usageId);
    await queryClient.invalidateQueries({ queryKey: ['all-card-details'] });
    await queryClient.invalidateQueries({ queryKey: ['user-cards'] });
    await queryClient.invalidateQueries({ queryKey: ['user-card'] });
  };

  if (isLoading || !cardDetails) {
    return <LoadingScreen />;
  }

  const allBenefits: BenefitWithCard[] = cardDetails.flatMap(card =>
    card.benefits_status.map(b => ({ ...b, userCardId: card.id, cardName: card.card_name, issuer: card.issuer }))
  );

  const sections = PERIOD_ORDER
    .map(period => ({
      title: PERIOD_LABELS[period] || period,
      data: allBenefits.filter(b => b.period_type === period),
    }))
    .filter(s => s.data.length > 0);

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>All Credits</Text>
        <Text style={styles.subtitle}>{allBenefits.length} benefits across {cardDetails.length} cards</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.benefit_template_id}-${item.cardName}-${index}`}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const catIcon = CATEGORY_ICONS[item.category] || '\u2022';
          const catColor = CATEGORY_COLORS[item.category] || '#64748b';
          return (
          <TouchableOpacity
            style={[styles.benefitCard, { borderLeftWidth: 3, borderLeftColor: getIssuerColor(item.issuer).bg }]}
            onPress={() => setSelectedBenefit(item)}
            activeOpacity={0.7}
          >
            <View style={styles.benefitRow}>
              <View style={[styles.catIconBox, { backgroundColor: catColor + '20', borderColor: catColor + '40' }]}>
                <Text style={styles.catIconText}>{catIcon}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.benefitName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.benefitDesc} numberOfLines={2}>{item.description}</Text>
                ) : null}
                <Text style={styles.cardLabel}>{item.cardName}</Text>
              </View>
              <View style={styles.benefitRight}>
                <Text style={[styles.benefitValue, item.is_used && styles.benefitUsedStyle]}>
                  ${item.amount_used} / ${item.max_value}
                </Text>
                <Text style={styles.tapHint}>
                  {item.is_used ? 'Tap to edit' : 'Tap to log'}
                </Text>
              </View>
            </View>
            <View style={styles.dotsRow}>
              {item.periods.map(p => {
                const isFullyUsed = p.is_used && p.amount_used >= item.max_value;
                const isPartial = p.is_used && !isFullyUsed;
                return (
                  <View
                    key={p.label}
                    style={[
                      styles.dot,
                      isPartial && styles.dotPartial,
                      isFullyUsed && styles.dotFull,
                      p.is_current && styles.dotCurrent,
                    ]}
                  />
                );
              })}
            </View>
          </TouchableOpacity>
          );
        }}
      />

      {selectedBenefit && (
        <UsageModal
          visible={!!selectedBenefit}
          benefit={selectedBenefit}
          onClose={() => setSelectedBenefit(null)}
          onLogUsage={handleLogUsage}
          onUpdateUsage={handleUpdateUsage}
          onDeleteUsage={handleDeleteUsage}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.md },
  backText: { color: colors.accentGold, fontSize: 14, marginBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  list: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  sectionHeader: {
    fontSize: 13, fontWeight: '600', color: colors.accentGold, textTransform: 'uppercase',
    letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  benefitCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  catIconBox: {
    width: 36, height: 36, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  catIconText: { fontSize: 16 },
  benefitName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  benefitDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardLabel: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  benefitRight: { alignItems: 'flex-end', marginLeft: 'auto' },
  benefitValue: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  benefitUsedStyle: { color: colors.accentGold },
  tapHint: { fontSize: 10, color: colors.accentGold, marginTop: 2 },
  dotsRow: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bgTertiary },
  dotPartial: { backgroundColor: colors.accentGold },
  dotFull: { backgroundColor: colors.statusSuccess },
  dotCurrent: { borderWidth: 1.5, borderColor: colors.accentGold },
});
