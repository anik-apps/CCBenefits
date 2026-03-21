import ScreenWrapper from '../components/ScreenWrapper';
import LoadingScreen from '../components/LoadingScreen';
import YearPicker from '../components/YearPicker';
import PastYearBanner from '../components/PastYearBanner';
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserCard, logUsage, updateUsage, deleteUsage, deleteUserCard, updateBenefitSetting, updateUserCard, closeCard, reopenCard } from '../services/api';
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
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitStatus | null>(null);
  const [perceivedBenefit, setPerceivedBenefit] = useState<BenefitStatus | null>(null);
  const [editingRenewal, setEditingRenewal] = useState(false);
  const [renewalInput, setRenewalInput] = useState('');
  const { data: card, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-card', id, year],
    queryFn: () => getUserCard(id, year),
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

  const [showCloseInput, setShowCloseInput] = useState(false);
  const [closeDateInput, setCloseDateInput] = useState('');

  const handleClose = () => {
    const today = new Date().toISOString().split('T')[0];
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Close Card',
        'Enter close date (YYYY-MM-DD):',
        async (input) => {
          const dateStr = input?.trim() || today;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            Alert.alert('Invalid Date', 'Please use YYYY-MM-DD format.');
            return;
          }
          try {
            await closeCard(id, dateStr);
            await refreshAllCardData(queryClient);
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to close card.');
          }
        },
        'plain-text',
        today,
      );
    } else {
      setCloseDateInput(today);
      setShowCloseInput(true);
    }
  };

  const handleCloseConfirm = async () => {
    const dateStr = closeDateInput.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      Alert.alert('Invalid Date', 'Please use YYYY-MM-DD format.');
      return;
    }
    try {
      await closeCard(id, dateStr);
      setShowCloseInput(false);
      await refreshAllCardData(queryClient);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to close card.');
    }
  };

  const handleReopen = () => {
    Alert.alert('Reopen Card', `Reopen ${card?.card_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reopen', onPress: async () => {
          try {
            await reopenCard(id);
            await refreshAllCardData(queryClient);
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to reopen card.');
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
          <YearPicker selectedYear={year} onChange={setYear} />
        </View>
        <View style={styles.cardHeaderRow}>
          <CardIcon issuer={card.issuer} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.cardName}>{card.card_name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={styles.issuer}>{card.issuer} · ${card.annual_fee}/yr</Text>
              {card.closed_date && (
                <View style={styles.closedBadge}>
                  <Text style={styles.closedBadgeText}>Closed</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Renewal date */}
        <View style={styles.renewalRow}>
          {card.renewal_date && !editingRenewal ? (
            <View style={styles.renewalDisplay}>
              <Text style={styles.renewalLabel}>Renews: </Text>
              <Text style={styles.renewalDate}>
                {new Date(card.renewal_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => { setRenewalInput(card.renewal_date ?? ''); setEditingRenewal(true); }}>
                <Text style={styles.renewalAction}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => {
                await updateUserCard(id, { renewal_date: null });
                await refreshAllCardData(queryClient);
              }}>
                <Text style={styles.renewalClear}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.renewalEdit}>
              <Text style={styles.renewalPrompt}>
                {editingRenewal ? 'Renewal date:' : 'Add renewal date for fee reminders'}
              </Text>
              <View style={styles.renewalInputRow}>
                <TextInput
                  style={styles.renewalInput}
                  placeholder="e.g. 2026-01-15"
                  placeholderTextColor={colors.textMuted}
                  value={renewalInput}
                  onChangeText={setRenewalInput}
                  maxLength={10}
                  keyboardType="numbers-and-punctuation"
                />
                <TouchableOpacity onPress={async () => {
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(renewalInput) || isNaN(new Date(renewalInput).getTime())) {
                    Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format.');
                    return;
                  }
                  try {
                    await updateUserCard(id, { renewal_date: renewalInput });
                    setEditingRenewal(false);
                    setRenewalInput('');
                    await refreshAllCardData(queryClient);
                  } catch {
                    Alert.alert('Error', 'Failed to update renewal date. Please try again.');
                  }
                }}>
                  <Text style={styles.renewalAction}>Save</Text>
                </TouchableOpacity>
                {editingRenewal && (
                  <TouchableOpacity onPress={() => { setEditingRenewal(false); setRenewalInput(''); }}>
                    <Text style={styles.renewalClear}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </View>

      <PastYearBanner year={year} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {card.benefits_status.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>No benefits for this card</Text>
          </View>
        )}
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
                <Text style={styles.benefitEdit}>Value ✎</Text>
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

        {showCloseInput && (
          <View style={styles.closeInputRow}>
            <Text style={styles.closeInputLabel}>Close date:</Text>
            <TextInput
              style={styles.closeInputField}
              value={closeDateInput}
              onChangeText={setCloseDateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              maxLength={10}
              keyboardType="numbers-and-punctuation"
            />
            <TouchableOpacity onPress={handleCloseConfirm}>
              <Text style={styles.closeInputConfirm}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCloseInput(false)}>
              <Text style={styles.closeInputCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.cardActions}>
          {card.closed_date ? (
            <TouchableOpacity style={styles.reopenBtn} onPress={handleReopen}>
              <Text style={styles.reopenBtnText}>Reopen Card</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>Close Card</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteCard}>
            <Text style={styles.deleteBtnText}>Delete Card</Text>
          </TouchableOpacity>
        </View>
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
  cardActions: { marginTop: spacing.xl, gap: spacing.md },
  closeBtn: {
    padding: spacing.md, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.accentGoldDim, alignItems: 'center',
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  closeBtnText: { color: colors.accentGold, fontWeight: '600', fontSize: 13 },
  reopenBtn: {
    padding: spacing.md, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.statusSuccess, alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  reopenBtnText: { color: colors.statusSuccess, fontWeight: '600', fontSize: 13 },
  deleteBtn: {
    padding: spacing.md, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.statusDanger, alignItems: 'center',
  },
  deleteBtnText: { color: colors.statusDanger, fontWeight: '600', fontSize: 13 },
  closedBadge: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  closedBadgeText: { fontSize: 10, fontWeight: '600', color: colors.accentGold },
  closeInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.lg, padding: spacing.md,
    backgroundColor: colors.bgTertiary, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.borderMedium,
  },
  closeInputLabel: { fontSize: 13, color: colors.textSecondary },
  closeInputField: {
    flex: 1, backgroundColor: colors.bgSecondary, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.borderSubtle,
    paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 13, color: colors.textPrimary,
  },
  closeInputConfirm: { fontSize: 13, fontWeight: '600', color: colors.accentGold },
  closeInputCancel: { fontSize: 13, color: colors.textMuted },
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
  renewalRow: { marginTop: spacing.sm },
  renewalDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  renewalLabel: { fontSize: 13, color: colors.textMuted },
  renewalDate: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  renewalAction: { fontSize: 12, color: colors.accentGold, marginLeft: 8 },
  renewalClear: { fontSize: 12, color: colors.textMuted, marginLeft: 8 },
  renewalEdit: {},
  renewalPrompt: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  renewalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  renewalInput: {
    backgroundColor: colors.bgTertiary, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.borderSubtle,
    paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 13, color: colors.textPrimary, minWidth: 120,
  },
});
