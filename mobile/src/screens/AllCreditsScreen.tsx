import ScreenWrapper from '../components/ScreenWrapper';
import LoadingScreen from '../components/LoadingScreen';
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserCardDetails, logUsage, updateUsage, deleteUsage } from '../services/api';
import UsageModal from '../components/UsageModal';
import { colors, spacing, radius, getIssuerColor } from '../theme';
import { getCategoryIcon, getCategoryColor } from '../constants/categoryTheme';
import { PERIOD_ORDER, PERIOD_LABELS } from '../constants/periodLabels';
import { refreshAllCardData } from '../utils/queryHelpers';
import type { BenefitStatus, UserCardDetail } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'AllCredits'>;

type TabMode = 'period' | 'card';

interface BenefitWithCard extends BenefitStatus {
  userCardId: number;
  cardName: string;
  issuer: string;
}

export default function AllCreditsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitWithCard | null>(null);
  const [activeTab, setActiveTab] = useState<TabMode>('period');

  const { data: cardDetails, isLoading } = useQuery({
    queryKey: ['all-card-details-batch'],
    queryFn: getUserCardDetails,
  });

  const handleLogUsage = async (amount: number, notes?: string, targetDate?: string) => {
    if (!selectedBenefit) return;
    await logUsage(selectedBenefit.userCardId, selectedBenefit.benefit_template_id, amount, notes, targetDate);
    await refreshAllCardData(queryClient);
  };

  const handleUpdateUsage = async (usageId: number, amount: number, notes?: string) => {
    await updateUsage(usageId, amount, notes);
    await refreshAllCardData(queryClient);
  };

  const handleDeleteUsage = async (usageId: number) => {
    await deleteUsage(usageId);
    await refreshAllCardData(queryClient);
  };

  if (isLoading || !cardDetails) {
    return <LoadingScreen />;
  }

  const allBenefits: BenefitWithCard[] = cardDetails.flatMap(card =>
    card.benefits_status.map(b => ({ ...b, userCardId: card.id, cardName: card.card_name, issuer: card.issuer }))
  );

  const periodSections = PERIOD_ORDER
    .map(period => ({
      title: PERIOD_LABELS[period] || period,
      data: allBenefits.filter(b => b.period_type === period),
    }))
    .filter(s => s.data.length > 0);

  const cardSections = [...cardDetails]
    .sort((a, b) => (a.utilization_pct ?? 0) - (b.utilization_pct ?? 0))
    .map(card => ({
      card,
      title: card.card_name,
      data: [...card.benefits_status]
        .map(b => ({ ...b, userCardId: card.id, cardName: card.card_name, issuer: card.issuer }))
        .sort((a, b) => b.remaining - a.remaining),
    }))
    .filter(s => s.data.length > 0);

  const sections = activeTab === 'period' ? periodSections : cardSections;

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>All Credits</Text>
        <Text style={styles.subtitle}>{allBenefits.length} benefits across {cardDetails.length} cards</Text>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'period' && styles.tabBtnActive]}
          onPress={() => setActiveTab('period')}
        >
          <Text style={[styles.tabText, activeTab === 'period' && styles.tabTextActive]}>By Period</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'card' && styles.tabBtnActive]}
          onPress={() => setActiveTab('card')}
        >
          <Text style={[styles.tabText, activeTab === 'card' && styles.tabTextActive]}>By Card</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${activeTab}-${item.benefit_template_id}-${item.cardName}-${index}`}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => {
          if (activeTab === 'card' && 'card' in section) {
            const card = (section as typeof cardSections[number]).card;
            const issuerColor = getIssuerColor(card.issuer);
            return (
              <View style={[styles.cardSectionHeader, { borderLeftColor: issuerColor.bg }]}>
                <View style={styles.cardSectionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardSectionName}>{card.nickname || card.card_name}</Text>
                    <Text style={styles.cardSectionIssuer}>{card.issuer}</Text>
                  </View>
                  <View style={styles.cardSectionStats}>
                    <Text style={styles.cardSectionFee}>${card.annual_fee} fee</Text>
                    <Text style={[
                      styles.cardSectionUtil,
                      { color: (card.utilization_pct ?? 0) > 50 ? colors.statusSuccess : colors.accentGold },
                    ]}>
                      {(card.utilization_pct ?? 0).toFixed(0)}% util
                    </Text>
                  </View>
                </View>
              </View>
            );
          }
          return <Text style={styles.sectionHeader}>{section.title}</Text>;
        }}
        renderItem={({ item }) => {
          const catIcon = getCategoryIcon(item.category);
          const catColor = getCategoryColor(item.category);

          if (activeTab === 'card') {
            const remainingPct = item.max_value > 0 ? (item.remaining / item.max_value) : 0;
            const statusColor = item.is_used
              ? (item.remaining <= 0 ? colors.statusSuccess : colors.accentGold)
              : colors.textMuted;
            return (
              <TouchableOpacity
                style={styles.benefitCard}
                onPress={() => setSelectedBenefit(item)}
                activeOpacity={0.7}
              >
                <View style={styles.benefitRow}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <View style={[styles.catIconBox, { backgroundColor: catColor + '20', borderColor: catColor + '40' }]}>
                    <Text style={styles.catIconText}>{catIcon}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.benefitName}>{item.name}</Text>
                    <Text style={styles.cardLabel}>{item.category}</Text>
                  </View>
                  <View style={styles.benefitRight}>
                    <Text style={styles.benefitMax}>${item.max_value}</Text>
                    <Text style={styles.benefitUsedLabel}>
                      ${item.amount_used} used / ${item.remaining} left
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.md },
  backText: { color: colors.accentGold, fontSize: 14, marginBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  tabRow: {
    flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md,
    backgroundColor: colors.bgTertiary, borderRadius: radius.sm, padding: 3,
  },
  tabBtn: {
    flex: 1, paddingVertical: spacing.sm, alignItems: 'center',
    borderRadius: radius.sm - 2,
  },
  tabBtnActive: {
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.borderMedium,
  },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.accentGold, fontWeight: '600' },
  list: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  sectionHeader: {
    fontSize: 13, fontWeight: '600', color: colors.accentGold, textTransform: 'uppercase',
    letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  cardSectionHeader: {
    backgroundColor: colors.bgTertiary, borderRadius: radius.md,
    padding: spacing.md, marginTop: spacing.lg, marginBottom: spacing.sm,
    borderLeftWidth: 4, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  cardSectionRow: { flexDirection: 'row', alignItems: 'center' },
  cardSectionName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  cardSectionIssuer: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  cardSectionStats: { alignItems: 'flex-end' },
  cardSectionFee: { fontSize: 12, color: colors.textSecondary },
  cardSectionUtil: { fontSize: 13, fontWeight: '600', marginTop: 2 },
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
  benefitMax: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  benefitUsedLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm, marginTop: 6 },
  dotsRow: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bgTertiary },
  dotPartial: { backgroundColor: colors.accentGold },
  dotFull: { backgroundColor: colors.statusSuccess },
  dotCurrent: { borderWidth: 1.5, borderColor: colors.accentGold },
});
