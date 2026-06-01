import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold, RadioOption } from '../components/onboarding';
import { onbStep, advance } from '../onboardingFlow';
import { updateMedical, useUser, type Sex } from '../userStore';

const OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export default function OnboardingSexScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const user = useUser();
  const treatmentDone = user?.medical?.treatmentDone ?? false;
  const [value, setValue] = useState<Sex | null>(user?.medical?.sex ?? null);
  const { step, total } = onbStep('OnbSex', treatmentDone);

  async function handleContinue() {
    if (!value) return;
    await updateMedical({ sex: value });
    advance(nav, route, 'OnbSex', treatmentDone);
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      title="What's your biological sex?"
      subtitle="Hormones differ by biological sex and strongly affect hair-loss patterns and which treatments are safe and effective."
      canContinue={!!value}
      onContinue={handleContinue}
    >
      {OPTIONS.map(o => (
        <RadioOption
          key={o.value}
          label={o.label}
          selected={value === o.value}
          onPress={() => setValue(o.value)}
        />
      ))}
    </OnboardingScaffold>
  );
}
