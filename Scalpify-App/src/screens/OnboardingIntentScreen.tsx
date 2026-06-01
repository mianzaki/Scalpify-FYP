import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold, RadioOption } from '../components/onboarding';
import { onbStep, advance } from '../onboardingFlow';
import { updateMedical, useUser, type TreatmentIntent } from '../userStore';

const OPTIONS: { value: TreatmentIntent; label: string }[] = [
  { value: 'have', label: 'Yes, I have a treatment routine' },
  { value: 'planning', label: "No, but I'm planning to" },
  { value: 'deciding', label: "Not sure, I'm still deciding" },
  { value: 'none', label: "No, and I don't plan to" },
];

export default function OnboardingIntentScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const user = useUser();
  const treatmentDone = user?.medical?.treatmentDone ?? false;
  const [value, setValue] = useState<TreatmentIntent | null>(user?.medical?.treatmentIntent ?? null);
  const { step, total } = onbStep('OnbIntent', treatmentDone);

  async function handleContinue() {
    if (!value) return;
    await updateMedical({ treatmentIntent: value });
    advance(nav, route, 'OnbIntent', treatmentDone);
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      title="Do you have a hair loss treatment routine?"
      subtitle="Such as medication (e.g. Finasteride, Minoxidil) or supplemental treatments (e.g. derma roller, RLT, supplements)."
      canContinue={!!value}
      onContinue={handleContinue}
      continueLabel="Finish"
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
