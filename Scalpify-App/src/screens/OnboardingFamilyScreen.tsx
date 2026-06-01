import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold, RadioOption } from '../components/onboarding';
import { onbStep, advance } from '../onboardingFlow';
import { updateMedical, useUser, type FamilyHistory } from '../userStore';

const OPTIONS: { value: FamilyHistory; label: string }[] = [
  { value: 'paternal', label: "Yes, on my father's side" },
  { value: 'maternal', label: "Yes, on my mother's side" },
  { value: 'both', label: 'Yes, on both sides' },
  { value: 'unknown', label: 'Not that I know of' },
  { value: 'none', label: "No, it doesn't" },
];

export default function OnboardingFamilyScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const user = useUser();
  const treatmentDone = user?.medical?.treatmentDone ?? false;
  const [value, setValue] = useState<FamilyHistory | null>(user?.medical?.familyHistory ?? null);
  const { step, total } = onbStep('OnbFamily', treatmentDone);

  async function handleContinue() {
    if (!value) return;
    await updateMedical({ familyHistory: value });
    advance(nav, route, 'OnbFamily', treatmentDone);
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      eyebrow="GENETICS & HERITAGE"
      title="Does hair loss run in your family?"
      subtitle="Understanding your genetic predisposition helps us tailor your clinical scalp health profile."
      insight={{
        label: 'CLINICAL INSIGHT',
        text: 'Family history is a significant factor in androgenetic alopecia. Our AI model uses this to adjust your personalized treatment timeline and expectations.',
      }}
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
