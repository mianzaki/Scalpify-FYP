import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Pill, PrimaryButton, ScreenProgress } from '../components/ui';
import { AppHeader, PageTitle } from '../components/Header';
import { colors, shadow, spacing } from '../theme';
import { useScanHistory, useLatestScanFull } from '../scanStore';
import { generateHairJourney, type HairJourneyResponse } from '../api';
import { treatmentSummary } from '../medicalContext';
import { useUser } from '../userStore';
import { useNavigation } from '@react-navigation/native';

const ITERATIONS = [5, 10, 15, 20];

type GenState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'ok'; data: HairJourneyResponse }
  | { kind: 'error'; message: string };

export default function JourneyScreen() {
  const nav = useNavigation<any>();
  const user = useUser();
  const history = useScanHistory();
  const latest = useLatestScanFull();
  const [iter, setIter] = useState<number>(20);
  const [gen, setGen] = useState<GenState>({ kind: 'idle' });

  const baseline = history[history.length - 1] ?? latest;
  const treatment = treatmentSummary(user?.medical);

  // Real density delta between earliest and latest scan, in % coverage points.
  const densityDelta: number | null = (() => {
    if (history.length < 2) return null;
    const newest = history[0].data.measurements.percentage.hair_coverage;
    const oldest = history[history.length - 1].data.measurements.percentage.hair_coverage;
    return newest - oldest;
  })();

  // Iterations actually produced in the latest hair-journey generation.
  const iterationCount =
    gen.kind === 'ok' && gen.data.result ? gen.data.result.iterations.length : 0;

  const simulatedUri = useMemo(() => {
    if (gen.kind === 'ok' && gen.data.result) {
      const sorted = gen.data.result.iterations.slice().sort((a, b) => a.iteration_number - b.iteration_number);
      return sorted[sorted.length - 1]?.image_url ?? latest?.photoUri;
    }
    return latest?.photoUri;
  }, [gen, latest]);

  async function runGenerate() {
    if (!latest) return;
    setGen({ kind: 'busy' });
    try {
      const data = await generateHairJourney(latest.photoUri);
      setGen({ kind: 'ok', data });
    } catch (e: any) {
      setGen({ kind: 'error', message: e?.message ?? String(e) });
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScreenProgress pct={60} />
      <AppHeader showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <PageTitle
          title="Regrowth Simulation"
          subtitle="AI-powered visual progression based on your scalp health data."
        />

        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <View style={styles.compareRow}>
            <Compare label="Baseline" uri={baseline?.photoUri} />
            <View style={styles.swapBtn}>
              <Ionicons name="swap-horizontal" size={20} color="#fff" />
            </View>
            <Compare label={`Simulated: Iteration ${iter}`} uri={simulatedUri} highlight />
          </View>

          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>Timeline{'\n'}Selector</Text>
              <Pill label={`Iteration ${iter} Selected`} variant="primary" />
            </View>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderFill,
                  { width: `${(iter / 20) * 100}%` },
                ]}
              />
              <View style={[styles.sliderKnob, { left: `${(iter / 20) * 100}%` }]} />
            </View>
            <View style={styles.iterRow}>
              {ITERATIONS.map(n => (
                <Pressable key={n} onPress={() => setIter(n)} hitSlop={6}>
                  <Text style={[styles.iterLabel, iter === n && { color: colors.primary, fontWeight: '700' }]}>
                    Iteration {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.sessIcon}>
                <Ionicons name="checkmark" size={20} color={colors.successText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessTitle}>Session {Math.max(1, Math.ceil(history.length / 5))}</Text>
                <Text style={styles.sessSub}>
                  {history.length} scan{history.length === 1 ? '' : 's'} uploaded
                  {iterationCount > 0 ? ` · ${iterationCount} AI iterations` : ''}
                </Text>
              </View>
            </View>
            <KeyValue
              label="AI Iterations"
              value={iterationCount > 0 ? String(iterationCount) : '—'}
              valueColor={colors.primary}
            />
            <KeyValue
              label="Coverage Trend"
              value={densityDelta === null ? '—' : `${densityDelta >= 0 ? '+' : ''}${densityDelta.toFixed(1)}%`}
              valueColor={densityDelta === null ? colors.textMuted : densityDelta >= 0 ? colors.success : colors.danger}
            />

            {gen.kind === 'busy' ? (
              <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.textMuted, marginTop: 8 }}>
                  Generating new iteration… ~2-3 minutes
                </Text>
              </View>
            ) : (
              <PrimaryButton
                label="Generate New Iteration"
                onPress={runGenerate}
                disabled={!latest}
                style={{ marginTop: spacing.md }}
              />
            )}
            {gen.kind === 'error' && (
              <Text style={{ color: colors.danger, fontSize: 12, marginTop: 6 }}>{gen.message}</Text>
            )}
          </Card>

          <View style={styles.paramCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>Parameters</Text>
              <Pressable onPress={() => nav.navigate('MedicalProfile')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="settings-outline" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Adjust</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md }}>
              {treatment ? (
                treatment.split(' + ').map(t => (
                  <Pill key={t} label={t} variant="success" />
                ))
              ) : (
                <>
                  <Pill label="Minoxidil 5%" variant="success" />
                  <Pill label="Dermaroller" variant="default" />
                </>
              )}
            </View>
            <Text style={styles.paramNote}>
              Simulation assumes consistent adherence to the current treatment protocol.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              These results are simulated based on average growth rates. Actual results may vary depending
              on genetic factors and hormonal levels.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Compare({ uri, label, highlight }: { uri?: string; label: string; highlight?: boolean }) {
  return (
    <View style={[styles.compareBox, highlight && { borderColor: colors.primary, borderWidth: 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={{ flex: 1, borderRadius: 14 }} resizeMode="cover" />
      ) : (
        <View style={[styles.compareEmpty]}>
          <Ionicons name="image-outline" size={28} color={colors.textDim} />
        </View>
      )}
      <View style={[styles.compareLabel, highlight && { backgroundColor: colors.primary }]}>
        <Text style={styles.compareLabelText}>{label}</Text>
      </View>
    </View>
  );
}

function KeyValue({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={[styles.kvValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  compareRow: {
    flexDirection: 'row',
    gap: 8,
    height: 160,
    alignItems: 'center',
  },
  compareBox: {
    flex: 1,
    height: '100%',
    borderRadius: 14,
    backgroundColor: colors.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  compareEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  compareLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(14,27,44,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  compareLabelText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  swapBtn: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -18 }, { translateY: -18 }],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    ...shadow.card,
  },
  cardTitle: { color: colors.textStrong, fontSize: 22, fontWeight: '800', lineHeight: 26 },
  sliderTrack: {
    height: 6,
    backgroundColor: colors.cardElev,
    borderRadius: 3,
    marginTop: spacing.lg,
    position: 'relative',
  },
  sliderFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  sliderKnob: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    top: -6,
    marginLeft: -9,
    ...shadow.card,
  },
  iterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  iterLabel: { color: colors.textMuted, fontSize: 11 },

  sessIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  sessSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.borderSoft,
  },
  kvLabel: { color: colors.text, fontSize: 15 },
  kvValue: { color: colors.text, fontSize: 15, fontWeight: '700' },

  paramCard: {
    backgroundColor: colors.cardElev,
    borderRadius: 18,
    padding: spacing.lg,
  },
  paramNote: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: spacing.md },

  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#DDEBFB',
    padding: spacing.md,
    borderRadius: 14,
    alignItems: 'flex-start',
  },
  infoText: { color: colors.primary, fontSize: 13, lineHeight: 18, flex: 1 },
});
