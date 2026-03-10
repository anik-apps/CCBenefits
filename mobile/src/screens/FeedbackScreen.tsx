import ScreenWrapper from '../components/ScreenWrapper';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { submitFeedback } from '../services/api';
import { colors, spacing, radius } from '../theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Feedback'>;

const CATEGORIES = [
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'general', label: 'General' },
];

const MAX_LENGTH = 1000;

export default function FeedbackScreen({ navigation }: Props) {
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError('');
    try {
      await submitFeedback(category, message);
      setSuccess(true);
    } catch {
      setError('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ScreenWrapper>
        <View style={styles.successBox}>
          <Text style={styles.successText}>Thanks for your feedback!</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper keyboard>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Send Feedback</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.value}
              style={[styles.categoryBtn, category === c.value && styles.categoryActive]}
              onPress={() => setCategory(c.value)}
            >
              <Text style={[styles.categoryText, category === c.value && styles.categoryTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={styles.textArea}
          value={message}
          onChangeText={(t) => setMessage(t.slice(0, MAX_LENGTH))}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{message.length}/{MAX_LENGTH}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitBtn, (loading || !message.trim()) && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={loading || !message.trim()}
        >
          <Text style={styles.submitText}>{loading ? 'Sending...' : 'Submit'}</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.md },
  backText: { color: colors.accentGold, fontSize: 14, marginBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  form: { padding: spacing.lg },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  categoryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  categoryBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderMedium,
  },
  categoryActive: { borderColor: colors.accentGold, backgroundColor: 'rgba(201,168,76,0.12)' },
  categoryText: { fontSize: 13, color: colors.textMuted },
  categoryTextActive: { color: colors.accentGold, fontWeight: '600' },
  textArea: {
    backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.borderMedium,
    borderRadius: radius.sm, padding: spacing.md, color: colors.textPrimary,
    fontSize: 15, minHeight: 140,
  },
  counter: { fontSize: 11, color: colors.textMuted, textAlign: 'right', marginTop: 4, marginBottom: spacing.lg },
  error: { color: colors.statusDanger, fontSize: 13, marginBottom: spacing.md },
  submitBtn: {
    backgroundColor: colors.accentGold, borderRadius: radius.sm,
    padding: spacing.lg, alignItems: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.bgPrimary, fontWeight: '600', fontSize: 16 },
  successBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  successText: { fontSize: 18, fontWeight: '600', color: colors.accentGold, marginBottom: spacing.xl },
  doneBtn: {
    backgroundColor: colors.accentGold, borderRadius: radius.sm,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xxl,
  },
  doneBtnText: { color: colors.bgPrimary, fontWeight: '600', fontSize: 15 },
});
