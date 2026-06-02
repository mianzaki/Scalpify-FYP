import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold, RadioOption } from '../components/onboarding';
import { onbStep, advance } from '../onboardingFlow';
import { updateMedical, updateUser, useUser, type SurgeryTechnique } from '../userStore';
import { colors, spacing } from '../theme';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type TechKey = 'FUE' | 'FUT' | 'other';
const OPTIONS: { value: TechKey; label: string }[] = [
  { value: 'FUE', label: 'FUE (Follicular Unit Extraction)' },
  { value: 'FUT', label: 'FUT (Follicular Unit Transplant)' },
  { value: 'other', label: "Other / I'm not sure" },
];

export default function OnboardingSurgeryScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const user = useUser();
  const treatmentDone = user?.medical?.treatmentDone ?? true;
  const [tech, setTech] = useState<TechKey | null>(
    (user?.medical?.surgeryTechnique as TechKey) ?? null,
  );
  const [grafts, setGrafts] = useState(user?.medical?.graftCount?.toString() ?? '');
  const [surgeryDate, setSurgeryDate] = useState(user?.surgeryDate ?? '');
  const { step, total } = onbStep('OnbSurgery', treatmentDone);

  const dateValid = !surgeryDate.trim() || ISO_DATE_RE.test(surgeryDate.trim());

  async function handleContinue() {
    if (!tech || !dateValid) return;
    const surgeryTechnique: SurgeryTechnique | null = tech === 'other' ? null : tech;
    const g = parseInt(grafts, 10);
    await updateMedical({
      surgeryTechnique,
      graftCount: Number.isFinite(g) && g > 0 ? g : null,
    });
    // Surgery date lives on the user profile and drives the recovery day-counter.
    await updateUser({ surgeryDate: surgeryDate.trim() || null });
    advance(nav, route, 'OnbSurgery', treatmentDone);
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      eyebrow="SURGICAL HISTORY"
      title="Tell us about your transplant"
      subtitle="The technique and graft count help us calibrate your recovery timeline."
      canContinue={!!tech && dateValid}
      onContinue={handleContinue}
    >
      {OPTIONS.map(o => (
        <RadioOption
          key={o.value}
          label={o.label}
          selected={tech === o.value}
          onPress={() => setTech(o.value)}
        />
      ))}

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Surgery date (optional)</Text>
        <TextInput
          value={surgeryDate}
          onChangeText={setSurgeryDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          style={[styles.input, !dateValid && styles.inputError]}
        />
        {!dateValid && <Text style={styles.errorText}>Use the format YYYY-MM-DD, e.g. 2025-03-15.</Text>}
        <Text style={styles.fieldHint}>Powers your day-by-day recovery tracker on the Home screen.</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Graft count (estimate, optional)</Text>
        <TextInput
          value={grafts}
          onChangeText={setGrafts}
          placeholder="e.g. 2500"
          placeholderTextColor={colors.textFaint}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8, marginTop: spacing.sm },
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textStrong,
    fontSize: 16,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12 },
  fieldHint: { color: colors.textMuted, fontSize: 12 },
});
