import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold } from '../components/onboarding';
import { RulerPicker } from '../components/RulerPicker';
import { onbStep, advance } from '../onboardingFlow';
import { updateMedical, useUser } from '../userStore';
import { colors } from '../theme';

export default function OnboardingOnsetScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const user = useUser();
  const treatmentDone = user?.medical?.treatmentDone ?? false;
  // default to a sensible onset; fall back to current age if known
  const [onset, setOnset] = useState<number>(user?.medical?.ageOfOnset ?? user?.medical?.age ?? 25);
  const { step, total } = onbStep('OnbOnset', treatmentDone);

  async function handleContinue() {
    await updateMedical({ ageOfOnset: onset });
    advance(nav, route, 'OnbOnset', treatmentDone);
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      eyebrow="CLINICAL HISTORY"
      title="At what age did you first notice hair loss?"
      subtitle="The earlier hair loss begins, the more actively we track and plan — it's a key factor in your projection."
      onContinue={handleContinue}
    >
      <RulerPicker value={onset} onChange={setOnset} min={10} max={70} />
      <Text style={styles.hint}>Slide the numbers to set the age it started</Text>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 28 },
});
