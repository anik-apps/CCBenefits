import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Switch, ScrollView } from 'react-native';
import { colors, spacing, radius } from '../theme';
import type { BenefitStatus, PeriodSegment } from '../types';

interface Props {
  visible: boolean;
  benefit: BenefitStatus;
  onClose: () => void;
  onLogUsage: (amount: number, notes?: string, targetDate?: string) => Promise<void>;
  onUpdateUsage: (usageId: number, amount: number, notes?: string) => Promise<void>;
  onDeleteUsage: (usageId: number) => Promise<void>;
}

export default function UsageModal({ visible, benefit, onClose, onLogUsage, onUpdateUsage, onDeleteUsage }: Props) {
  const isBinary = benefit.redemption_type === 'binary';

  // Find current period and any period with existing usage
  const currentPeriod = benefit.periods.find(p => p.is_current);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodSegment>(currentPeriod || benefit.periods[0]);

  const periodUsage = selectedPeriod?.usage_id != null;
  const periodAmount = periodUsage ? selectedPeriod.amount_used : 0;

  const [amount, setAmount] = useState(periodUsage ? periodAmount.toString() : '');
  const [binaryUsed, setBinaryUsed] = useState(periodUsage && periodAmount > 0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePeriodSelect = (period: PeriodSegment) => {
    setSelectedPeriod(period);
    if (period.usage_id != null) {
      setAmount(period.amount_used.toString());
      setBinaryUsed(period.amount_used > 0);
    } else {
      setAmount('');
      setBinaryUsed(false);
    }
    setNotes('');
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const usageAmount = isBinary
        ? (binaryUsed ? benefit.max_value : 0)
        : parseFloat(amount);

      if (!isBinary && (isNaN(usageAmount) || usageAmount < 0)) {
        setError('Enter a valid amount');
        setLoading(false);
        return;
      }

      if (selectedPeriod?.usage_id != null) {
        await onUpdateUsage(selectedPeriod.usage_id, usageAmount, notes || undefined);
      } else {
        // Pass the period's start date so the backend logs to the correct period
        await onLogUsage(usageAmount, notes || undefined, selectedPeriod?.period_start_date);
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPeriod?.usage_id) return;
    setLoading(true);
    try {
      await onDeleteUsage(selectedPeriod.usage_id);
      onClose();
    } catch {
      setError('Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{benefit.name}</Text>
            <Text style={[styles.subtitle, !benefit.description && { marginBottom: spacing.lg }]}>
              ${benefit.max_value} / {benefit.period_type}
            </Text>
            {benefit.description ? (
              <Text style={styles.description}>{benefit.description}</Text>
            ) : null}

            {/* Period selector */}
            {benefit.periods.length === 0 ? (
              <Text style={styles.futureText}>No periods available for this benefit.</Text>
            ) : (
            <>
            <Text style={styles.label}>Period</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
              <View style={styles.periodRow}>
                {benefit.periods.filter(p => !p.is_future).map(p => {
                  const isFullyUsed = p.is_used && p.amount_used >= benefit.max_value;
                  const isPartial = p.is_used && !isFullyUsed;
                  const isSelected = selectedPeriod?.label === p.label;
                  return (
                    <TouchableOpacity
                      key={p.label}
                      style={[
                        styles.periodBtn,
                        isPartial && styles.periodBtnPartial,
                        isFullyUsed && styles.periodBtnFull,
                        isSelected && styles.periodBtnActive,
                      ]}
                      onPress={() => handlePeriodSelect(p)}
                    >
                      <Text style={[
                        styles.periodBtnText,
                        isSelected && styles.periodBtnTextActive,
                        isFullyUsed && !isSelected && styles.periodBtnTextFull,
                      ]}>
                        {p.label}
                      </Text>
                      {isFullyUsed && <Text style={styles.periodDotFull}>●</Text>}
                      {isPartial && <Text style={styles.periodDot}>◐</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {selectedPeriod?.is_future ? (
              <Text style={styles.futureText}>This period hasn't started yet.</Text>
            ) : (
              <>
                {isBinary ? (
                  <View style={styles.binaryRow}>
                    <Text style={styles.binaryLabel}>Used this period</Text>
                    <Switch
                      value={binaryUsed}
                      onValueChange={setBinaryUsed}
                      trackColor={{ false: colors.bgTertiary, true: colors.accentGold }}
                      thumbColor={binaryUsed ? colors.bgPrimary : colors.textMuted}
                    />
                  </View>
                ) : (
                  <>
                    <View style={styles.amountLabelRow}>
                      <Text style={styles.label}>Amount Used</Text>
                      <TouchableOpacity onPress={() => setAmount(benefit.max_value.toString())}>
                        <Text style={styles.maxBtn}>Fill Max (${benefit.max_value})</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      placeholder={`Max: $${benefit.max_value}`}
                      placeholderTextColor={colors.textMuted}
                    />
                  </>
                )}

                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g., Uber Eats order"
                  placeholderTextColor={colors.textMuted}
                  multiline
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <Text style={styles.submitText}>
                    {loading ? 'Saving...' : selectedPeriod?.usage_id != null ? 'Update Usage' : 'Log Usage'}
                  </Text>
                </TouchableOpacity>

                {selectedPeriod?.usage_id != null && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={loading}>
                    <Text style={styles.deleteText}>Delete Usage</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            </>
            )}

            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.xxl,
  },
  modal: {
    backgroundColor: colors.bgSecondary, borderRadius: radius.md,
    padding: spacing.xxl, width: '100%', maxWidth: 400, maxHeight: '85%',
    borderWidth: 1, borderColor: colors.borderMedium,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
  description: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 18 },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
  amountLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  maxBtn: { fontSize: 12, color: colors.accentGold, fontWeight: '600' },
  input: {
    backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.borderMedium,
    borderRadius: radius.sm, padding: spacing.md, color: colors.textPrimary,
    fontSize: 15, marginBottom: spacing.lg,
  },
  periodScroll: { marginBottom: spacing.lg },
  periodRow: { flexDirection: 'row', gap: spacing.sm },
  periodBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderMedium,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  periodBtnActive: { borderColor: colors.accentGold, backgroundColor: 'rgba(201,168,76,0.12)' },
  periodBtnPartial: { backgroundColor: 'rgba(201,168,76,0.08)', borderColor: colors.accentGoldDim },
  periodBtnFull: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: colors.statusSuccess },
  periodBtnText: { fontSize: 13, color: colors.textMuted },
  periodBtnTextActive: { color: colors.accentGold, fontWeight: '600' },
  periodBtnTextFull: { color: colors.statusSuccess, fontWeight: '600' },
  periodDot: { fontSize: 8, color: colors.accentGold },
  periodDotFull: { fontSize: 8, color: colors.statusSuccess },
  futureText: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.lg, fontStyle: 'italic' },
  binaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.xl,
  },
  binaryLabel: { fontSize: 15, color: colors.textPrimary },
  error: { color: colors.statusDanger, fontSize: 13, marginBottom: spacing.md },
  submitBtn: {
    backgroundColor: colors.accentGold, borderRadius: radius.sm,
    padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md,
  },
  submitText: { color: colors.bgPrimary, fontWeight: '600', fontSize: 15 },
  deleteBtn: {
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.statusDanger, borderRadius: radius.sm,
  },
  deleteText: { color: colors.statusDanger, fontWeight: '600', fontSize: 14 },
  cancelText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});
