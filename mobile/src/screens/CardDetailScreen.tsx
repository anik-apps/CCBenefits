import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserCard, logUsage, updateUsage, deleteUsage } from '../services/api';
import UsageModal from '../components/UsageModal';
import { colors, spacing, radius } from '../theme';
import type { BenefitStatus } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'CardDetail'>;

export default function CardDetailScreen({ route, navigation }: Props) {
  const { id } = route.params as { id: number };
  const queryClient = useQueryClient();
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitStatus | null>(null);

  const { data: card, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-card', id],
    queryFn: () => getUserCard(id),
  });

  const handleLogUsage = async (amount: number, notes?: string, targetDate?: string) => {
    if (!selectedBenefit) return;
    await logUsage(id, selectedBenefit.benefit_template_id, amount, notes, targetDate);
    await queryClient.invalidateQueries({ queryKey: ['user-card', id] });
    await queryClient.invalidateQueries({ queryKey: ['user-cards'] });
    await queryClient.invalidateQueries({ queryKey: ['all-card-details'] });
  };

  const handleUpdateUsage = async (usageId: number, amount: number, notes?: string) => {
    await updateUsage(usageId, amount, notes);
    await queryClient.invalidateQueries({ queryKey: ['user-card', id] });
    await queryClient.invalidateQueries({ queryKey: ['user-cards'] });
    await queryClient.invalidateQueries({ queryKey: ['all-card-details'] });
  };

  const handleDeleteUsage = async (usageId: number) => {
    await deleteUsage(usageId);
    await queryClient.invalidateQueries({ queryKey: ['user-card', id] });
    await queryClient.invalidateQueries({ queryKey: ['user-cards'] });
    await queryClient.invalidateQueries({ queryKey: ['all-card-details'] });
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.accentGold} /></View>;
  }

  if (isError || !card) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load card</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.cardName}>{card.card_name}</Text>
        <Text style={styles.issuer}>{card.issuer} · ${card.annual_fee}/yr</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {card.benefits_status.map((benefit) => (
          <TouchableOpacity
            key={benefit.benefit_template_id}
            style={styles.benefitCard}
            onPress={() => setSelectedBenefit(benefit)}
            activeOpacity={0.7}
          >
            <View style={styles.benefitHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitName}>{benefit.name}</Text>
                {benefit.description ? (
                  <Text style={styles.benefitDesc}>{benefit.description}</Text>
                ) : null}
              </View>
              <View style={styles.benefitRight}>
                <Text style={styles.benefitValue}>${benefit.max_value}</Text>
                <Text style={styles.benefitPeriod}>{benefit.period_type}</Text>
              </View>
            </View>

            {/* Period segments */}
            <View style={styles.periodsRow}>
              {benefit.periods.map((p) => {
                const isFullyUsed = p.is_used && p.amount_used >= benefit.max_value;
                const isPartial = p.is_used && !isFullyUsed;
                return (
                  <View
                    key={p.label}
                    style={[
                      styles.periodDot,
                      isPartial && styles.periodPartial,
                      isFullyUsed && styles.periodFull,
                      p.is_current && styles.periodCurrent,
                      p.is_future && styles.periodFuture,
                    ]}
                  >
                    <Text style={[
                      styles.periodLabel,
                      isPartial && styles.periodLabelPartial,
                      isFullyUsed && styles.periodLabelFull,
                    ]}>
                      {p.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Usage status + tap hint */}
            <View style={styles.usageRow}>
              <Text style={styles.usageText}>
                {benefit.is_used ? `Used: $${benefit.amount_used}` : 'Not used'}
              </Text>
              <Text style={styles.tapHint}>
                {benefit.is_used ? 'Tap to edit' : 'Tap to log'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.md },
  backText: { color: colors.accentGold, fontSize: 14, marginBottom: spacing.sm },
  cardName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  issuer: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  benefitCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  benefitHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  benefitName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  benefitDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  benefitRight: { alignItems: 'flex-end' },
  benefitValue: { fontSize: 15, fontWeight: '700', color: colors.accentGold },
  benefitPeriod: { fontSize: 11, color: colors.textMuted, textTransform: 'capitalize' },
  periodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  periodDot: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
    backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  periodPartial: { backgroundColor: 'rgba(201,168,76,0.15)', borderColor: colors.accentGoldDim },
  periodFull: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: colors.statusSuccess },
  periodCurrent: { borderColor: colors.accentGold, borderWidth: 2 },
  periodFuture: { opacity: 0.4 },
  periodLabel: { fontSize: 10, color: colors.textMuted },
  periodLabelPartial: { color: colors.accentGold, fontWeight: '600' },
  periodLabelFull: { color: colors.statusSuccess, fontWeight: '600' },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usageText: { fontSize: 12, color: colors.textSecondary },
  tapHint: { fontSize: 11, color: colors.accentGold },
  errorText: { color: colors.statusDanger, fontSize: 15, marginBottom: spacing.md },
  retryText: { color: colors.accentGold, fontSize: 14 },
});
