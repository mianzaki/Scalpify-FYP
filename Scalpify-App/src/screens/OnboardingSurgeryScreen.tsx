import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold, RadioOption } from '../components/onboarding';
import { onbStep, advance } from '../onboardingFlow';
import { updateMedical, useUser, type SurgeryTechnique } from '../userStore';
import { colors, spacing } from '../theme';

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
  const { step, total } = onbStep('OnbSurgery', treatmentDone);

  async function handleContinue() {
    if (!tech) return;
    const surgeryTechnique: SurgeryTechnique | null = tech === 'other' ? null : tech;
    const g = parseInt(grafts, 10);
    await updateMedical({
      surgeryTechnique,
      graftCount: Number.isFinite(g) && g > 0 ? g : null,
    });
    advance(nav, route, 'OnbSurgery', treatmentDone);
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      eyebrow="SURGICAL HISTORY"
      title="Tell us about your transplant"
      subtitle="The technique and graft count help us calibrate your recovery timeline."
      canContinue={!!tech}
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
});
