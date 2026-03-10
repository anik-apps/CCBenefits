import React from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getUserCards, getUserCard } from '../services/api';
import { colors, spacing, radius } from '../theme';
import type { BenefitStatus } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'AllCredits'>;

interface BenefitWithCard extends BenefitStatus {
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

  if (isLoading || !cardDetails) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.accentGold} /></View>;
  }

  // Group all benefits by period type
  const allBenefits: BenefitWithCard[] = cardDetails.flatMap(card =>
    card.benefits_status.map(b => ({ ...b, cardName: card.card_name }))
  );

  const sections = PERIOD_ORDER
    .map(period => ({
      title: PERIOD_LABELS[period] || period,
      data: allBenefits.filter(b => b.period_type === period),
    }))
    .filter(s => s.data.length > 0);

  return (
    <View style={styles.container}>
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
          <View style={styles.benefitCard}>
            <View style={styles.benefitRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitName}>{item.name}</Text>
                <Text style={styles.cardLabel}>{item.cardName}</Text>
              </View>
              <View style={styles.benefitRight}>
                <Text style={[styles.benefitValue, item.is_used && styles.benefitUsed]}>
                  ${item.amount_used} / ${item.max_value}
                </Text>
                <Text style={styles.benefitStatus}>
                  {item.is_used ? 'Used' : `${item.days_remaining}d left`}
                </Text>
              </View>
            </View>
            {/* Mini period dots */}
            <View style={styles.dotsRow}>
              {item.periods.map(p => (
                <View
                  key={p.label}
                  style={[
                    styles.dot,
                    p.is_used && styles.dotUsed,
                    p.is_current && styles.dotCurrent,
                  ]}
                />
              ))}
            </View>
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
  benefitUsed: { color: colors.accentGold },
  benefitStatus: { fontSize: 11, color: colors.textMuted },
  dotsRow: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bgTertiary },
  dotUsed: { backgroundColor: colors.accentGold },
  dotCurrent: { borderWidth: 1.5, borderColor: colors.accentGold },
});
