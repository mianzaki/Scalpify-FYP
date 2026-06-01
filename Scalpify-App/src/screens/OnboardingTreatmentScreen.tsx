import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold, RadioOption } from '../components/onboarding';
import { onbStep, advance } from '../onboardingFlow';
import { updateMedical, useUser } from '../userStore';

export default function OnboardingTreatmentScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const user = useUser();
  const [done, setDone] = useState<boolean | null>(user?.medical?.treatmentDone ?? null);
  const { step, total } = onbStep('OnbTreatment', done ?? false);

  async function handleContinue() {
    if (done === null) return;
    await updateMedical({ treatmentDone: done });
    advance(nav, route, 'OnbTreatment', done);
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      eyebrow="GETTING STARTED"
      title="Have you had a hair transplant?"
      subtitle="This tailors the questions and your recovery plan to where you are in your journey."
      insight={{
        label: 'WHY IT MATTERS',
        text: 'Post-transplant recovery and pre-treatment assessment need very different tracking — so we ask different questions for each.',
      }}
      canContinue={done !== null}
      onContinue={handleContinue}
    >
      <RadioOption
        label="Yes, I've had a transplant"
        sublabel="FUE, FUT, or another procedure"
        selected={done === true}
        onPress={() => setDone(true)}
      />
      <RadioOption
        label="No, not yet"
        sublabel="I'm assessing or considering treatment"
        selected={done === false}
        onPress={() => setDone(false)}
      />
    </OnboardingScaffold>
  );
}
