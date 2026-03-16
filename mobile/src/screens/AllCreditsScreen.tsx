import ScreenWrapper from '../components/ScreenWrapper';
import LoadingScreen from '../components/LoadingScreen';
import React, { useState } from 'react';
import { View, Text, StyleSheet, SectionList, ScrollView, TouchableOpacity } from 'react-native';
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

type TabMode = 'period' | 'card' | 'sheet';

interface BenefitWithCard extends BenefitStatus {
  userCardId: number;
  cardName: string;
  issuer: string;
}

export default function AllCreditsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitWithCard | null>(null);
  const [activeTab, setActiveTab] = useState<TabMode>('period');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const { data: cardDetails, isLoading } = useQuery({
    queryKey: ['all-card-details'],
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
      key: `period-${period}`,
      title: PERIOD_LABELS[period] || period,
      data: allBenefits.filter(b => b.period_type === period),
    }))
    .filter(s => s.data.length > 0);

  const sortedCards = [...cardDetails].sort((a, b) => (a.utilization_pct ?? 0) - (b.utilization_pct ?? 0));

  const cardSections = sortedCards
    .map(card => ({
      key: `card-${card.id}`,
      card,
      title: card.card_name,
      data: [...card.benefits_status]
        .map(b => ({ ...b, userCardId: card.id, cardName: card.card_name, issuer: card.issuer }))
        .sort((a, b) => b.remaining - a.remaining),
    }))
    .filter(s => s.data.length > 0);

  const sections = activeTab === 'period' ? periodSections : cardSections;

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSectionCollapsed = (key: string, index: number) => {
    if (collapsedSections.size === 0 && index > 0) return true;
    if (collapsedSections.size === 0 && index === 0) return false;
    return collapsedSections.has(key);
  };

  // Grand totals for sheet
  const grandTotalFees = cardDetails.reduce((s, c) => s + c.annual_fee, 0);
  const grandTotalMax = allBenefits.reduce((s, b) => s + b.max_value, 0);
  const grandTotalUsed = allBenefits.reduce((s, b) => s + b.amount_used, 0);
  const grandUtilization = grandTotalMax > 0 ? (grandTotalUsed / grandTotalMax) * 100 : 0;

  const getStatusColor = (b: BenefitStatus) => {
    if (b.is_used && b.amount_used >= b.max_value) return colors.statusSuccess;
    if (b.amount_used > 0) return colors.accentGold;
    return colors.textMuted;
  };

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
        {(['period', 'card', 'sheet'] as TabMode[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => { setActiveTab(tab); setCollapsedSections(new Set()); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'period' ? 'By Period' : tab === 'card' ? 'By Card' : 'Sheet'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===== SHEET VIEW ===== */}
      {activeTab === 'sheet' && (
        <ScrollView horizontal style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
          <View>
            {/* Header row */}
            <View style={styles.sheetRow}>
              <Text style={[styles.sheetHeader, { width: 100 }]}>Card</Text>
              <Text style={[styles.sheetHeader, { width: 130 }]}>Benefit</Text>
              <Text style={[styles.sheetHeader, { width: 70 }]}>Period</Text>
              <Text style={[styles.sheetHeader, styles.sheetRight, { width: 60 }]}>Max</Text>
              <Text style={[styles.sheetHeader, styles.sheetRight, { width: 60 }]}>Used</Text>
              <Text style={[styles.sheetHeader, styles.sheetRight, { width: 60 }]}>Left</Text>
              <Text style={[styles.sheetHeader, styles.sheetRight, { width: 45 }]}>%</Text>
            </View>
            {/* Data rows */}
            {sortedCards.map(card => {
              const issuerColor = getIssuerColor(card.issuer).bg;
              const sorted = [...card.benefits_status].sort((a, b) => b.remaining - a.remaining);
              return sorted.map((b, i) => {
                const pct = b.max_value > 0 ? (b.amount_used / b.max_value) * 100 : 0;
                return (
                  <View key={`${card.id}-${b.benefit_template_id}`} style={[styles.sheetRow, { borderLeftWidth: 3, borderLeftColor: issuerColor, backgroundColor: issuerColor + '0A' }]}>
                    <Text style={[styles.sheetCell, { width: 100, color: colors.textSecondary }]} numberOfLines={1}>
                      {i === 0 ? (card.nickname || card.card_name) : ''}
                    </Text>
                    <Text style={[styles.sheetCell, { width: 130 }]} numberOfLines={1}>{b.name}</Text>
                    <Text style={[styles.sheetCell, { width: 70, color: colors.textMuted, textTransform: 'capitalize' }]}>
                      {PERIOD_LABELS[b.period_type] || b.period_type}
                    </Text>
                    <Text style={[styles.sheetCell, styles.sheetRight, { width: 60 }]}>${b.max_value}</Text>
                    <Text style={[styles.sheetCell, styles.sheetRight, { width: 60, color: colors.accentGold }]}>${b.amount_used}</Text>
                    <Text style={[styles.sheetCell, styles.sheetRight, { width: 60 }]}>${b.remaining}</Text>
                    <Text style={[styles.sheetCell, styles.sheetRight, { width: 45, fontWeight: '600', color: getStatusColor(b) }]}>
                      {pct.toFixed(0)}%
                    </Text>
                  </View>
                );
              });
            })}
            {/* Grand total */}
            <View style={[styles.sheetRow, { borderTopWidth: 2, borderTopColor: colors.borderMedium }]}>
              <Text style={[styles.sheetCell, { width: 100, fontWeight: '700' }]}>Total</Text>
              <Text style={[styles.sheetCell, { width: 130, color: colors.textMuted }]}>Fees: ${grandTotalFees}</Text>
              <Text style={[styles.sheetCell, { width: 70 }]}></Text>
              <Text style={[styles.sheetCell, styles.sheetRight, { width: 60, fontWeight: '700' }]}>${grandTotalMax}</Text>
              <Text style={[styles.sheetCell, styles.sheetRight, { width: 60, fontWeight: '700', color: colors.accentGold }]}>${grandTotalUsed}</Text>
              <Text style={[styles.sheetCell, styles.sheetRight, { width: 60, fontWeight: '700' }]}>${grandTotalMax - grandTotalUsed}</Text>
              <Text style={[styles.sheetCell, styles.sheetRight, { width: 45, fontWeight: '700', color: grandUtilization >= 80 ? colors.statusSuccess : colors.accentGold }]}>
                {grandUtilization.toFixed(0)}%
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ===== PERIOD + CARD VIEWS with collapsible sections ===== */}
      {activeTab !== 'sheet' && (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${activeTab}-${item.benefit_template_id}-${item.cardName}-${index}`}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => {
            const sectionKey = (section as any).key || section.title;
            const sectionIndex = sections.findIndex(s => ((s as any).key || s.title) === sectionKey);
            const collapsed = isSectionCollapsed(sectionKey, sectionIndex);

            if (activeTab === 'card' && 'card' in section) {
              const card = (section as typeof cardSections[number]).card;
              const issuerColor = getIssuerColor(card.issuer);
              return (
                <TouchableOpacity onPress={() => toggleSection(sectionKey)} activeOpacity={0.7}>
                  <View style={[styles.cardSectionHeader, { borderLeftColor: issuerColor.bg }]}>
                    <View style={styles.cardSectionRow}>
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginRight: spacing.xs }}>{collapsed ? '▶' : '▼'}</Text>
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
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity onPress={() => toggleSection(sectionKey)} activeOpacity={0.7}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginRight: spacing.xs }}>{collapsed ? '▶' : '▼'}</Text>
                  <Text style={styles.sectionHeader}>{section.title} ({section.data.length})</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          renderItem={({ item, section }) => {
            const sectionKey = (section as any).key || section.title;
            const sectionIndex = sections.findIndex(s => ((s as any).key || s.title) === sectionKey);
            if (isSectionCollapsed(sectionKey, sectionIndex)) return null;

            const catIcon = getCategoryIcon(item.category);
            const catColor = getCategoryColor(item.category);

            if (activeTab === 'card') {
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
      )}

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
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderMedium,
  },
  tabText: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.accentGold, fontWeight: '600' },
  list: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  sectionHeader: {
    fontSize: 13, fontWeight: '600', color: colors.accentGold, textTransform: 'uppercase',
    letterSpacing: 1,
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
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
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
  // Sheet styles
  sheetRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
    alignItems: 'center',
  },
  sheetHeader: {
    fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.5, paddingVertical: 8, paddingHorizontal: 6,
  },
  sheetCell: {
    fontSize: 12, color: colors.textPrimary, paddingVertical: 6, paddingHorizontal: 6,
  },
  sheetRight: { textAlign: 'right' },
});
