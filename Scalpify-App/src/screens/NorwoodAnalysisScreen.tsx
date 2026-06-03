import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Pill, Segmented } from '../components/ui';
import { AppHeader, PageTitle } from '../components/Header';
import { ProgressRing, SparkLine } from '../components/charts';
import { colors, shadow, spacing } from '../theme';
import { useScanHistory, type ScanRecord } from '../scanStore';

// One point per scan within the selected window — a real coverage trend that moves
// even with closely-spaced scans (vs. the old per-month bucketing that looked flat).
function scansInWindow(history: ScanRecord[], months: number) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const c = cutoff.getTime();
  return history
    .filter(s => s.capturedAt >= c)
    .slice()
    .sort((a, b) => a.capturedAt - b.capturedAt)
    .map(s => ({ ts: s.capturedAt, coverage: s.data.measurements.percentage.hair_coverage }));
}

function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NorwoodAnalysisScreen() {
  const history = useScanHistory();
  const [range, setRange] = useState<'3' | '6'>('3');
  const monthCount = range === '3' ? 3 : 6;
  const chart = useMemo(() => scansInWindow(history, monthCount), [history, monthCount]);

  const latest = history[0];
  const oldest = history[history.length - 1];
  const delta =
    latest && oldest
      ? latest.data.measurements.percentage.hair_coverage -
        oldest.data.measurements.percentage.hair_coverage
      : null;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <AppHeader showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <PageTitle
          title="Progression Tracking"
          subtitle={
            delta !== null
              ? `Monitor your scalp health over time.`
              : `Take a few scans to start seeing density trends over time.`
          }
        />

        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={styles.cardTitle}>Hair Coverage{'\n'}over Time</Text>
              <Segmented
                value={range}
                onChange={setRange}
                options={[
                  { value: '3', label: '3 Months' },
                  { value: '6', label: '6 Months' },
                ]}
              />
            </View>

            {chart.length < 2 ? (
              <View style={styles.chartEmpty}>
                <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
                  {chart.length === 0
                    ? 'No scans in this period.'
                    : 'Take another scan to start a coverage trend.'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.chartArea}>
                  <SparkLine
                    data={chart.map(p => p.coverage)}
                    width={280}
                    height={120}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.chartXAxis}>
                  <Text style={[styles.axisLabel, { textAlign: 'left' }]}>{shortDate(chart[0].ts)}</Text>
                  <Text style={[styles.axisLabel, { textAlign: 'right', color: colors.primary }]}>
                    {shortDate(chart[chart.length - 1].ts)}
                  </Text>
                </View>
              </>
            )}
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Scan History</Text>
            <View style={{ marginTop: spacing.md }}>
              <View style={styles.tableHead}>
                <Text style={styles.tableHeadText}>Date</Text>
                <Text style={[styles.tableHeadText, { flex: 1.4, textAlign: 'center' }]}>Status</Text>
                <Text style={styles.tableHeadText}>Coverage</Text>
              </View>
              {history.slice(0, 5).map((s, idx) => {
                const cov = s.data.measurements.percentage.hair_coverage;
                const prev = history[idx + 1]?.data.measurements.percentage.hair_coverage;
                const trend =
                  prev === undefined ? 'first' : cov - prev > 0.5 ? 'up' : cov - prev < -0.5 ? 'down' : 'stable';
                return (
                  <View key={s.id} style={styles.tableRow}>
                    <Text style={styles.cellDate}>
                      {new Date(s.capturedAt).toDateString().slice(4, 10)},{'\n'}
                      {new Date(s.capturedAt).getFullYear()}
                    </Text>
                    <View style={{ flex: 1.4, alignItems: 'center' }}>
                      <Pill
                        label={trend === 'up' ? '↗ Improving' : trend === 'down' ? '↘ Down' : trend === 'stable' ? '— Stable' : 'First'}
                        variant={trend === 'up' ? 'success' : trend === 'down' ? 'danger' : 'primary'}
                      />
                    </View>
                    <Text style={styles.cellCov}>{cov.toFixed(0)}%</Text>
                  </View>
                );
              })}
              {history.length === 0 && (
                <Text style={{ color: colors.textMuted, marginTop: 8 }}>No scans yet.</Text>
              )}
            </View>
          </Card>

          <View style={styles.insightCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="bulb" size={16} color={colors.primary} />
              <Text style={styles.insightLabel}>AI INSIGHT</Text>
            </View>
            <Text style={styles.insightTitle}>
              {history.length < 2
                ? 'Building your baseline'
                : delta === null || delta === 0
                  ? 'Stable density'
                  : delta > 0
                    ? 'Positive Density Shift'
                    : 'Coverage decline'}
            </Text>
            <Text style={styles.insightBody}>
              {history.length < 2
                ? `Take ${2 - history.length} more scan${2 - history.length === 1 ? '' : 's'} to start tracking trends.`
                : delta === null
                  ? 'No measurable change yet.'
                  : delta > 0
                    ? `Coverage up ${delta.toFixed(1)}% over the last ${monthCount} months. Hold the current regimen for another 60 days to consolidate growth.`
                    : `Coverage down ${Math.abs(delta).toFixed(1)}% over the last ${monthCount} months. Review adherence and consider escalating therapy with your clinician.`}
            </Text>
            <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
              <ProgressRing
                pct={Math.min(100, Math.max(0, delta !== null ? Math.abs(delta) * 10 : 0))}
                size={100}
                stroke={9}
                color={colors.primary}
                trackColor={colors.cardElev}
              >
                <Text style={styles.insightRingText}>
                  {delta !== null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%` : '—'}
                </Text>
              </ProgressRing>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  cardTitle: { color: colors.textStrong, fontSize: 22, fontWeight: '800', lineHeight: 26 },

  chartArea: { height: 130, marginTop: spacing.md, alignItems: 'center' },
  chartXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  axisLabel: { color: colors.textMuted, fontSize: 12, flex: 1, textAlign: 'center' },
  chartEmpty: { height: 110, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },

  tableHead: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderColor: colors.borderSoft },
  tableHeadText: { color: colors.textMuted, fontSize: 12, fontWeight: '600', flex: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderSoft },
  cellDate: { color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 },
  cellCov: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },

  insightCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: spacing.lg,
    gap: 8,
  },
  insightLabel: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  insightTitle: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  insightBody: { color: colors.text, fontSize: 13, lineHeight: 19 },
  insightRingText: { color: colors.primary, fontSize: 22, fontWeight: '800' },
});
