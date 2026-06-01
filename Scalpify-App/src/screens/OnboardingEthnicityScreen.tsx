import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold, RadioOption } from '../components/onboarding';
import { onbStep, advance } from '../onboardingFlow';
import { updateMedical, useUser, type Ethnicity } from '../userStore';

const OPTIONS: { value: Ethnicity; label: string }[] = [
  { value: 'black', label: 'Black / African / Afro-Caribbean' },
  { value: 'east_asian', label: 'East Asian' },
  { value: 'hispanic', label: 'Hispanic / Latino' },
  { value: 'mena', label: 'Middle Eastern / North African' },
  { value: 'south_asian', label: 'South Asian' },
  { value: 'southeast_asian', label: 'Southeast Asian' },
  { value: 'white', label: 'White / Caucasian' },
  { value: 'other', label: 'Other / Prefer not to say' },
];

export default function OnboardingEthnicityScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const user = useUser();
  const treatmentDone = user?.medical?.treatmentDone ?? false;
  const [value, setValue] = useState<Ethnicity | null>(user?.medical?.ethnicity ?? null);
  const { step, total } = onbStep('OnbEthnicity', treatmentDone);

  async function handleContinue() {
    if (!value) return;
    await updateMedical({ ethnicity: value });
    advance(nav, route, 'OnbEthnicity', treatmentDone);
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      title="Which ethnic background best describes you?"
      subtitle="Hair and scalp characteristics vary across backgrounds, which affects how we interpret your results and tailor recommendations."
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
