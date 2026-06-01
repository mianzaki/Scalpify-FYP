/**
 * Onboarding question flow (after sign-up).
 *
 * Step 1 is the branch selector (treatment done?), then the common questions, then
 * the branch-specific ones. onbStep() computes the progress per-branch.
 *
 *   DONE     → Treatment, Age, Sex, Onset, Ethnicity, Family, Surgery, Routine, Adherence
 *   NOT DONE → Treatment, Age, Sex, Onset, Ethnicity, Family, Goals, Intent
 */
export const ONB_COMMON = ['OnbTreatment', 'OnbAge', 'OnbSex', 'OnbOnset', 'OnbEthnicity', 'OnbFamily'] as const;
export const ONB_DONE = ['OnbSurgery', 'OnbRoutine', 'OnbAdherence'] as const;
export const ONB_NOTDONE = ['OnbGoals', 'OnbIntent'] as const;

export type OnbRoute =
  | (typeof ONB_COMMON)[number]
  | (typeof ONB_DONE)[number]
  | (typeof ONB_NOTDONE)[number];

export function onbOrder(treatmentDone: boolean): OnbRoute[] {
  return [...ONB_COMMON, ...(treatmentDone ? ONB_DONE : ONB_NOTDONE)];
}

export function onbStep(current: OnbRoute, treatmentDone: boolean): { step: number; total: number } {
  const order = onbOrder(treatmentDone);
  const idx = order.indexOf(current);
  return { step: idx >= 0 ? idx + 1 : 1, total: order.length };
}

export function onbNext(current: OnbRoute, treatmentDone: boolean): OnbRoute | null {
  const order = onbOrder(treatmentDone);
  const idx = order.indexOf(current);
  if (idx < 0 || idx === order.length - 1) return null;
  return order[idx + 1];
}

/** Advance to the next onboarding screen, or finish into the main app. */
export function goNext(nav: any, current: OnbRoute, treatmentDone: boolean) {
  const next = onbNext(current, treatmentDone);
  if (next) nav.navigate(next);
  else nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
}

/**
 * After saving a screen's answer: in EDIT mode (opened from Profile) just return to
 * Profile; otherwise advance through the onboarding flow / finish into the app.
 */
export function advance(nav: any, route: any, current: OnbRoute, treatmentDone: boolean) {
  if (route?.params?.edit) {
    nav.goBack();
    return;
  }
  goNext(nav, current, treatmentDone);
}
