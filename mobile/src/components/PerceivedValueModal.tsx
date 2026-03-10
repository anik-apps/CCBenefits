import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { colors, spacing, radius } from '../theme';
import type { BenefitStatus } from '../types';

interface Props {
  visible: boolean;
  benefit: BenefitStatus;
  onClose: () => void;
  onSave: (benefitTemplateId: number, perceivedMaxValue: number) => Promise<void>;
}

export default function PerceivedValueModal({ visible, benefit, onClose, onSave }: Props) {
  const [value, setValue] = useState(benefit.perceived_max_value.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      setError('Enter a valid amount');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSave(benefit.benefit_template_id, num);
      onClose();
    } catch {
      setError('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modal}>
          <Text style={styles.title}>Perceived Value</Text>
          <Text style={styles.subtitle}>{benefit.name}</Text>
          <Text style={styles.hint}>
            Face value: ${benefit.max_value}/{benefit.period_type}. How much is this worth to you?
          </Text>

          <Text style={styles.label}>Your valuation (per period)</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder={`Default: $${benefit.max_value}`}
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
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
    padding: spacing.xxl, width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: colors.borderMedium,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  subtitle: { fontSize: 13, color: colors.accentGold, marginBottom: spacing.sm },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: 18 },
  label: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.borderMedium,
    borderRadius: radius.sm, padding: spacing.md, color: colors.textPrimary,
    fontSize: 16, marginBottom: spacing.lg,
  },
  error: { color: colors.statusDanger, fontSize: 13, marginBottom: spacing.md },
  saveBtn: {
    backgroundColor: colors.accentGold, borderRadius: radius.sm,
    padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md,
  },
  saveBtnText: { color: colors.bgPrimary, fontWeight: '600', fontSize: 15 },
  cancelText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});
