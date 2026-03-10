import ScreenWrapper from '../components/ScreenWrapper';
import LoadingScreen from '../components/LoadingScreen';
import React, { useState } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserCards, getUserCard, logUsage, updateUsage, deleteUsage } from '../services/api';
import UsageModal from '../components/UsageModal';
import { colors, spacing, radius } from '../theme';
import type { BenefitStatus } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'AllCredits'>;

interface BenefitWithCard extends BenefitStatus {
  userCardId: number;
  cardName: string;
}

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
    card.benefits_status.map(b => ({ ...b, userCardId: card.id, cardName: card.card_name }))
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.benefitCard}
            onPress={() => setSelectedBenefit(item)}
            activeOpacity={0.7}
          >
            <View style={styles.benefitRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitName}>{item.name}</Text>
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
        )}
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
  benefitRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  benefitName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  cardLabel: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  benefitRight: { alignItems: 'flex-end' },
  benefitValue: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  benefitUsedStyle: { color: colors.accentGold },
  tapHint: { fontSize: 10, color: colors.accentGold, marginTop: 2 },
  dotsRow: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bgTertiary },
  dotPartial: { backgroundColor: colors.accentGold },
  dotFull: { backgroundColor: colors.statusSuccess },
  dotCurrent: { borderWidth: 1.5, borderColor: colors.accentGold },
});
