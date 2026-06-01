import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold, RadioOption } from '../components/onboarding';
import { onbStep, advance } from '../onboardingFlow';
import { updateMedical, useUser, type Adherence } from '../userStore';

const OPTIONS: { value: Adherence; label: string; sublabel: string }[] = [
  { value: 'never', label: 'Never', sublabel: 'I follow my routine strictly every day.' },
  { value: 'sometimes', label: 'Sometimes', sublabel: 'I miss about 1–2 times a week.' },
  { value: 'often', label: 'Often', sublabel: 'I struggle to stay consistent.' },
];

export default function OnboardingAdherenceScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const user = useUser();
  const treatmentDone = user?.medical?.treatmentDone ?? true;
  const [value, setValue] = useState<Adherence | null>(user?.medical?.adherence ?? null);
  const { step, total } = onbStep('OnbAdherence', treatmentDone);

  async function handleContinue() {
    if (!value) return;
    await updateMedical({ adherence: value });
    advance(nav, route, 'OnbAdherence', treatmentDone);
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      eyebrow="CONSISTENCY"
      title="How often do you forget or skip treatments?"
      subtitle="Honest answers help us build a plan that fits your real habits."
      canContinue={!!value}
      onContinue={handleContinue}
      continueLabel="Finish"
    >
      {OPTIONS.map(o => (
        <RadioOption
          key={o.value}
          label={o.label}
          sublabel={o.sublabel}
          selected={value === o.value}
          onPress={() => setValue(o.value)}
        />
      ))}
    </OnboardingScaffold>
  );
}
