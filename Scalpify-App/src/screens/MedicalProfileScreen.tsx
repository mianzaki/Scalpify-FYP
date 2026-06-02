import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, PrimaryButton, ScreenProgress } from '../components/ui';
import { AppHeader, PageTitle } from '../components/Header';
import type { RootStackParamList } from '../navigation';
import { colors, spacing } from '../theme';
import { EMPTY_MEDICAL_PROFILE, type MedicalProfile, updateUser, useUser } from '../userStore';
import { computeRisk, recoveryProjectionShiftDays, riskNote } from '../medicalContext';
import { useScanHistory } from '../scanStore';

// Human-readable labels for the answers collected during onboarding.
const ETHNICITY_LABELS: Record<string, string> = {
  black: 'Black / African', east_asian: 'East Asian', hispanic: 'Hispanic / Latino',
  mena: 'Middle Eastern / N. African', south_asian: 'South Asian',
  southeast_asian: 'Southeast Asian', white: 'White / Caucasian', other: 'Other',
};
const SEX_LABELS: Record<string, string> = {
  male: 'Male', female: 'Female', other: 'Other', 'prefer-not-to-say': 'Prefer not to say',
};
const FAMILY_LABELS: Record<string, string> = {
  paternal: "Father's side", maternal: "Mother's side", both: 'Both sides',
  unknown: 'Not known', none: 'No family history',
};
const MED_LABELS: Record<string, string> = {
  finasteride: 'Finasteride', dutasteride: 'Dutasteride',
  minoxidil_topical: 'Minoxidil (topical)', minoxidil_oral: 'Minoxidil (oral)',
  spironolactone: 'Spironolactone',
};
const ADHERENCE_LABELS: Record<string, string> = {
  never: 'Never skips treatments', sometimes: 'Skips occasionally', often: 'Skips often',
};
const INTENT_LABELS: Record<string, string> = {
  have: 'Has a treatment routine', planning: 'Planning to start',
  deciding: 'Still deciding', none: 'No plans to treat',
};
const GOAL_LABELS: Record<string, string> = {
  understand: 'Understand hair loss', track: 'Track over time',
  visualize: 'Visualize regrowth', severity: 'Know Norwood stage', decide: 'Plan next steps',
};

/** Read-only rows summarizing the onboarding answers (skips anything unset). */
function onboardingRows(m: MedicalProfile): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (m.sex) rows.push({ label: 'Biological sex', value: SEX_LABELS[m.sex] ?? m.sex });
  if (m.ageOfOnset != null) rows.push({ label: 'Onset age', value: `${m.ageOfOnset}` });
  if (m.familyHistory) rows.push({ label: 'Family history', value: FAMILY_LABELS[m.familyHistory] ?? m.familyHistory });
  if (m.ethnicity) rows.push({ label: 'Background', value: ETHNICITY_LABELS[m.ethnicity] ?? m.ethnicity });
  if (m.treatmentDone !== null) {
    rows.push({ label: 'Transplant', value: m.treatmentDone ? 'Already had one' : 'Not yet' });
  }
  if (m.surgeryTechnique) {
    const grafts = m.graftCount ? ` · ${m.graftCount} grafts` : '';
    rows.push({ label: 'Surgery', value: `${m.surgeryTechnique}${grafts}` });
  }
  if (m.medications && m.medications.length) {
    rows.push({ label: 'Routine', value: m.medications.map(x => MED_LABELS[x] ?? x).join(', ') });
  }
  if (m.adherence) rows.push({ label: 'Consistency', value: ADHERENCE_LABELS[m.adherence] ?? '' });
  if (m.treatmentIntent) rows.push({ label: 'Treatment', value: INTENT_LABELS[m.treatmentIntent] ?? '' });
  if (m.goals && m.goals.length) {
    rows.push({ label: 'Goals', value: m.goals.map(g => GOAL_LABELS[g] ?? g).join(', ') });
  }
  return rows;
}

