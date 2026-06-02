import React, { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Defs, LinearGradient, Path, Polyline, Stop } from 'react-native-svg';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation';
import { daysSinceSurgery, firstNameOf, initialsOf, useUser } from '../userStore';
import {
  adherencePctForDate,
  adherenceStreak,
  formatTime,
  markDone,
  statusForToday,
  useMeds,
  useMedsRevision,
} from '../medsStore';
import { useLatestScanFull, useScanHistory } from '../scanStore';
import { WireframeHead } from '../components/WireframeHead';

/* ────────────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────────────── */

const RECOVERY_TOTAL_DAYS = 365;

const PHASES = [
  { name: 'Procedure', start: 0, end: 2 },
  { name: 'Initial Healing', start: 3, end: 14 },
  { name: 'Shedding', start: 15, end: 90 },
  { name: 'Dormant', start: 91, end: 120 },
  { name: 'Early Regrowth', start: 121, end: 240 },
  { name: 'Maturation', start: 241, end: 365 },
];

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const SERIF_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

/* Rotating daily reflections — picked by day-of-year, stable for 24h. */
const DAILY_QUOTES: { text: string; author: string }[] = [
  { text: 'Hair grows at the speed of patience, not the speed of effort.', author: 'Trichology Maxim' },
  { text: 'The follicle remembers what you do daily, not occasionally.', author: 'Clinical Adage' },
  { text: 'Consistency is the most underrated growth factor.', author: 'Dr. R. Fischer' },
  { text: 'Recovery is non-linear — track patterns, not single days.', author: 'Wellness Note' },
  { text: 'Today\'s adherence is tomorrow\'s density.', author: 'Scalpify Principle' },
  { text: 'Stress steals what diligence builds. Breathe before you bristle.', author: 'Clinical Wisdom' },
  { text: 'The scalp heals in silence — give it stillness, give it time.', author: 'Restorative Note' },
  { text: 'Sleep is the most powerful regrowth serum you own.', author: 'Sleep Medicine' },
  { text: 'Hydration before medication. Both before frustration.', author: 'Daily Reminder' },
  { text: 'Compare your scalp to last month, never to last week.', author: 'Tracking Wisdom' },
  { text: 'Shedding now is often growth preparing itself.', author: 'Post-Op Reflection' },
  { text: 'A 1% better routine, repeated 90 days, outperforms perfection done once.', author: 'Habit Science' },
  { text: 'Anxiety thins more than genetics ever could.', author: 'Mind-Body Note' },
  { text: 'You cannot rush biology, but you can refuse to interrupt it.', author: 'Recovery Mantra' },
  { text: 'Measure twice. Worry less.', author: 'Scalpify Principle' },
];

