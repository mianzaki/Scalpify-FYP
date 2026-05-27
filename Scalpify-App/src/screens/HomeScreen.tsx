import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Pill, PrimaryButton, SecondaryButton } from '../components/ui';
import { AppHeader, PageTitle } from '../components/Header';
import { colors, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../navigation';
import { firstNameOf, useUser } from '../userStore';
import { formatTime, statusForToday, useMeds } from '../medsStore';
import { removeScan, useLatestScanFull, useScanHistory } from '../scanStore';
import { computeRisk } from '../medicalContext';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours();
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = ((hh + 11) % 12) + 1;
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${h12}:${mm} ${ampm}`;
}

function thumbLabel(ts: number): string {
  const d = new Date(ts);
  return `${MONTH_NAMES[d.getMonth()].toUpperCase()} ${d.getDate()}`;
}

function confirmScanAction(scanId: string, openCamera: () => void) {
  Alert.alert(
    'Edit scan',
    'Delete this scan from your history, or replace it with a new one?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        onPress: async () => {
          await removeScan(scanId);
          openCamera();
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => { void removeScan(scanId); },
      },
    ],
  );
}

export default function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useUser();
  const meds = useMeds();
  const latest = useLatestScanFull();
  const history = useScanHistory();
  const risk = computeRisk(user?.medical);

  const previousScan = history[1];
  const deltaCoverage =
    latest && previousScan
      ? latest.data.measurements.percentage.hair_coverage -
        previousScan.data.measurements.percentage.hair_coverage
      : null;

  const dueNow = meds.find(m => statusForToday(m) === 'now');
  const firstName = firstNameOf(user) || 'there';

  // Derive 2-3 actionable next steps from real state.
  const nextSteps: { icon: IoniconName; label: string }[] = (() => {
    const steps: { icon: IoniconName; label: string }[] = [];
    if (!latest) {
      steps.push({ icon: 'camera-outline', label: 'Capture your first scalp scan' });
    } else {
      const daysSinceScan = Math.floor((Date.now() - latest.capturedAt) / 86_400_000);
      if (daysSinceScan >= 7) {
        steps.push({ icon: 'camera-outline', label: `Take a fresh scan (${daysSinceScan}d since last)` });
      }
    }
    if (meds.length === 0) {
      steps.push({ icon: 'medical-outline', label: 'Add your medications in Track' });
    } else if (dueNow) {
      steps.push({ icon: 'time-outline', label: `Take ${dueNow.name} — due now` });
    }
    if (!user?.medical || user.medical.familyHistory === null) {
      steps.push({ icon: 'clipboard-outline', label: 'Complete your medical profile' });
    }
    if (steps.length === 0) {
      steps.push({ icon: 'checkmark-circle', label: 'You\'re on track — keep your routine consistent' });
    }
    return steps.slice(0, 3);
  })();

  const riskBlurb = (() => {
    if (risk.level === 'high') {
      return `${risk.factors.length} risk factor${risk.factors.length === 1 ? '' : 's'} flagged. Tighten adherence and review with your clinician.`;
    }
    if (risk.level === 'elevated') {
      return risk.factors.length > 0
        ? `Elevated risk from: ${risk.factors.slice(0, 2).join(', ')}. Stay consistent with treatment.`
        : 'Elevated risk profile. Stay consistent with treatment.';
    }
    return null;
  })();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <PageTitle title={`Welcome back, ${firstName}`} subtitle="Here is your scalp health summary for today." />

        {/* Latest scan card */}
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <Card style={{ padding: spacing.lg }}>
            <View style={styles.headRow}>
              <Pill label="LATEST SCAN" variant="primary" />
              <Text style={styles.dateText}>
                {latest ? shortDate(latest.capturedAt) : '—'}
              </Text>
            </View>
            <View style={styles.scanRow}>
              {latest ? (
                <Image source={{ uri: latest.photoUri }} style={styles.scanThumb} />
              ) : (
                <View style={[styles.scanThumb, styles.scanThumbEmpty]}>
                  <Ionicons name="image-outline" size={22} color={colors.textDim} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.smallLabel}>Norwood Rating</Text>
                <Text style={styles.norwoodValue}>
                  {latest ? latest.data.classification.norwood_scale : '—'}
                  {latest?.data.classification.severity ? (
                    <Text style={styles.norwoodSub}>{` (${latest.data.classification.severity})`}</Text>
                  ) : null}
                </Text>
                {deltaCoverage !== null && (
                  <View style={styles.trendRow}>
                    <Ionicons
                      name={deltaCoverage >= 0 ? 'trending-up' : 'trending-down'}
                      size={14}
                      color={deltaCoverage >= 0 ? colors.success : colors.warning}
                    />
                    <Text style={[styles.trendText, { color: deltaCoverage >= 0 ? colors.success : colors.warning }]}>
                      {deltaCoverage >= 0 ? '+' : ''}{deltaCoverage.toFixed(1)}% density vs last
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <PrimaryButton
              label="View Full Report"
              iconRight="arrow-forward"
              onPress={() => nav.navigate(latest ? 'NorwoodAnalysis' : 'Camera')}
              style={{ marginTop: spacing.md }}
            />
          </Card>

          {/* Action Needed */}
          {dueNow && (
            <View style={styles.actionCard}>
              <View style={styles.actionHead}>
                <Ionicons name="notifications" size={18} color={colors.danger} />
                <Text style={styles.actionTitle}>Action Needed</Text>
              </View>
              <View style={styles.actionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionLabel}>MEDICATION DUE NOW</Text>
                  <Text style={styles.actionMedName}>{dueNow.name}</Text>
                  <Text style={styles.actionMedType}>{dueNow.type} · {formatTime(dueNow.time)}</Text>
                </View>
                <View style={styles.checkPill}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </View>
              </View>
              <Text style={styles.actionWarn}>Missed dose reduces treatment efficacy by 15%</Text>
            </View>
          )}

          {/* Hair Journey */}
          <View style={styles.journeyCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>Hair Journey</Text>
              {history.length >= 2 && (
                <Text style={styles.journeySubtitle}>Your scans over time</Text>
              )}
            </View>
            {history.length === 0 ? (
              <View style={styles.journeyEmpty}>
                <Ionicons name="camera-outline" size={28} color={colors.textDim} />
                <Text style={styles.journeyEmptyText}>Take a scan to start your journey</Text>
              </View>
            ) : history.length === 1 ? (
              <View style={[styles.journeyImagesRow, { justifyContent: 'center' }]}>
                <View style={{ width: '60%' }}>
                  <JourneyThumb
                    label={`BASELINE · ${thumbLabel(history[0].capturedAt)}`}
                    uri={history[0].photoUri}
                    highlight
                    onEdit={() => confirmScanAction(history[0].id, () => nav.navigate('Camera'))}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.journeyImagesRow}>
                <JourneyThumb
                  label={`BASELINE · ${thumbLabel(history[history.length - 1].capturedAt)}`}
                  uri={history[history.length - 1].photoUri}
                  onEdit={() => confirmScanAction(history[history.length - 1].id, () => nav.navigate('Camera'))}
                />
                <JourneyThumb
                  label={`LATEST · ${thumbLabel(latest!.capturedAt)}`}
                  uri={latest!.photoUri}
                  highlight
                  onEdit={() => confirmScanAction(latest!.id, () => nav.navigate('Camera'))}
                />
              </View>
            )}
            {history.length >= 1 && (
              <>
                <View style={styles.journeyBottom}>
                  <Text style={styles.journeyMeta}>
                    {history.length} scan{history.length === 1 ? '' : 's'} captured
                  </Text>
                  <Text style={styles.journeyPct}>
                    {history.length === 1
                      ? 'Add another to compare'
                      : `${Math.round(((Date.now() - history[history.length - 1].capturedAt) / 86_400_000))}d span`}
                  </Text>
                </View>
                <View style={styles.journeyBar}>
                  <View style={[styles.journeyFill, { width: `${Math.min(100, history.length * 20)}%` }]} />
                </View>
              </>
            )}
          </View>

          {/* Personalized Next Steps */}
          <View style={styles.nextCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="bulb-outline" size={20} color={colors.primary} />
              <Text style={styles.nextTitle}>Personalized Next Steps</Text>
            </View>

            {riskBlurb && (
              <View style={styles.riskBox}>
                <Ionicons name="warning" size={16} color={colors.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.riskTitle}>
                    {risk.level === 'high' ? 'High Risk' : 'Elevated Risk'}
                  </Text>
                  <Text style={styles.riskBody}>{riskBlurb}</Text>
                </View>
              </View>
            )}

            {nextSteps.map(s => (
              <Step key={s.label} icon={s.icon} label={s.label} />
            ))}

            <PrimaryButton
              variant="success"
              label="Update Habits"
              onPress={() => nav.navigate('MedicalProfile')}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </ScrollView>

      {/* FAB to camera */}
      <Pressable onPress={() => nav.navigate('Camera')} style={styles.fabWrap}>
        <View style={styles.fab}>
          <Ionicons name="scan" size={24} color="#fff" />
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

function JourneyThumb({ uri, label, highlight, onEdit }: { uri?: string; label: string; highlight?: boolean; onEdit?: () => void }) {
  return (
    <View style={[styles.jthumb, highlight && { borderColor: colors.success, borderWidth: 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={{ flex: 1, borderRadius: 12 }} />
      ) : (
        <View style={[styles.scanThumbEmpty, { flex: 1, borderRadius: 12 }]}>
          <Ionicons name="image-outline" size={22} color={colors.textDim} />
        </View>
      )}
      <View style={[styles.jthumbLabel, highlight && { backgroundColor: colors.success }]}>
        <Text style={styles.jthumbLabelText}>{label}</Text>
      </View>
      {onEdit && (
        <Pressable onPress={onEdit} style={styles.jthumbEdit} hitSlop={8}>
          <Ionicons name="create-outline" size={16} color={colors.text} />
        </Pressable>
      )}
    </View>
  );
}

function Step({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.stepRow}>
      <Ionicons name={icon} size={18} color={colors.success} />
      <Text style={styles.stepText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: spacing.md },
  scanThumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.cardElev },
  scanThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  smallLabel: { color: colors.textMuted, fontSize: 13 },
  norwoodValue: { color: colors.primary, fontSize: 22, fontWeight: '800', marginTop: 2 },
  norwoodSub: { color: colors.text, fontSize: 16, fontWeight: '700' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  trendText: { fontSize: 13, fontWeight: '600' },

  // Action Needed card
  actionCard: {
    backgroundColor: '#FDEAEA',
    borderRadius: 18,
    padding: spacing.lg,
  },
  actionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionTitle: { color: colors.dangerText, fontSize: 17, fontWeight: '800' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  actionLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  actionMedName: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2 },
  actionMedType: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  checkPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionWarn: {
    color: colors.dangerText,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: spacing.md,
  },

  // Hair Journey
  journeyCard: {
    backgroundColor: colors.cardElev,
    borderRadius: 18,
    padding: spacing.lg,
  },
  cardTitle: { color: colors.textStrong, fontSize: 20, fontWeight: '800' },
  journeySubtitle: { color: colors.textMuted, fontSize: 12 },
  journeyEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: 8,
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  journeyEmptyText: { color: colors.textMuted, fontSize: 13 },
  journeyImagesRow: { flexDirection: 'row', gap: 12, marginTop: spacing.md },
  jthumb: {
    flex: 1,
    aspectRatio: 1.2,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  jthumbLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(14,27,44,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  jthumbLabelText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  jthumbEdit: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  journeyMeta: { color: colors.textMuted, fontSize: 13 },
  journeyPct: { color: colors.success, fontSize: 13, fontWeight: '700' },
  journeyBar: { height: 6, backgroundColor: colors.cardElev, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  journeyFill: { height: '100%', backgroundColor: colors.success },

  // Personalized Next Steps
  nextCard: {
    backgroundColor: '#DDEBFB',
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.md,
  },
  nextTitle: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  riskBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 12,
  },
  riskTitle: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  riskBody: { color: colors.text, fontSize: 13, marginTop: 4, lineHeight: 18 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepText: { color: colors.text, fontSize: 14, fontWeight: '500' },

  // FAB
  fabWrap: {
    position: 'absolute',
    right: spacing.xl,
    bottom: 90,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.cardStrong,
  },
});
