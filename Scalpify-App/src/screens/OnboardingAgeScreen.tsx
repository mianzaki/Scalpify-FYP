import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold } from '../components/onboarding';
import { RulerPicker } from '../components/RulerPicker';
import { onbStep, advance } from '../onboardingFlow';
import { updateMedical, useUser } from '../userStore';
import { colors } from '../theme';

export default function OnboardingAgeScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const user = useUser();
  const treatmentDone = user?.medical?.treatmentDone ?? false;
  const [age, setAge] = useState<number>(user?.medical?.age ?? 26);
  const { step, total } = onbStep('OnbAge', treatmentDone);

  async function handleContinue() {
    await updateMedical({ age });
    advance(nav, route, 'OnbAge', treatmentDone);
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      title="What's your age?"
      subtitle="Age helps us personalize your recovery protocol."
      insight={{
        label: 'WHY IT MATTERS',
        text: 'Hair loss can happen at any age, but age influences how quickly it progresses and which treatments are most effective.',
      }}
      onContinue={handleContinue}
    >
      <RulerPicker value={age} onChange={setAge} min={16} max={90} />
      <Text style={styles.hint}>Slide the numbers to set your age</Text>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 28 },
});
