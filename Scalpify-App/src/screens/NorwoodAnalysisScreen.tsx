import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Pill, Segmented } from '../components/ui';
import { AppHeader, PageTitle } from '../components/Header';
import { ProgressRing, SparkLine } from '../components/charts';
import { colors, shadow, spacing } from '../theme';
import { useScanHistory } from '../scanStore';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function bucketByMonth(history: { capturedAt: number; data: { measurements: { percentage: { hair_coverage: number; baldness_ratio: number } } } }[], months: number) {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1).getTime();
  const map = new Map<string, { ts: number; baldness: number }>();
  for (const s of history) {
    if (s.capturedAt < cutoff) continue;
    const d = new Date(s.capturedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const prev = map.get(key);
    if (!prev || s.capturedAt > prev.ts) {
      map.set(key, { ts: s.capturedAt, baldness: s.data.measurements.percentage.baldness_ratio });
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => a[1].ts - b[1].ts)
    .map(([k, v]) => ({ key: k, month: MONTH_NAMES[Number(k.split('-')[1])], baldness: v.baldness }));
}

export default function NorwoodAnalysisScreen() {
  const history = useScanHistory();
  const [range, setRange] = useState<'3' | '6'>('3');
  const monthCount = range === '3' ? 3 : 6;
  const chart = useMemo(() => bucketByMonth(history, monthCount), [history, monthCount]);

  const latest = history[0];
  const oldest = history[history.length - 1];
  const delta =
    latest && oldest
      ? latest.data.measurements.percentage.hair_coverage -
        oldest.data.measurements.percentage.hair_coverage
      : null;

  const monthGrid = useMemo(() => {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const startDow = (first.getDay() + 6) % 7; // Mon-first
    const cells: { day: number | null; hasScan: boolean; isToday: boolean; isFuture: boolean }[] = [];
    for (let i = 0; i < startDow; i++) cells.push({ day: null, hasScan: false, isToday: false, isFuture: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(today.getFullYear(), today.getMonth(), d);
      const hasScan = history.some(s => {
        const sd = new Date(s.capturedAt);
        return sd.getFullYear() === date.getFullYear() && sd.getMonth() === date.getMonth() && sd.getDate() === d;
      });
      cells.push({
        day: d,
        hasScan,
        isToday: d === today.getDate(),
        isFuture: date.getTime() > today.getTime(),
      });
    }
    return cells.slice(0, 21); // show 3 weeks like the mock
  }, [history]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <AppHeader showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <PageTitle
          title="Progression Trends"
          subtitle={
            delta !== null
              ? `Your hair density has ${delta >= 0 ? 'improved' : 'decreased'} by ${Math.abs(delta).toFixed(1)}% in the last ${monthCount} months.`
              : `Take a few scans to start seeing density trends over time.`
          }
        />

        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={styles.cardTitle}>Baldness{'\n'}Ratio over{'\n'}Time</Text>
              <Segmented
                value={range}
                onChange={setRange}
                options={[
                  { value: '3', label: '3 Months' },
                  { value: '6', label: '6 Months' },
                ]}
              />
            </View>

            <View style={styles.chartArea}>
              <SparkLine
                data={chart.map(p => p.baldness)}
                width={280}
                height={120}
                color={colors.primary}
              />
            </View>
            <View style={styles.chartXAxis}>
              {chart.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>—</Text>
              ) : (
                chart.map((p, i) => (
                  <Text key={p.key} style={[styles.axisLabel, i === chart.length - 1 && { color: colors.primary }]}>{p.month}</Text>
                ))
              )}
            </View>
          </Card>

          <View style={styles.scanActivity}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.cardTitle, { color: colors.successText }]}>Scan Activity</Text>
              <Ionicons name="calendar-outline" size={20} color={colors.successText} />
            </View>
            <View style={styles.weekHead}>
              {WEEKDAYS.map((d, i) => (
                <Text key={`${d}-${i}`} style={styles.weekHeadText}>{d}</Text>
              ))}
            </View>
            <View style={styles.dayGrid}>
              {monthGrid.map((cell, i) => {
                if (cell.day === null) return <View key={i} style={styles.dayCell} />;
                return (
                  <View key={i} style={styles.dayCell}>
                    <View
                      style={[
                        styles.dayBubble,
                        cell.hasScan && { backgroundColor: colors.success },
                        cell.isToday && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          (cell.hasScan || cell.isToday) && { color: '#fff', fontWeight: '700' },
                          cell.isFuture && { color: colors.textDim },
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.legendRow}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Scheduled Scan</Text>
            </View>
          </View>

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
                trackColor="#FFFFFF"
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

  scanActivity: {
    backgroundColor: '#D9EFDA',
    borderRadius: 18,
    padding: spacing.lg,
  },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md, paddingHorizontal: 4 },
  weekHeadText: { color: colors.successText, fontSize: 12, fontWeight: '700', width: 36, textAlign: 'center' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayBubble: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayText: { color: colors.text, fontSize: 13 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, paddingTop: 8, borderTopWidth: 1, borderColor: 'rgba(15,122,55,0.2)' },

  tableHead: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderColor: colors.borderSoft },
  tableHeadText: { color: colors.textMuted, fontSize: 12, fontWeight: '600', flex: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderSoft },
  cellDate: { color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 },
  cellCov: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },

  insightCard: {
    backgroundColor: '#DDEBFB',
    borderRadius: 18,
    padding: spacing.lg,
    gap: 8,
  },
  insightLabel: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  insightTitle: { color: colors.primary, fontSize: 20, fontWeight: '800' },
  insightBody: { color: colors.text, fontSize: 13, lineHeight: 19 },
  insightRingText: { color: colors.primary, fontSize: 22, fontWeight: '800' },
});