export default function MedicalProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MedicalProfile'>>();
  const onboarding = route.params?.onboarding === true;
  const user = useUser();
  const current = user?.medical ?? EMPTY_MEDICAL_PROFILE;

  // Lifestyle is the only section edited here — everything else (age, sex, onset,
  // family, surgery, meds) is collected once in onboarding and shown read-only below.
  const [smoker, setSmoker] = useState(current.smoker);
  const [thyroid, setThyroid] = useState(current.hasThyroidIssue);
  const [pcos, setPcos] = useState(current.hasPCOS);
  const [recentIllness, setRecentIllness] = useState(current.recentMajorIllness);
  const [highStress, setHighStress] = useState(false);
  const [vitDef, setVitDef] = useState(false);
  const [saving, setSaving] = useState(false);

  const previewProfile: MedicalProfile = {
    ...current, // age, sex, onset, family, surgery, meds, ethnicity, goals from onboarding
    smoker,
    hasThyroidIssue: thyroid,
    hasPCOS: pcos,
    recentMajorIllness: recentIllness,
  };

  const hasScan = useScanHistory().length > 0;
  const risk = useMemo(() => computeRisk(previewProfile), [previewProfile]);
  const shift = useMemo(() => recoveryProjectionShiftDays(previewProfile), [previewProfile]);
  const note = riskNote(risk);

  async function handleSave() {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in before editing your medical profile.');
      return;
    }
    setSaving(true);
    try {
      await updateUser({ medical: previewProfile });
      if (onboarding) {
        // First-run gate: proceed into the app, clearing the auth/onboarding stack.
        nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else {
        nav.goBack();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScreenProgress pct={onboarding ? 90 : 75} />
      <AppHeader showBack={!onboarding} variant={onboarding ? 'none' : 'menu'} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <PageTitle
          title={onboarding ? 'Tell us about you' : 'Medical Context & Risk'}
          subtitle={
            onboarding
              ? 'A few details so we can personalize your AI analysis and recovery plan. You can update these anytime.'
              : 'Update your physiological markers to refine AI analysis.'
          }
        />

        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          {/* Risk + regrowth projection only unlock after the first scan */}
          {hasScan ? (
            <Card>
              <View style={{ alignItems: 'center' }}>
                <View style={styles.riskBadge}>
                  <Ionicons name="warning" size={20} color={colors.danger} />
                </View>
                <Text style={styles.riskTitle}>
                  Risk Summary: {risk.level === 'high' ? 'High' : risk.level === 'elevated' ? 'Elevated' : risk.level === 'low' ? 'Low' : 'Standard'} Risk
                </Text>
                <Text style={styles.riskBody}>
                  {note ?? 'Your current physiological markers fall within typical ranges.'}
                </Text>
              </View>
              <View style={styles.shiftCard}>
                <Text style={styles.shiftLabel}>REGROWTH PROJECTION</Text>
                <Text style={styles.shiftValue}>
                  {shift === 0 ? 'on schedule' : `${shift > 0 ? '+' : ''}${shift} days shift`}
                </Text>
                <Text style={styles.shiftNote}>
                  {smoker ? 'Impact of nicotine consumption' : 'Updates as your medications & habits change'}
                </Text>
              </View>
            </Card>
          ) : (
            <Card>
              <View style={styles.riskLockedRow}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textDim} />
                <Text style={styles.riskLockedText}>
                  Your risk assessment & regrowth projection unlock after your first scan.
                </Text>
              </View>
            </Card>
          )}

          {onboardingRows(current).length > 0 && (
            <Card>
              <View style={styles.sectionHead}>
                <Ionicons name="clipboard-outline" size={16} color={colors.primary} />
                <Text style={styles.sectionLabel}>FROM YOUR ONBOARDING</Text>
              </View>
              <View style={{ marginTop: spacing.md }}>
                {/* Age is editable via the ruler picker */}
                {current.age != null && (
                  <Pressable
                    onPress={() => nav.navigate('OnbAge', { edit: true })}
                    style={({ pressed }) => [styles.onbRow, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={styles.onbRowLabel}>Age</Text>
                    <View style={styles.onbRowRight}>
                      <Text style={styles.onbRowEditValue}>{current.age}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                    </View>
                  </Pressable>
                )}
                {/* The rest are read-only */}
                {onboardingRows(current).map(r => (
                  <View key={r.label} style={styles.onbRow}>
                    <Text style={styles.onbRowLabel}>{r.label}</Text>
                    <Text style={styles.onbRowValue}>{r.value}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.onbHint}>Tap Age to change it. Other answers are set at sign-up.</Text>
            </Card>
          )}

          <Card>
            <View style={styles.sectionHead}>
              <Ionicons name="leaf" size={16} color={colors.primary} />
              <Text style={styles.sectionLabel}>LIFESTYLE & CONDITIONS</Text>
            </View>
            <Text style={styles.lifestyleHelp}>Select all that apply for biological weighting.</Text>
            <View style={styles.chipRow}>
              <ToggleChip label="Smoking" on={smoker} onPress={() => setSmoker(s => !s)} />
              <ToggleChip label="Thyroid History" on={thyroid} onPress={() => setThyroid(t => !t)} />
              {current.sex === 'female' && <ToggleChip label="PCOS" on={pcos} onPress={() => setPcos(p => !p)} />}
              <ToggleChip label="Recent Illness" on={recentIllness} onPress={() => setRecentIllness(r => !r)} />
              <ToggleChip label="High Stress" on={highStress} onPress={() => setHighStress(s => !s)} />
              <ToggleChip label="Vitamin Deficiency" on={vitDef} onPress={() => setVitDef(s => !s)} />
            </View>
          </Card>

          <View style={styles.darkNote}>
            <Ionicons name="analytics" size={18} color="#fff" />
            <Text style={styles.darkNoteText}>
              Updating your medical context will recalibrate {countMarkers(previewProfile)} precision markers in your next scan.
            </Text>
          </View>

          <PrimaryButton
            label={onboarding ? 'Save & Continue' : 'Update Profile'}
            iconRight="arrow-forward"
            onPress={handleSave}
            loading={saving}
            disabled={saving || !user}
          />

          <Text style={styles.lastUpdated}>
            Last updated: {new Date().toDateString().slice(4)} · Profile {computeCompletePct(previewProfile)}% Complete
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.lifestyleChip, on && styles.lifestyleChipOn]}>
      <Text style={[styles.lifestyleText, on && styles.lifestyleTextOn]}>
        {label}{on ? ' ✓' : ''}
      </Text>
    </Pressable>
  );
}

// Count of distinct markers actually populated on the profile.
function countMarkers(p: MedicalProfile): number {
  let n = 0;
  if (p.age !== null) n += 1;
  if (p.sex !== null) n += 1;
  if (p.familyHistory !== null) n += 1;
  if (p.ageOfOnset !== null) n += 1;
  if (p.surgeryTechnique !== null) n += 1;
  if (p.graftCount !== null) n += 1;
  n += p.medications.length;
  if (p.smoker) n += 1;
  if (p.hasThyroidIssue) n += 1;
  if (p.hasPCOS) n += 1;
  if (p.recentMajorIllness) n += 1;
  return n;
}

function computeCompletePct(p: MedicalProfile): number {
  let total = 0;
  let filled = 0;
  const checks = [
    p.age !== null,
    p.sex !== null,
    p.familyHistory !== null,
    p.ageOfOnset !== null,
    p.surgeryTechnique !== null,
    p.medications.length > 0,
  ];
  checks.forEach(v => { total += 1; if (v) filled += 1; });
  return Math.round((filled / total) * 100);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  riskLockedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riskLockedText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, flex: 1 },
  riskBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskTitle: { color: colors.dangerText, fontSize: 17, fontWeight: '800', marginTop: spacing.md },
  riskBody: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  shiftCard: {
    backgroundColor: colors.cardElev,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  shiftLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  shiftValue: { color: colors.primary, fontSize: 20, fontWeight: '800', marginTop: 2 },
  shiftNote: { color: colors.textMuted, fontSize: 11, marginTop: 4 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },

  onbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.borderSoft,
  },
  onbRowLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  onbRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' },
  onbRowEditValue: { color: colors.text, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  onbRowValue: { color: colors.text, fontSize: 14, flex: 1, textAlign: 'right' },
  onbHint: { color: colors.textFaint, fontSize: 11, marginTop: spacing.md },

  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  selectMenu: {
    marginTop: 4,
    backgroundColor: colors.cardSolid,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectItem: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectItemText: { color: colors.text, fontSize: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  optChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSolid,
  },
  optChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  optChipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  optChipTextOn: { color: '#fff' },

  radioWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  radioText: { color: colors.text, fontSize: 14 },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.borderSoft,
  },
  toggleLabel: { color: colors.text, fontSize: 15 },

  lifestyleHelp: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  lifestyleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSolid,
  },
  lifestyleChipOn: { backgroundColor: colors.successSoft, borderColor: colors.success },
  lifestyleText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  lifestyleTextOn: { color: colors.successText },

  darkNote: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.cardSolid,
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  darkNoteText: { color: '#fff', fontSize: 13, lineHeight: 18, flex: 1 },

  lastUpdated: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
