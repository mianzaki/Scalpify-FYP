import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold, CheckOption } from '../components/onboarding';
import { onbStep, advance } from '../onboardingFlow';
import { updateMedical, useUser, type Medication } from '../userStore';

type IoniconName = React.ComponentProps<typeof import('@expo/vector-icons').Ionicons>['name'];

const OPTIONS: { value: Medication; label: string; icon: IoniconName }[] = [
  { value: 'finasteride', label: 'Finasteride', icon: 'medkit-outline' },
  { value: 'dutasteride', label: 'Dutasteride', icon: 'medkit-outline' },
  { value: 'minoxidil_topical', label: 'Minoxidil (topical)', icon: 'water-outline' },
  { value: 'minoxidil_oral', label: 'Minoxidil (oral)', icon: 'ellipse-outline' },
  { value: 'spironolactone', label: 'Spironolactone', icon: 'flask-outline' },
];

export default function OnboardingRoutineScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const user = useUser();
  const treatmentDone = user?.medical?.treatmentDone ?? true;
  const [meds, setMeds] = useState<Medication[]>(user?.medical?.medications ?? []);
  const { step, total } = onbStep('OnbRoutine', treatmentDone);

  function toggle(m: Medication) {
    setMeds(p => (p.includes(m) ? p.filter(x => x !== m) : [...p, m]));
  }

  async function handleContinue() {
    await updateMedical({ medications: meds });
    advance(nav, route, 'OnbRoutine', treatmentDone);
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      eyebrow="CURRENT ROUTINE"
      title="What are you currently using?"
      subtitle="Select all the treatments you're taking post-procedure. Leave empty if none."
      continueLabel={meds.length ? 'Continue' : 'None — Continue'}
      onContinue={handleContinue}
    >
      {OPTIONS.map(o => (
        <CheckOption
          key={o.value}
          label={o.label}
          icon={o.icon}
          selected={meds.includes(o.value)}
          onPress={() => toggle(o.value)}
        />
      ))}
    </OnboardingScaffold>
  );
}
