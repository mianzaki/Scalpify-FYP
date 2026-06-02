import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Pill, PrimaryButton, ScreenProgress, SecondaryButton } from '../components/ui';
import { AppHeader } from '../components/Header';
import { NorwoodBars } from '../components/charts';
import { BeforeAfterScalp } from '../components/BeforeAfterScalp';
import { colors, shadow, spacing } from '../theme';
import { useLatestScanFull, useScanHistory } from '../scanStore';
import { generateHairJourney, type HairJourneyResponse } from '../api';
import type { RootStackParamList } from '../navigation';

function severityVariant(s: string): 'success' | 'warning' | 'danger' | 'primary' {
  const u = s.toLowerCase();
  if (u.includes('mild') || u.includes('normal')) return 'success';
  if (u.includes('moderate')) return 'warning';
  if (u.includes('severe') || u.includes('advanced')) return 'danger';
  return 'primary';
}

function generateClinicianNote(coverage: number, baldness: number, severity: string, norwood: string): string {
  const sev = (severity ?? '').toLowerCase();
  const norm = (norwood ?? '').toUpperCase().trim();
  if (sev.includes('mild') || ['I', 'II'].includes(norm)) {
    return `Coverage at ${coverage.toFixed(0)}% with only ${baldness.toFixed(0)}% thinning — early-stage pattern. Consistent topical therapy can preserve density through the next 12 months.`;
  }
  if (sev.includes('moderate') || ['III', 'IV'].includes(norm)) {
    return `Norwood ${norwood} pattern with ${baldness.toFixed(0)}% thinning concentrated in the vertex. Combination therapy (oral + topical) typically halts progression and recovers 10–15% coverage over 3 months.`;
  }
  return `Advanced thinning at ${baldness.toFixed(0)}%, hair coverage ${coverage.toFixed(0)}%. Discuss restoration options (FUE/medication stack) with your clinician — pharmacological response alone is limited at this stage.`;
}

function minutesAgo(ts: number): string {
  const diff = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (diff === 0) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}

type GenState = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; data: HairJourneyResponse } | { kind: 'error'; message: string };