function quoteOfTheDay(d: Date): { text: string; author: string } {
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function dateLabel(d: Date): string {
  return `${DAY_NAMES[d.getDay()]} · ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function phaseForDay(day: number | null): { idx: number; phase: typeof PHASES[number] } {
  if (day == null) return { idx: 0, phase: PHASES[0] };
  for (let i = 0; i < PHASES.length; i++) {
    if (day >= PHASES[i].start && day <= PHASES[i].end) {
      return { idx: i, phase: PHASES[i] };
    }
  }
  return { idx: PHASES.length - 1, phase: PHASES[PHASES.length - 1] };
}

/* ────────────────────────────────────────────────────────────────
   Screen
   ──────────────────────────────────────────────────────────────── */

export default function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useUser();
  const meds = useMeds();
  useMedsRevision(); // re-render when a med is marked done/undone (not just list changes)
  const latest = useLatestScanFull();
  const history = useScanHistory();

  const now = useMemo(() => new Date(), []);
  const firstName = firstNameOf(user) || 'there';
  const treatmentDone = user?.medical?.treatmentDone === true;
  const day = daysSinceSurgery(user);
  const safeDay = day ?? 0;
  const { idx: phaseIdx, phase } = phaseForDay(day);

  /* latest scan summary (used by the not-yet-treated assessment card) */
  const latestBaldness = latest?.data.measurements.percentage.baldness_ratio ?? null;
  const latestSeverity = latest?.data.classification.severity ?? null;
  const latestNorwood = latest?.data.classification.norwood_scale ?? null;

  /* density delta */
  const densityValue = latest?.data.measurements.percentage.hair_coverage ?? null;
  const previousDensity = history[1]?.data.measurements.percentage.hair_coverage ?? null;
  const densityDelta = densityValue != null && previousDensity != null
    ? densityValue - previousDensity
    : null;

  /* adherence — today's done / due */
  const todayMeds = meds.map(m => ({ ...m, status: statusForToday(m) }));
  const dueToday = todayMeds.filter(m => m.status !== 'upcoming').length;
  const doneToday = todayMeds.filter(m => m.status === 'done').length;
  const adherencePct = dueToday === 0 ? 0 : Math.round((doneToday / dueToday) * 100);
  const streak = adherenceStreak();

  /* last 7 days of adherence — real per-day data from the meds store */
  const last7 = useMemo(() => {
    const days: { date: Date; pct: number }[] = [];
    const cursor = new Date(now);
    cursor.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(cursor);
      d.setDate(d.getDate() - i);
      days.push({ date: d, pct: adherencePctForDate(d) });
    }
    return days;
  }, [meds, now, adherencePct]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.logoTile}>
            <Text style={styles.logoTileText}>S</Text>
          </View>
          <Text style={styles.brandText}>SCALPIFY</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.iconBtn}
            hitSlop={8}
            onPress={() => nav.navigate('Chat')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textStrong} />
          </Pressable>
          <Pressable
            style={styles.avatar}
            onPress={() => nav.navigate('MainTabs', { screen: 'Profile' } as any)}
            hitSlop={8}
          >
            <Text style={styles.avatarText}>{initialsOf(user) || '·'}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* ─── Greeting ─── */}
        <View style={styles.greetWrap}>
          <Text style={styles.dateLabel}>{dateLabel(now)}</Text>
          <Text style={styles.greeting}>
            {greetingFor(now)},{' '}
            <Text style={styles.greetingName}>{firstName}</Text>
          </Text>
        </View>

        {/* ─── Hero card: recovery (post-transplant) OR assessment (not yet) ─── */}
        {treatmentDone ? (
          <Pressable
            onPress={() => nav.navigate('RecoveryCalendar')}
            style={({ pressed }) => [styles.recoveryCard, pressed && { opacity: 0.95 }]}
          >
            <View style={styles.recoveryHead} pointerEvents="none">
              <WireframeHead size={140} scanLine={false} animated={false} />
            </View>

            <Text style={styles.recoveryLabel}>POST-PROCEDURE</Text>
            <Text style={styles.recoveryPhase}>
              Phase {phaseIdx + 1} of {PHASES.length} · {phase.name}
            </Text>

            <View style={styles.currentPill}>
              <View style={styles.currentDot} />
              <Text style={styles.currentText}>CURRENT</Text>
            </View>

            {day == null ? (
              <View style={styles.recoveryNumberRow}>
                <View style={styles.recoveryOfWrap}>
                  <Text style={styles.recoveryOf}>SET YOUR SURGERY DATE</Text>
                  <Text style={styles.recoveryOfSub}>in Profile to track your recovery day-by-day</Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.recoveryNumberRow}>
                  <Text style={styles.recoveryNumber}>{safeDay}</Text>
                  <View style={styles.recoveryOfWrap}>
                    <Text style={styles.recoveryOf}>OF {RECOVERY_TOTAL_DAYS}</Text>
                    <Text style={styles.recoveryOfSub}>days recovered</Text>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, (safeDay / RECOVERY_TOTAL_DAYS) * 100)}%` }]} />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabelText}>PROCEDURE</Text>
                  <Text style={styles.progressLabelText}>FINAL · M12</Text>
                </View>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={() => nav.navigate('MainTabs', { screen: 'Scan' } as any)}
            style={({ pressed }) => [styles.recoveryCard, pressed && { opacity: 0.95 }]}
          >
            <View style={styles.recoveryHead} pointerEvents="none">
              <WireframeHead size={140} scanLine={false} animated={false} />
            </View>

            <Text style={styles.recoveryLabel}>HAIR ASSESSMENT</Text>

            {latest ? (
              <>
                <Text style={styles.recoveryPhase}>
                  {latestSeverity ?? 'Analyzed'}
                  {latestNorwood ? ` · Norwood ${latestNorwood}` : ''}
                </Text>
                <View style={styles.recoveryNumberRow}>
                  <Text style={styles.recoveryNumber}>{Math.round(latestBaldness ?? 0)}</Text>
                  <View style={styles.recoveryOfWrap}>
                    <Text style={styles.recoveryOf}>% BALDNESS</Text>
                    <Text style={styles.recoveryOfSub}>tap to view your Scalp Report</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.recoveryPhase}>Track and understand your hair loss</Text>
                <View style={styles.recoveryNumberRow}>
                  <View style={styles.recoveryOfWrap}>
                    <Text style={styles.recoveryOf}>NO SCAN YET</Text>
                    <Text style={styles.recoveryOfSub}>tap to take your first scalp scan</Text>
                  </View>
                </View>
              </>
            )}
          </Pressable>
        )}

        {/* ─── Two stat cards ─── */}
        <View style={styles.statRow}>
          {/* Density */}
          <Pressable
            onPress={() => nav.navigate('NorwoodAnalysis')}
            style={({ pressed }) => [styles.statCard, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.statHead}>
              <Text style={styles.statLabel}>DENSITY</Text>
              {densityDelta !== null && (
                <Text style={[styles.statDelta, { color: densityDelta >= 0 ? colors.success : colors.danger }]}>
                  {densityDelta >= 0 ? '↑' : '↓'}{Math.abs(densityDelta).toFixed(0)}%
                </Text>
              )}
            </View>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{densityValue != null ? Math.round(densityValue) : '—'}</Text>
              {densityValue != null && <Text style={styles.statUnit}>% cover</Text>}
            </View>
            <View style={styles.statChart}>
              <MiniSparkLine
                data={history.length >= 2
                  ? history.slice(0, 6).reverse().map(h => h.data.measurements.percentage.hair_coverage)
                  : [40, 45, 50, 55, 70, 84]}
                color={colors.primary}
              />
            </View>
          </Pressable>

          {/* Adherence */}
          <Pressable
            onPress={() => nav.navigate('MainTabs', { screen: 'Track' } as any)}
            style={({ pressed }) => [styles.statCard, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.statHead}>
              <Text style={styles.statLabel}>ADHERENCE</Text>
              <Text style={styles.statRange}>7D</Text>
            </View>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{adherencePct}</Text>
              <Text style={styles.statUnit}>%</Text>
            </View>
            <View style={styles.dayBlocks}>
              {last7.map((d, i) => (
                <View
                  key={i}
                  style={[
                    styles.dayBlock,
                    { backgroundColor: d.pct >= 100 ? colors.primary : d.pct >= 50 ? colors.primaryDim : colors.cardElev },
                  ]}
                />
              ))}
            </View>
          </Pressable>
        </View>

        {/* ─── Ask Scalpify (AI assistant) ─── */}
        <Pressable
          onPress={() => nav.navigate('Chat')}
          style={({ pressed }) => [styles.askCard, pressed && { opacity: 0.92 }]}
        >
          <View style={styles.askIcon}>
            <Ionicons name="sparkles" size={20} color={colors.primary} />
          </View>
          <View style={styles.askTextWrap}>
            <Text style={styles.askTitle}>Ask Scalpify</Text>
            <Text style={styles.askSub}>Questions about your scan, meds or recovery?</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {/* ─── Today's protocol ─── */}
        <View style={styles.protocolWrap}>
          <View style={styles.protocolHead}>
            <Text style={styles.protocolTitle}>Today's protocol</Text>
            <Text style={styles.protocolCount}>
              <Text style={{ color: colors.success }}>{doneToday}</Text>
              <Text> / {Math.max(meds.length, 1)} DONE</Text>
            </Text>
          </View>

          {meds.length === 0 ? (
            <Pressable
              onPress={() => nav.navigate('MainTabs', { screen: 'Track' } as any)}
              style={styles.protocolEmpty}
            >
              <Ionicons name="add-circle-outline" size={22} color={colors.textMuted} />
              <Text style={styles.protocolEmptyText}>Add your first medication</Text>
            </Pressable>
          ) : (
            <View style={styles.protocolList}>
              {todayMeds.map((m, i) => {
                const done = m.status === 'done';
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => markDone(m.id, !done)}
                    style={[styles.protocolItem, i === todayMeds.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={[styles.checkCircle, done ? styles.checkCircleOn : styles.checkCircleOff]}>
                      {done && <Ionicons name="checkmark" size={16} color="#0B0F14" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.protocolName, done && styles.protocolNameDone]}>{m.name}</Text>
                      <Text style={styles.protocolSub}>{m.type}</Text>
                    </View>
                    <Text style={styles.protocolTime}>{formatTime(m.time)}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* ─── Daily reflection ─── */}
        <View style={styles.quoteWrap}>
          <View style={styles.quoteAccent} />
          <Text style={styles.quoteLabel}>REFLECTION · TODAY</Text>
          <Text style={styles.quoteText}>"{quoteOfTheDay(now).text}"</Text>
          <Text style={styles.quoteAuthor}>— {quoteOfTheDay(now).author}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ────────────────────────────────────────────────────────────────
   Mini sparkline (no axis, no labels)
   ──────────────────────────────────────────────────────────────── */

function MiniSparkLine({ data, color }: { data: number[]; color: string }) {
  const w = 140;
  const h = 40;
  if (!data.length) return <View style={{ height: h }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data.map((v, i) => ({ x: i * step, y: h - ((v - min) / range) * (h - 6) - 3 }));
  const poly = points.map(p => `${p.x},${p.y}`).join(' ');
  const fill = `M${points[0].x},${points[0].y} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`;

  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id="msl" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.35" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={fill} fill="url(#msl)" />
      <Polyline points={poly} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ────────────────────────────────────────────────────────────────
   Styles
   ──────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoTile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTileText: { color: '#fff', fontSize: 18, fontWeight: '800', fontFamily: SERIF_FONT, fontStyle: 'italic' },
  brandText: { color: colors.textStrong, fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.cardElev,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.cardElev,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  avatarText: { color: colors.textStrong, fontSize: 13, fontWeight: '700' },

  /* Greeting */
  greetWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  dateLabel: { color: colors.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  greeting: { color: colors.textStrong, fontSize: 28, fontWeight: '700', marginTop: 8 },
  greetingName: { color: colors.primary, fontStyle: 'italic', fontFamily: SERIF_FONT, fontWeight: '400' },

  /* Recovery card */
  recoveryCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.cardSolid,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  recoveryHead: {
    position: 'absolute',
    top: 18,
    right: -10,
    opacity: 0.55,
  },
  recoveryLabel: { color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  recoveryPhase: { color: colors.textMuted, fontSize: 15, fontWeight: '500', marginTop: 4 },
  currentPill: {
    position: 'absolute',
    top: 22,
    right: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,159,10,0.15)',
    borderColor: 'rgba(255,159,10,0.4)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  currentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning },
  currentText: { color: colors.warning, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  recoveryNumberRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 24, marginBottom: 24, gap: 14 },
  recoveryNumber: {
    color: colors.textStrong,
    fontSize: 88,
    fontFamily: SERIF_FONT,
    fontWeight: '400',
    lineHeight: 88,
  },
  recoveryOfWrap: { paddingBottom: 8 },
  recoveryOf: { color: colors.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  recoveryOfSub: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressLabelText: { color: colors.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  /* Stat cards */
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingHorizontal: spacing.xl,
  },
  askCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.cardSolid,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  askIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askTextWrap: { flex: 1 },
  askTitle: { color: colors.textStrong, fontSize: 16, fontWeight: '700' },
  askSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardSolid,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  statHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: colors.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  statDelta: { fontSize: 12, fontWeight: '700' },
  statRange: { color: colors.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  statValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 8 },
  statValue: {
    color: colors.textStrong,
    fontSize: 44,
    fontFamily: SERIF_FONT,
    fontWeight: '400',
    lineHeight: 46,
  },
  statUnit: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  statChart: { height: 40, marginTop: 8 },
  dayBlocks: { flexDirection: 'row', gap: 4, marginTop: 8 },
  dayBlock: { flex: 1, height: 22, borderRadius: 4 },

  /* Protocol */
  protocolWrap: {
    marginTop: 24,
    paddingHorizontal: spacing.xl,
  },
  protocolHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  protocolTitle: { color: colors.textStrong, fontSize: 19, fontWeight: '700' },
  protocolCount: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  protocolEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cardSolid,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 18,
    justifyContent: 'center',
  },
  protocolEmptyText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  protocolList: {
    backgroundColor: colors.cardSolid,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  protocolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  checkCircle: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleOn: { backgroundColor: colors.success },
  checkCircleOff: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: 'transparent' },
  protocolName: { color: colors.textStrong, fontSize: 16, fontWeight: '600' },
  protocolNameDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  protocolSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  protocolTime: { color: colors.textMuted, fontSize: 13, fontWeight: '600', fontFamily: SERIF_FONT },

  /* Daily reflection */
  quoteWrap: {
    marginTop: 28,
    marginHorizontal: spacing.xl,
    paddingVertical: 22,
    paddingHorizontal: 22,
    paddingLeft: 26,
  },
  quoteAccent: {
    position: 'absolute',
    left: 0,
    top: 22,
    bottom: 22,
    width: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
    opacity: 0.6,
  },
  quoteLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  quoteText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    lineHeight: 24,
    marginTop: 10,
  },
  quoteAuthor: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 10,
  },
});
