import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { OnboardingScaffold } from '../components/onboarding';
import { onbStep, advance } from '../onboardingFlow';
import { useUser } from '../userStore';
import { ensureNotificationPermission } from '../notifications';
import { colors } from '../theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const BENEFITS: { icon: IoniconName; text: string }[] = [
  { icon: 'time-outline', text: 'Never miss a dose — reminders fire at the exact times you set.' },
  { icon: 'pulse-outline', text: 'Keeps your adherence score accurate and honest.' },
  { icon: 'lock-closed-outline', text: 'Used only for your reminders — nothing else.' },
];

export default function OnboardingRemindersScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const user = useUser();
  const treatmentDone = user?.medical?.treatmentDone ?? false;
  const [busy, setBusy] = useState(false);
  const { step, total } = onbStep('OnbReminders', treatmentDone);

  function finish() {
    advance(nav, route, 'OnbReminders', treatmentDone); // last step → into the app
  }

  // Soft pre-prompt: only fire the real system prompt if the user opts in here.
  async function handleEnable() {
    setBusy(true);
    try {
      await ensureNotificationPermission();
    } finally {
      setBusy(false);
      finish();
    }
  }

  return (
    <OnboardingScaffold
      step={step}
      total={total}
      eyebrow="ALMOST DONE"
      title="Stay on track with reminders"
      subtitle="We'll nudge you to take your treatments on time so you never miss a dose."
      canContinue={!busy}
      onContinue={handleEnable}
      continueLabel="Enable reminders"
    >
      <View style={styles.bellWrap}>
        <View style={styles.bell}>
          <Ionicons name="notifications" size={40} color={colors.primary} />
        </View>
      </View>

      {BENEFITS.map(b => (
        <View key={b.text} style={styles.row}>
          <Ionicons name={b.icon} size={18} color={colors.primary} />
          <Text style={styles.rowText}>{b.text}</Text>
        </View>
      ))}

      <Pressable onPress={finish} style={styles.later} hitSlop={8} disabled={busy}>
        <Text style={styles.laterText}>Maybe later</Text>
      </Pressable>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  bellWrap: { alignItems: 'center', paddingVertical: 8 },
  bell: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardSolid,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  later: { alignSelf: 'center', paddingVertical: 12, marginTop: 4 },
  laterText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
});