export default function ScanResultsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scan = useLatestScanFull();
  const history = useScanHistory();
  const [gen, setGen] = useState<GenState>({ kind: 'idle' });

  if (!scan) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <AppHeader />
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="scan" size={36} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No scan yet</Text>
          <Text style={styles.emptyBody}>
            Capture your first scalp scan to see your AI-powered Scalp Report here.
          </Text>
          <PrimaryButton
            label="Take a scan"
            iconRight="scan"
            onPress={() => nav.navigate('Camera')}
            style={{ marginTop: spacing.xl, paddingHorizontal: spacing.xxl }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const m = scan.data.measurements.percentage;
  const c = scan.data.classification;
  const confidencePct = Math.round((c.confidence ?? 0) * 100);
  const sev = severityVariant(c.severity);

  async function handleShare() {
    if (!scan) return;
    try {
      await Share.share({
        message:
          `My Scalpify scan results:\n` +
          `• Hair coverage: ${m.hair_coverage.toFixed(0)}%\n` +
          `• Baldness ratio: ${m.baldness_ratio.toFixed(0)}%\n` +
          `• Severity: ${c.severity ?? '—'} (Norwood ${c.norwood_scale ?? '—'})\n` +
          `Analyzed with Scalpify.`,
      });
    } catch {
      // user dismissed the share sheet — ignore
    }
  }

  function handleFeedback() {
    Linking.openURL(
      'mailto:?subject=Scalpify%20scan%20feedback&body=Something%20about%20my%20scan%20result%20looked%20off%3A%0A%0A',
    ).catch(() => Alert.alert('Could not open mail', 'No email app is configured on this device.'));
  }

  async function runGenerate() {
    if (!scan) return;
    setGen({ kind: 'busy' });
    try {
      const data = await generateHairJourney(scan.photoUri);
      setGen({ kind: 'ok', data });
    } catch (e: any) {
      setGen({ kind: 'error', message: e?.message ?? String(e) });
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenProgress pct={Math.max(20, Math.min(95, Math.round(m.hair_coverage)))} />
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.labelTag}>ANALYSIS COMPLETE</Text>
              <Text style={styles.pageTitle}>Scalp Report</Text>
            </View>
            <Pressable onPress={handleShare} style={styles.iconCircle} hitSlop={6}>
              <Ionicons name="share-outline" size={18} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => nav.navigate('Camera')} style={styles.newScanBtn} hitSlop={6}>
              <Ionicons name="scan" size={16} color={colors.primary} />
              <Text style={styles.newScanText}>New Scan</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Treatment Plan"
                onPress={() => (nav as any).navigate('MainTabs', { screen: 'Track' })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label="View Trends"
                iconLeft="trending-up"
                onPress={() => nav.navigate('NorwoodAnalysis')}
              />
            </View>
          </View>

          <Card>
            <View style={styles.photoWrap}>
              <Image source={{ uri: scan.photoUri }} style={styles.photo} resizeMode="cover" />
              <View style={styles.overlayPillsCol}>
                <View style={[styles.overlayPill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <View style={[styles.overlayDot, { backgroundColor: colors.success }]} />
                  <Text style={styles.overlayPillText}>Growth Area</Text>
                </View>
                <View style={[styles.overlayPill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <View style={[styles.overlayDot, { backgroundColor: colors.danger }]} />
                  <Text style={styles.overlayPillText}>Thinning</Text>
                </View>
              </View>
            </View>
            <View style={styles.confidenceRow}>
              <View style={styles.confidenceIcon}>
                <Ionicons name="flask" size={18} color={colors.successText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.confidenceTitle}>AI Analysis Active</Text>
                <Text style={styles.confidenceSub}>High Confidence Score ({confidencePct}%)</Text>
              </View>
              <Text style={styles.captureMeta}>Captured{'\n'}{minutesAgo(scan.capturedAt)}</Text>
            </View>
          </Card>

          {/* AI Analysis — drag-to-compare original vs detected regions */}
          {!!(scan.data.coordinates?.bald_segments?.length || scan.data.coordinates?.hair_segments?.length) && (
            <Card>
              <Text style={styles.smallTitle}>AI Analysis</Text>
              <Text style={styles.scalpSub}>Drag the slider to compare your photo with the AI detection.</Text>
              <View style={{ marginTop: spacing.md }}>
                <BeforeAfterScalp photoUri={scan.photoUri} coordinates={scan.data.coordinates} />
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: 'rgba(34,211,238,0.6)' }]} />
                  <Text style={styles.legendText}>Hair</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: colors.danger }]} />
                  <Text style={styles.legendText}>Thinning / bald</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Norwood Scale chart */}
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.smallTitle}>Norwood Scale</Text>
              <Pill label={c.severity?.toUpperCase() ?? 'UNRATED'} variant={sev} />
            </View>
            <View style={{ marginTop: spacing.md }}>
              <NorwoodBars active={c.norwood_scale ?? ''} height={70} />
            </View>
          </Card>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>Hair Coverage</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {m.hair_coverage.toFixed(0)}<Text style={styles.statUnit}> %</Text>
              </Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>Baldness Ratio</Text>
              <Text style={[styles.statValue, { color: colors.danger }]}>
                {(m.baldness_ratio / 100).toFixed(2)}
              </Text>
            </Card>
          </View>

          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={styles.statLabel}>Calculated Area</Text>
                <Text style={styles.areaValue}>
                  {scan.data.measurements?.cm2?.total_head?.toFixed(1) ?? '—'} cm²
                </Text>
              </View>
              <Ionicons name="resize-outline" size={24} color={colors.textDim} />
            </View>
          </Card>

          <View style={styles.clinNoteCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="bulb-outline" size={18} color={colors.successText} />
              <Text style={styles.clinNoteTitle}>Clinician's Note</Text>
            </View>
            <Text style={styles.clinNoteBody}>
              {generateClinicianNote(m.hair_coverage, m.baldness_ratio, c.severity, c.norwood_scale)}
            </Text>
          </View>

          {/* Disclaimer + feedback */}
          <View style={styles.disclaimerCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
              <Text style={styles.disclaimerTitle}>Disclaimer</Text>
            </View>
            <Text style={styles.disclaimerBody}>
              AI can make mistakes — feel free to retake the scan if something doesn't look right, and
              always check with your doctor.
            </Text>
            <Pressable onPress={handleFeedback} style={styles.feedbackBtn}>
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.text} />
              <Text style={styles.feedbackText}>Send feedback</Text>
            </Pressable>
          </View>

          {/* Recent Scans */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            <Pressable hitSlop={8} onPress={() => nav.navigate('Journey')}>
              <Text style={styles.viewAll}>View History →</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {history.slice(1, 3).map(s => (
              <View key={s.id} style={styles.histCard}>
                <Image source={{ uri: s.photoUri }} style={styles.histImage} />
                <Text style={styles.histDate}>{new Date(s.capturedAt).toDateString().slice(4)}</Text>
                <Text style={styles.histPct}>
                  {s.data.measurements.percentage.hair_coverage.toFixed(0)}% Coverage
                </Text>
              </View>
            ))}
            {history.length < 2 && (
              <View style={[styles.histCard, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>
                  Take more scans to build your history
                </Text>
              </View>
            )}
          </View>

          {/* Optional: hair journey */}
          {gen.kind === 'idle' && (
            <SecondaryButton label="Generate AI Recovery Preview" iconLeft="sparkles" onPress={runGenerate} />
          )}
          {gen.kind === 'busy' && (
            <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.textMuted, marginTop: 8 }}>Generating preview… ~2-3 min</Text>
            </View>
          )}
          {gen.kind === 'ok' && gen.data.result && (
            <Card>
              <Text style={styles.smallTitle}>Recovery Preview</Text>
              <View style={{ gap: spacing.md, marginTop: spacing.md }}>
                {gen.data.result.iterations
                  .slice()
                  .sort((a, b) => a.iteration_number - b.iteration_number)
                  .map(it => (
                    <View key={it.iteration_number}>
                      <Image source={{ uri: it.image_url }} style={styles.stageImage} resizeMode="cover" />
                      <Text style={styles.stageLabel}>Iteration {it.iteration_number}</Text>
                    </View>
                  ))}
              </View>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl, gap: 12 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { color: colors.textStrong, fontSize: 22, fontWeight: '800' },
  emptyBody: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  labelTag: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  pageTitle: { color: colors.textStrong, fontSize: 30, fontWeight: '800', marginTop: 4 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  newScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  newScanText: { color: colors.primary, fontSize: 14, fontWeight: '700' },

  photoWrap: { position: 'relative' },
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, backgroundColor: colors.cardElev },
  overlayPillsCol: { position: 'absolute', top: 10, left: 10, gap: 8 },
  overlayPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  overlayDot: { width: 8, height: 8, borderRadius: 4 },
  overlayPillText: { color: colors.textStrong, fontSize: 12, fontWeight: '600' },

  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.md },
  confidenceIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center',
  },
  confidenceTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  confidenceSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  captureMeta: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },

  smallTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  scalpSub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },

  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },

  legendRow: { flexDirection: 'row', gap: 18, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  disclaimerCard: { backgroundColor: colors.cardSolid, borderRadius: 16, padding: spacing.lg, gap: 8, borderWidth: 1, borderColor: colors.borderSoft },
  disclaimerTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  disclaimerBody: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  feedbackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 4, paddingVertical: 11, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border,
  },
  feedbackText: { color: colors.text, fontSize: 14, fontWeight: '600' },

  statCard: { flex: 1 },
  statLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  statValue: { fontSize: 32, fontWeight: '800', marginTop: 6 },
  statUnit: { fontSize: 14, fontWeight: '500' },

  areaValue: { color: colors.textStrong, fontSize: 24, fontWeight: '800', marginTop: 4 },

  clinNoteCard: {
    backgroundColor: colors.successSoft,
    borderRadius: 16,
    padding: spacing.lg,
    gap: 8,
  },
  clinNoteTitle: { color: colors.successText, fontSize: 14, fontWeight: '700' },
  clinNoteBody: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },

  sectionTitle: { color: colors.textStrong, fontSize: 18, fontWeight: '700' },
  viewAll: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  histCard: {
    flex: 1,
    backgroundColor: colors.cardSolid,
    borderRadius: 14,
    padding: 8,
    gap: 6,
    ...shadow.card,
  },
  histImage: { width: '100%', aspectRatio: 1.2, borderRadius: 10, backgroundColor: colors.cardElev },
  histDate: { color: colors.text, fontSize: 13, fontWeight: '600' },
  histPct: { color: colors.textMuted, fontSize: 11 },

  stageImage: { width: '100%', aspectRatio: 1, borderRadius: 14 },
  stageLabel: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 6 },
});
