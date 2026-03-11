import ScreenWrapper from '../components/ScreenWrapper';
import LoadingScreen from '../components/LoadingScreen';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserCard, logUsage, updateUsage, deleteUsage, deleteUserCard, updateBenefitSetting } from '../services/api';
import UsageModal from '../components/UsageModal';
import PerceivedValueModal from '../components/PerceivedValueModal';
import CardIcon from '../components/CardIcon';
import { Alert } from 'react-native';
import { colors, spacing, radius, getIssuerColor } from '../theme';
import { getCategoryIcon, getCategoryColor } from '../constants/categoryTheme';
import { refreshAllCardData } from '../utils/queryHelpers';
import type { BenefitStatus } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'CardDetail'>;

export default function CardDetailScreen({ route, navigation }: Props) {
  const { id } = route.params as { id: number };
  const queryClient = useQueryClient();
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitStatus | null>(null);
  const [perceivedBenefit, setPerceivedBenefit] = useState<BenefitStatus | null>(null);

  const { data: card, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-card', id],
    queryFn: () => getUserCard(id),
  });

  const handleLogUsage = async (amount: number, notes?: string, targetDate?: string) => {
    if (!selectedBenefit) return;
    await logUsage(id, selectedBenefit.benefit_template_id, amount, notes, targetDate);
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

  const handleUpdatePerceivedValue = async (benefitTemplateId: number, value: number) => {
    await updateBenefitSetting(id, benefitTemplateId, value);
    await refreshAllCardData(queryClient);
  };

  const handleDeleteCard = () => {
    Alert.alert('Delete Card', `Remove ${card?.card_name} from your collection?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteUserCard(id);
            await refreshAllCardData(queryClient);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete card. Please try again.');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return <LoadingScreen />;
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
    <ScreenWrapper>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteCard}>
            <Text style={styles.deleteCardText}>Delete Card</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardHeaderRow}>
          <CardIcon issuer={card.issuer} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.cardName}>{card.card_name}</Text>
            <Text style={styles.issuer}>{card.issuer} · ${card.annual_fee}/yr</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {card.benefits_status.map((benefit) => {
          const catIcon = getCategoryIcon(benefit.category);
          const catColor = getCategoryColor(benefit.category);
          const issuerBorderColor = getIssuerColor(card.issuer).bg;
          return (
          <TouchableOpacity
            key={benefit.benefit_template_id}
            style={[styles.benefitCard, { borderLeftWidth: 3, borderLeftColor: issuerBorderColor }]}
            onPress={() => setSelectedBenefit(benefit)}
            activeOpacity={0.7}
          >
            <View style={styles.benefitHeader}>
              <View style={[styles.catIconBox, { backgroundColor: catColor + '20', borderColor: catColor + '40' }]}>
                <Text style={styles.catIconText}>{catIcon}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.benefitName}>{benefit.name}</Text>
                {benefit.description ? (
                  <Text style={styles.benefitDesc} numberOfLines={2}>{benefit.description}</Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.benefitRight} onPress={() => setPerceivedBenefit(benefit)}>
                <Text style={styles.benefitValue}>${benefit.max_value}</Text>
                {benefit.perceived_max_value !== benefit.max_value && (
                  <Text style={styles.perceivedValue}>You: ${benefit.perceived_max_value}</Text>
                )}
                <Text style={styles.benefitEdit}>Edit ✎</Text>
                <Text style={styles.benefitPeriod}>{benefit.period_type}</Text>
              </TouchableOpacity>
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
          );
        })}
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

      {perceivedBenefit && (
        <PerceivedValueModal
          visible={!!perceivedBenefit}
          benefit={perceivedBenefit}
          onClose={() => setPerceivedBenefit(null)}
          onSave={handleUpdatePerceivedValue}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgPrimary },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  backText: { color: colors.accentGold, fontSize: 14 },
  deleteCardText: { color: colors.statusDanger, fontSize: 13 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  cardName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  issuer: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  scroll: { padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl },
  benefitCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  benefitHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  catIconBox: {
    width: 36, height: 36, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  catIconText: { fontSize: 16 },
  benefitName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  benefitDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  benefitRight: { alignItems: 'flex-end', marginLeft: 'auto' },
  benefitValue: { fontSize: 15, fontWeight: '700', color: colors.accentGold },
  perceivedValue: { fontSize: 11, color: colors.statusSuccess, marginTop: 1 },
  benefitEdit: { fontSize: 11, color: colors.accentGold, marginTop: 2 },
  benefitPeriod: { fontSize: 10, color: colors.textMuted, textTransform: 'capitalize', marginTop: 1 },
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
