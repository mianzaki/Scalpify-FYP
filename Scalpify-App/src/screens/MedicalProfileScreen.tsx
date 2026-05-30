import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, PrimaryButton, ScreenProgress } from '../components/ui';
import { AppHeader, PageTitle } from '../components/Header';
import type { RootStackParamList } from '../navigation';
import { colors, spacing } from '../theme';
import {
  EMPTY_MEDICAL_PROFILE,
  type FamilyHistory,
  type Medication,
  type MedicalProfile,
  type Sex,
  type SurgeryTechnique,
  updateUser,
  useUser,
} from '../userStore';
import { computeRisk, recoveryProjectionShiftDays, riskNote } from '../medicalContext';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const FAMILY_OPTIONS: { value: FamilyHistory; label: string }[] = [
  { value: 'maternal', label: 'Maternal' },
  { value: 'paternal', label: 'Paternal' },
  { value: 'both', label: 'Both' },
];

const TECHNIQUE_OPTIONS: { value: SurgeryTechnique; label: string }[] = [
  { value: 'FUE', label: 'FUE' },
  { value: 'FUT', label: 'FUT' },
  { value: 'none', label: 'None' },
];

const PHARMA_TOGGLES: { value: Medication; label: string }[] = [
  { value: 'finasteride', label: 'Finasteride' },
  { value: 'dutasteride', label: 'Dutasteride' },
  { value: 'minoxidil_topical', label: 'Minoxidil' },
  { value: 'spironolactone', label: 'Spironolactone' },
];

function parseIntOrNull(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function MedicalProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MedicalProfile'>>();
  const onboarding = route.params?.onboarding === true;
  const user = useUser();
  const current = user?.medical ?? EMPTY_MEDICAL_PROFILE;

  const [age, setAge] = useState(current.age?.toString() ?? '');
  const [sex, setSex] = useState<Sex | null>(current.sex);
  const [family, setFamily] = useState<FamilyHistory | null>(current.familyHistory);
  const [onset, setOnset] = useState(current.ageOfOnset?.toString() ?? '');
  const [technique, setTechnique] = useState<SurgeryTechnique | null>(current.surgeryTechnique);
  const [graftCount, setGraftCount] = useState(current.graftCount?.toString() ?? '');
  const [meds, setMeds] = useState<Medication[]>(current.medications);
  const [smoker, setSmoker] = useState(current.smoker);
  const [thyroid, setThyroid] = useState(current.hasThyroidIssue);
  const [pcos, setPcos] = useState(current.hasPCOS);
  const [recentIllness, setRecentIllness] = useState(current.recentMajorIllness);
  const [highStress, setHighStress] = useState(false);
  const [vitDef, setVitDef] = useState(false);
  const [showSexPicker, setShowSexPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const previewProfile: MedicalProfile = {
    age: parseIntOrNull(age),
    sex,
    familyHistory: family,
    ageOfOnset: parseIntOrNull(onset),
    surgeryTechnique: technique,
    graftCount: parseIntOrNull(graftCount),
    medications: meds,
    smoker,
    hasThyroidIssue: thyroid,
    hasPCOS: pcos,
    recentMajorIllness: recentIllness,
  };

  const risk = useMemo(() => computeRisk(previewProfile), [previewProfile]);
  const shift = useMemo(() => recoveryProjectionShiftDays(previewProfile), [previewProfile]);
  const note = riskNote(risk);

  function toggleMed(m: Medication) {
    setMeds(p => (p.includes(m) ? p.filter(x => x !== m) : [...p, m]));
  }

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

          <Card>
            <View style={styles.sectionHead}>
              <Ionicons name="download" size={16} color={colors.primary} />
              <Text style={styles.sectionLabel}>VITAL STATISTICS</Text>
            </View>
            <BoxInput label="Age" value={age} onChangeText={setAge} placeholder="e.g. 32" keyboardType="number-pad" />
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.label}>Biological Sex</Text>
              <Pressable onPress={() => setShowSexPicker(s => !s)} style={styles.selectField}>
                <Text style={{ color: sex ? colors.text : colors.textFaint, fontSize: 16, flex: 1 }}>
                  {sex ? SEX_OPTIONS.find(s => s.value === sex)?.label : 'Select Option'}
                </Text>
                <Ionicons name={showSexPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
              </Pressable>
              {showSexPicker && (
                <View style={styles.selectMenu}>
                  {SEX_OPTIONS.map(o => (
                    <Pressable
                      key={o.value}
                      onPress={() => { setSex(o.value); setShowSexPicker(false); }}
                      style={styles.selectItem}
                    >
                      <Text style={styles.selectItemText}>{o.label}</Text>
                      {sex === o.value && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            <BoxInput label="Age of Onset" value={onset} onChangeText={setOnset} placeholder="When did thinning start?" keyboardType="number-pad" />
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.label}>Family History</Text>
              <View style={styles.chipRow}>
                {FAMILY_OPTIONS.map(f => {
                  const on = family === f.value;
                  return (
                    <Pressable
                      key={f.value}
                      onPress={() => setFamily(f.value)}
                      style={[styles.optChip, on && styles.optChipOn]}
                    >
                      <Text style={[styles.optChipText, on && styles.optChipTextOn]}>{f.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>

          <Card>
            <View style={styles.sectionHead}>
              <Ionicons name="medkit" size={16} color={colors.primary} />
              <Text style={styles.sectionLabel}>SURGICAL HISTORY</Text>
            </View>
            <View style={{ marginTop: spacing.md, gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Text style={[styles.label, { width: 90 }]}>Surgery Type</Text>
                {TECHNIQUE_OPTIONS.map(opt => {
                  const on = technique === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setTechnique(opt.value)}
                      style={styles.radioWrap}
                    >
                      <View style={[styles.radio, on && styles.radioOn]}>
                        {on && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioText}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {technique && technique !== 'none' && (
                <BoxInput
                  label="Graft Count (Estimate)"
                  value={graftCount}
                  onChangeText={setGraftCount}
                  placeholder="e.g. 2500"
                  keyboardType="number-pad"
                />
              )}
            </View>
          </Card>

          <Card>
            <View style={styles.sectionHead}>
              <Ionicons name="flask" size={16} color={colors.primary} />
              <Text style={styles.sectionLabel}>ACTIVE PHARMACEUTICALS</Text>
            </View>
            <View style={{ marginTop: spacing.md }}>
              {PHARMA_TOGGLES.map(p => (
                <View key={p.value} style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{p.label}</Text>
                  <Switch
                    value={meds.includes(p.value)}
                    onValueChange={() => toggleMed(p.value)}
                    thumbColor="#fff"
                    trackColor={{ false: colors.cardElev, true: colors.success }}
                  />
                </View>
              ))}
            </View>
          </Card>

          <Card>
            <View style={styles.sectionHead}>
              <Ionicons name="leaf" size={16} color={colors.primary} />
              <Text style={styles.sectionLabel}>LIFESTYLE & CONDITIONS</Text>
            </View>
            <Text style={styles.lifestyleHelp}>Select all that apply for biological weighting.</Text>
            <View style={styles.chipRow}>
              <ToggleChip label="Smoking" on={smoker} onPress={() => setSmoker(s => !s)} />
              <ToggleChip label="Thyroid History" on={thyroid} onPress={() => setThyroid(t => !t)} />
              {sex === 'female' && <ToggleChip label="PCOS" on={pcos} onPress={() => setPcos(p => !p)} />}
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

function BoxInput({
  label,
  ...rest
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 8, marginTop: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        {...rest}
      />
    </View>
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
