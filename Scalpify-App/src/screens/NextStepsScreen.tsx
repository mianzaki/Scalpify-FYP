import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Pill, PrimaryButton, ScreenProgress } from '../components/ui';
import { AppHeader, PageTitle } from '../components/Header';
import { ProgressRing } from '../components/charts';
import { colors, shadow, spacing } from '../theme';
import { useLatestScanFull, useScanHistory } from '../scanStore';
import { useUser } from '../userStore';
import { computeRisk, riskNote } from '../medicalContext';
import { getLastMarkedAt } from '../medsStore';
import type { RootStackParamList } from '../navigation';

const QUOTES = [
  'Your journey is a marathon, not a sprint.',
  'Small consistent steps yield permanent results.',
  'The follicle remembers what you do daily, not occasionally.',
  'Recovery is non-linear — track patterns, not single days.',
  'Patience is the most underrated growth factor.',
  'What you measure, you can manage.',
  'Today\'s adherence is tomorrow\'s density.',
];

function quoteForToday(d: Date = new Date()): string {
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length];
}

function timeAgo(ts: number | null): string {
  if (ts === null) return 'Never logged';
  const diffMin = Math.floor((Date.now() - ts) / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function rangeFromHistory(history: { capturedAt: number }[]): string {
  if (history.length < 2) return 'Need 2+ scans to compare';
  const oldest = history[history.length - 1].capturedAt;
  const months = Math.max(1, Math.round((Date.now() - oldest) / (30 * 86_400_000)));
  return `Compare metrics over ${months} month${months === 1 ? '' : 's'}`;
}

function bookConsultation() {
  Alert.alert(
    'Book a consultation',
    'Share your latest report with a certified trichologist by email.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Mail',
        onPress: () =>
          Linking.openURL(
            'mailto:?subject=Scalpify%20scan%20review%20request&body=Hi%2C%20I%27d%20like%20to%20schedule%20a%20consultation%20based%20on%20my%20latest%20scan.',
          ),
      },
    ],
  );
}

