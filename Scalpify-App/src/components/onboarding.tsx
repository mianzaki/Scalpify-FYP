import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { PrimaryButton } from './ui';
import { colors, spacing } from '../theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Shared chrome for every onboarding question screen: header, step progress,
 * title/subtitle, the question body (children), an optional insight card, and a
 * Continue button. Keeps each question screen its own file but free of boilerplate.
 */
export function OnboardingScaffold({
  step,
  total,
  eyebrow,
  title,
  subtitle,
  insight,
  canContinue = true,
  onContinue,
  continueLabel = 'Continue',
  children,
}: {
  step: number;
  total: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  insight?: { label?: string; text: string };
  canContinue?: boolean;
  onContinue: () => void;
  continueLabel?: string;
  children: React.ReactNode;
}) {
  const nav = useNavigation<any>();
  const pct = Math.round((step / total) * 100);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* header */}
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </Pressable>
        <Text style={styles.wordmark}>Scalpify</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* step progress */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>{children}</View>

        {insight ? (
          <View style={styles.insight}>
            <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              {insight.label ? <Text style={styles.insightLabel}>{insight.label}</Text> : null}
              <Text style={styles.insightText}>{insight.text}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={continueLabel}
          iconRight="arrow-forward"
          onPress={onContinue}
          disabled={!canContinue}
        />
      </View>
    </SafeAreaView>
  );
}

/** Single-select option card (radio on the right). */
export function RadioOption({
  label,
  sublabel,
  selected,
  onPress,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.option, selected && styles.optionOn]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelOn]}>{label}</Text>
        {sublabel ? <Text style={styles.optionSub}>{sublabel}</Text> : null}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </Pressable>
  );
}

/** Multi-select option card (checkbox on the right, optional leading icon). */
export function CheckOption({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: IoniconName;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.option, selected && styles.optionOn]}>
      {icon ? (
        <View style={styles.optionIcon}>
          <Ionicons name={icon} size={18} color={selected ? colors.primary : colors.textMuted} />
        </View>
      ) : null}
      <Text style={[styles.optionLabel, { flex: 1 }, selected && styles.optionLabelOn]}>{label}</Text>
      <View style={[styles.checkbox, selected && styles.checkboxOn]}>
        {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  wordmark: { flex: 1, textAlign: 'center', color: colors.primary, fontSize: 22, fontWeight: '800' },

  progressTrack: {
    height: 4,
    marginHorizontal: spacing.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },

  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  title: { color: colors.textStrong, fontSize: 24, fontWeight: '800', lineHeight: 30 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardSolid,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.cardElev, alignItems: 'center', justifyContent: 'center',
  },
  optionLabel: { color: colors.text, fontSize: 16, fontWeight: '500' },
  optionLabelOn: { color: colors.textStrong, fontWeight: '600' },
  optionSub: { color: colors.textMuted, fontSize: 13, marginTop: 3 },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },

  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  insight: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.xl,
    backgroundColor: colors.cardSolid,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 16,
    padding: spacing.lg,
  },
  insightLabel: {
    color: colors.warning, fontSize: 12, fontWeight: '800',
    letterSpacing: 1, marginBottom: 4,
  },
  insightText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
});
