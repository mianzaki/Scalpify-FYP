import React, { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold, CheckOption } from '../components/onboarding';
import { onbStep, advance } from '../onboardingFlow';
import { updateMedical, useUser, type Goal } from '../userStore';

type IoniconName = React.ComponentProps<typeof import('@expo/vector-icons').Ionicons>['name'];

// Only what the app can actually do: AI scan analysis, progress tracking,
// hair-journey visualization, Norwood staging, and next-step guidance.
const OPTIONS: { value: Goal; label: string; icon: IoniconName }[] = [
  { value: 'understand', label: "Understand if I'm losing hair", icon: 'search-outline' },
  { value: 'track', label: 'Track how my hair changes over time', icon: 'trending-up-outline' },
  { value: 'visualize', label: 'Visualize my potential regrowth', icon: 'sparkles-outline' },
  { value: 'severity', label: 'Know my hair loss stage (Norwood)', icon: 'stats-chart-outline' },
  { value: 'decide', label: 'Plan my next steps', icon: 'compass-outline' },
];

export default function OnboardingGoalsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const user = useUser();
  const treatmentDone = user?.medical?.treatmentDone ?? false;
  const [goals, setGoals] = useState<Goal[]>(user?.medical?.goals ?? []);
  const { step, total } = onbStep('OnbGoals', treatmentDone);

  function toggle(g: Goal) {
    setGoals(p => (p.includes(g) ? p.filter(x => x !== g) : [...p, g]));
  }

  async function handleContinue() {
    await updateMedical({ goals });
    advance(nav, route, 'OnbGoals', treatmentDone);
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      title="What would you like to achieve?"
      subtitle="Select all that apply to personalize your hair health journey."
      canContinue={goals.length > 0}
      onContinue={handleContinue}
    >
      {OPTIONS.map(o => (
        <CheckOption
          key={o.value}
          label={o.label}
          icon={o.icon}
          selected={goals.includes(o.value)}
          onPress={() => toggle(o.value)}
        />
      ))}
    </OnboardingScaffold>
  );
}
