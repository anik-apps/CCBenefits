import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

// Module-level cache — persists for the app session.
// Added years are non-sensitive UI state, no need for SecureStore.
let _addedYearsCache: number[] = [];

interface YearPickerProps {
  selectedYear: number;
  onChange: (year: number) => void;
}

export default function YearPicker({ selectedYear, onChange }: YearPickerProps) {
  const currentYear = new Date().getFullYear();
  const [addedYears, setAddedYears] = useState<number[]>(_addedYearsCache);
  const [showPicker, setShowPicker] = useState(false);
  const [confirmYear, setConfirmYear] = useState<number | null>(null);

  const visibleYears = [...new Set([currentYear, currentYear - 1, ...addedYears])]
    .filter(y => y >= 2020)
    .sort((a, b) => b - a);

  const minVisible = Math.min(...visibleYears);
  const nextAddableYear = minVisible > 2020 ? minVisible - 1 : null;

  const handleSelect = (year: number) => {
    onChange(year);
    setShowPicker(false);
  };

  const handleAddYear = (year: number) => {
    setShowPicker(false);
    setConfirmYear(year);
  };

  const confirmAdd = () => {
    if (confirmYear === null) return;
    const updated = [...addedYears, confirmYear];
    setAddedYears(updated);
    _addedYearsCache = updated;
    onChange(confirmYear);
    setConfirmYear(null);
  };

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={() => setShowPicker(true)}>
        <Text style={styles.buttonText}>{selectedYear}</Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      {/* Year selection modal */}
      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Select Year</Text>
            {visibleYears.map(y => (
              <TouchableOpacity
                key={y}
                style={[styles.option, y === selectedYear && styles.optionActive]}
                onPress={() => handleSelect(y)}
              >
                <Text style={[styles.optionText, y === selectedYear && styles.optionTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
            {nextAddableYear && (
              <TouchableOpacity style={styles.addOption} onPress={() => handleAddYear(nextAddableYear)}>
                <Text style={styles.addOptionText}>+ Add {nextAddableYear}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Confirmation modal */}
      <Modal visible={confirmYear !== null} transparent animationType="fade" onRequestClose={() => setConfirmYear(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setConfirmYear(null)}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Add {confirmYear}?</Text>
            <Text style={styles.confirmDesc}>
              This will let you view and log benefit usage for {confirmYear}.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmYear(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={confirmAdd}>
                <Text style={styles.addBtnText}>Add {confirmYear}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  buttonText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  chevron: { fontSize: 8, color: colors.textMuted },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    padding: spacing.lg,
    width: 220,
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  optionActive: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: colors.accentGoldDim,
  },
  optionText: { fontSize: 15, color: colors.textPrimary, textAlign: 'center' },
  optionTextActive: { color: colors.accentGold, fontWeight: '600' },
  addOption: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: spacing.sm,
  },
  addOptionText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', fontStyle: 'italic' },
  confirmBox: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    padding: spacing.xxl,
    width: 300,
    alignItems: 'center',
  },
  confirmTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  confirmDesc: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
  confirmButtons: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  cancelText: { fontSize: 14, color: colors.textMuted },
  addBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: colors.accentGold },
});