export default function NextStepsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scan = useLatestScanFull();
  const history = useScanHistory();
  const user = useUser();
  const risk = computeRisk(user?.medical);
  const note = riskNote(risk);
  const pct = risk.percent;
  const scanDate = scan ? new Date(scan.capturedAt) : null;

  // Density delta: newest vs oldest scan in the last 90 days. Falls back to "—".
  const densityDeltaPct: number | null = (() => {
    if (history.length < 2) return null;
    const newest = history[0];
    const cutoff = newest.capturedAt - 90 * 86_400_000;
    const baseline = [...history].reverse().find(s => s.capturedAt >= cutoff) ?? history[history.length - 1];
    return (
      newest.data.measurements.percentage.hair_coverage -
      baseline.data.measurements.percentage.hair_coverage
    );
  })();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScreenProgress pct={45} />
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <PageTitle
          title="Your Plan"
          subtitle={
            scanDate
              ? `Based on your clinical assessment from ${scanDate.toDateString().slice(4)}.`
              : 'Take your first scan to see a personalised plan.'
          }
        />

        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <Card>
            <View style={{ alignItems: 'center' }}>
              <RiskRing pct={pct} />
              <View style={{ marginTop: spacing.md }}>
                <Pill
                  label={`⚠ ${risk.level === 'high' ? 'High' : risk.level === 'elevated' ? 'Elevated' : risk.level === 'low' ? 'Low' : 'Standard'} Risk`}
                  variant={risk.level === 'low' ? 'success' : risk.level === 'standard' ? 'primary' : 'danger'}
                />
              </View>
            </View>
            <Text style={styles.cardTitle}>
              {risk.level === 'low' ? 'Maintain your routine' : 'Prioritize medication consistency'}
            </Text>
            <Text style={styles.cardBody}>
              {note ??
                'Your follicles show signs of miniaturization. Adhering to your prescribed routine is critical to prevent further thinning in the vertex area.'}
            </Text>
          </Card>

          <View style={styles.recCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="medkit" size={20} color={colors.successText} />
              <Text style={styles.recLabel}>Recommendation</Text>
            </View>
            <Text style={styles.recBody}>
              Consider a professional trichologist consultation for a micro-analysis of your scalp health.
            </Text>
            <PrimaryButton
              variant="success"
              label="Book Consultation"
              onPress={bookConsultation}
              style={{ marginTop: spacing.md, backgroundColor: '#1F8A3A' }}
            />
          </View>

          <Row
            icon="medical"
            iconBg={colors.primarySoft}
            iconTint={colors.primary}
            title="Medication Tracker"
            sub={`Last logged: ${timeAgo(getLastMarkedAt())}`}
            onPress={() => nav.navigate('MainTabs', { screen: 'Track' } as any)}
          />
          <Row
            icon="flask"
            iconBg={colors.cardElev}
            iconTint={colors.text}
            title="Detailed Scan History"
            sub={rangeFromHistory(history)}
            onPress={() => nav.navigate('Journey')}
          />

          <Card>
            <Text style={styles.smallTitle}>Vertex Follicle Density</Text>
            <Text style={styles.cardBodyTight}>
              {densityDeltaPct === null
                ? 'Take at least two scans to see your density trend over time.'
                : densityDeltaPct >= 0
                  ? `Your scans show a ${densityDeltaPct.toFixed(1)}% increase in coverage over the last 90 days. Stay consistent to reinforce this trend.`
                  : `Your scans show a ${Math.abs(densityDeltaPct).toFixed(1)}% decrease in coverage over the last 90 days. Tightening adherence now can reverse this within 90 days.`}
            </Text>
            <View style={styles.legendRow}>
              <Legend dot={colors.primary} label="Active Growth" />
              <Legend dot={colors.textDim} label="Dormant" />
            </View>
            <View style={styles.darkImage}>
              <Ionicons name="leaf" size={56} color={colors.primary} style={{ opacity: 0.4 }} />
            </View>
          </Card>

          <Text style={styles.quote}>"{quoteForToday()}"</Text>
        </View>
      </ScrollView>

      <Pressable onPress={() => nav.navigate('Camera')} style={styles.fabWrap}>
        <View style={styles.fab}>
          <Ionicons name="add" size={26} color="#fff" />
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

function RiskRing({ pct }: { pct: number }) {
  return (
    <ProgressRing pct={pct} size={140} stroke={11}>
      <Text style={styles.ringPct}>{pct}%</Text>
      <Text style={styles.ringSub}>RISK</Text>
    </ProgressRing>
  );
}

function Row({
  icon,
  iconBg,
  iconTint,
  title,
  sub,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  iconTint: string;
  title: string;
  sub: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconTint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSub}>{sub}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
      </View>
    </Pressable>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  ringPct: { color: colors.primary, fontSize: 30, fontWeight: '800' },
  ringSub: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  cardTitle: { color: colors.textStrong, fontSize: 22, fontWeight: '800', marginTop: spacing.lg, textAlign: 'center' },
  cardBody: { color: colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: spacing.md, textAlign: 'center' },
  cardBodyTight: { color: colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: 8 },
  smallTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  recCard: {
    backgroundColor: '#C8F0CC',
    borderRadius: 18,
    padding: spacing.lg,
    gap: 8,
  },
  recLabel: { color: colors.successText, fontSize: 15, fontWeight: '700' },
  recBody: { color: colors.text, fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: 16,
    gap: 12,
    ...shadow.card,
  },
  rowIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  rowSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: spacing.md },
  darkImage: {
    backgroundColor: '#10222F',
    borderRadius: 14,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  quote: { color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', fontSize: 13 },

  fabWrap: { position: 'absolute', right: spacing.xl, bottom: 90 },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.cardStrong,
  },
});
