import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, PrimaryButton, ScreenProgress } from '../components/ui';
import { AppHeader, PageTitle } from '../components/Header';
import { colors, spacing } from '../theme';
import { useUser, daysSinceSurgery } from '../userStore';
import { useScanHistory } from '../scanStore';
import { getEntry, saveEntry, useDailyEntries, type Sensation } from '../dailyLog';

// Rotated daily — index = day-of-year mod tips.length.
const CARE_TIPS = [
  'Gentle pat-drying with a microfiber towel is essential during Month 3 to avoid disturbing the dormant follicles.',
  'Sleep on a satin pillowcase to reduce friction on healing grafts.',
  'Avoid direct sun exposure on the scalp for the first 30 days post-op.',
  'A 10-minute scalp massage daily improves microcirculation and follicle nutrition.',
  'Hydrate consistently — dehydration impairs the anagen growth phase.',
  'Skip caffeine after 2pm during Month 1; quality sleep accelerates healing.',
  'Track shedding daily — sudden increases beyond Month 2 should be logged for clinician review.',
];

function tipForToday(d: Date): string {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return CARE_TIPS[dayOfYear % CARE_TIPS.length];
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TOTAL_RECOVERY_DAYS = 180;

const PHASES = [
  { name: 'Initial Healing', start: 1, end: 14, body: 'Grafts anchoring — avoid touching.' },
  { name: 'Shedding Normal', start: 15, end: 90, body: 'Don\'t worry! This is the "resting phase" where transplanted hair falls out to make room for new, permanent growth.' },
  { name: 'Growth Spurt', start: 91, end: 120, body: 'First signs of permanent follicular emergence.' },
  { name: 'Active Regrowth', start: 121, end: TOTAL_RECOVERY_DAYS, body: 'Visible density increases steadily.' },
];

const MILESTONE_DAYS = [7, 14, 28, 60, 90, 120, 180];

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

export default function RecoveryCalendarScreen() {
  const user = useUser();
  const history = useScanHistory();
  // Re-subscribe to dailyLog so saves re-render the calendar.
  useDailyEntries();
  const day = daysSinceSurgery(user);
  const [today] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<Date>(today);
  const [viewMonth, setViewMonth] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [sensation, setSensation] = useState<Sensation>('normal');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // When user picks a different day, hydrate the form from any saved entry.
  useEffect(() => {
    const existing = getEntry(selected);
    if (existing) {
      setSensation(existing.sensation);
      setNotes(existing.notes);
    } else {
      setSensation('normal');
      setNotes('');
    }
  }, [selected]);

  async function handleSaveEntry() {
    setSaving(true);
    try {
      await saveEntry(selected, sensation, notes);
      Alert.alert('Saved', 'Daily entry saved locally.');
    } finally {
      setSaving(false);
    }
  }

  const phase = useMemo(() => {
    if (day === null) return PHASES[1];
    return PHASES.find(p => day >= p.start && day <= p.end) ?? PHASES[PHASES.length - 1];
  }, [day]);

  const phaseProgress = day === null ? 0 : Math.min(1, (day - phase.start) / (phase.end - phase.start));
  const recoveryMonth = day === null ? null : Math.max(1, Math.ceil(day / 30));

  const cells: { day: number | null; isMilestone: boolean; isToday: boolean; isSel: boolean; hasScan: boolean }[] = useMemo(() => {
    const first = new Date(viewMonth.y, viewMonth.m, 1);
    const daysInMonth = new Date(viewMonth.y, viewMonth.m + 1, 0).getDate();
    const out: { day: number | null; isMilestone: boolean; isToday: boolean; isSel: boolean; hasScan: boolean }[] = [];
    for (let i = 0; i < first.getDay(); i++) out.push({ day: null, isMilestone: false, isToday: false, isSel: false, hasScan: false });
    const surgery = user?.surgeryDate ? startOfDay(new Date(user.surgeryDate)) : null;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewMonth.y, viewMonth.m, d);
      let isMilestone = false;
      if (surgery) {
        for (const md of MILESTONE_DAYS) {
          const m = new Date(surgery);
          m.setDate(m.getDate() + md - 1);
          if (sameDay(m, date)) { isMilestone = true; break; }
        }
      }
      const hasScan = history.some(s => sameDay(new Date(s.capturedAt), date));
      out.push({ day: d, isMilestone, isToday: sameDay(date, today), isSel: sameDay(date, selected), hasScan });
    }
    while (out.length % 7 !== 0) out.push({ day: null, isMilestone: false, isToday: false, isSel: false, hasScan: false });
    return out;
  }, [viewMonth, history, today, selected, user?.surgeryDate]);

  function shiftMonth(delta: number) {
    setViewMonth(p => {
      const d = new Date(p.y, p.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const nextMilestone = useMemo(() => {
    if (day === null) return null;
    const next = MILESTONE_DAYS.find(md => md > day);
    if (!next) return null;
    const mPhase = PHASES.find(p => next >= p.start && next <= p.end);
    return {
      day: next,
      in: next - day,
      name: `Day ${next} · ${mPhase?.name ?? 'Milestone'}`,
      body: mPhase?.body ?? '',
    };
  }, [day]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScreenProgress pct={day ? Math.min(95, Math.round((day / TOTAL_RECOVERY_DAYS) * 100)) : 10} />
      <AppHeader showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <PageTitle
          title="Post-Surgery Milestones"
          subtitle={user?.surgeryDate ? `Tracking your journey since ${new Date(user.surgeryDate).toDateString().slice(4)}` : 'Set your surgery date in Profile to start tracking'}
        />

        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <View style={styles.phaseCard}>
            <View style={styles.phaseIcon}>
              <Ionicons name="hourglass-outline" size={20} color="#fff" />
            </View>
            <Text style={styles.phaseLabel}>CURRENT PHASE</Text>
            {day === null ? (
              <>
                <Text style={styles.phaseName}>No surgery date set</Text>
                <Text style={styles.phaseBody}>
                  Add your surgery date in Profile to track your recovery phase day-by-day.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.phaseName}>
                  Month {recoveryMonth} - {phase.name}
                </Text>
                <Text style={styles.phaseBody}>{phase.body}</Text>
                <View style={styles.phaseBar}>
                  <View style={[styles.phaseFill, { width: `${phaseProgress * 100}%` }]} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={styles.phaseStartEnd}>Day {phase.start}</Text>
                  <Text style={styles.phaseStartEnd}>Day {phase.end}</Text>
                </View>
              </>
            )}
          </View>

          <Card>
            <View style={styles.calHead}>
              <Text style={styles.calTitle}>{MONTH_NAMES[viewMonth.m]} {viewMonth.y}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => shiftMonth(-1)} hitSlop={8}>
                  <Ionicons name="chevron-back" size={20} color={colors.textStrong} />
                </Pressable>
                <Pressable onPress={() => shiftMonth(1)} hitSlop={8}>
                  <Ionicons name="chevron-forward" size={20} color={colors.textStrong} />
                </Pressable>
              </View>
            </View>
            <View style={styles.weekHead}>
              {WEEKDAYS.map((w, i) => <Text key={`${w}-${i}`} style={styles.weekHeadText}>{w}</Text>)}
            </View>
            <View style={styles.grid}>
              {cells.map((c, i) => {
                if (c.day === null) return <View key={i} style={styles.cell} />;
                return (
                  <Pressable
                    key={i}
                    style={styles.cell}
                    onPress={() => setSelected(new Date(viewMonth.y, viewMonth.m, c.day!))}
                  >
                    <View style={[
                      styles.cellBubble,
                      c.isSel && { borderWidth: 1.5, borderColor: colors.primary },
                      c.isToday && { backgroundColor: colors.primary },
                    ]}>
                      <Text style={[styles.cellText, c.isToday && { color: '#fff', fontWeight: '700' }]}>
                        {c.day}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                      {c.isMilestone && <View style={[styles.dot, { backgroundColor: colors.danger }]} />}
                      {c.hasScan && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.legend}>
              <Legend dot={colors.danger} label="Milestone" />
              <Legend dot={colors.primary} label="Scan taken" />
            </View>
          </Card>

          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.smallTitle}>Daily Log</Text>
              <Text style={styles.dateLabel}>
                {MONTH_NAMES[selected.getMonth()].slice(0, 3)} {selected.getDate()}, {selected.getFullYear()}
                {getEntry(selected) ? ' · saved' : ''}
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Scalp Sensation</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              {(['normal', 'itchy', 'tender'] as const).map(s => {
                const on = sensation === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSensation(s)}
                    style={[styles.sensChip, on && styles.sensChipOn]}
                  >
                    <Text style={[styles.sensText, on && styles.sensTextOn]}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Daily Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="How does your scalp feel today?"
              placeholderTextColor={colors.textFaint}
              style={styles.notes}
            />

            <PrimaryButton label="Save Entry" loading={saving} onPress={handleSaveEntry} style={{ marginTop: spacing.md }} />
          </Card>

          {nextMilestone && (
            <View style={styles.nextMilestone}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="trophy-outline" size={16} color={colors.successText} />
                <Text style={styles.nextMilestoneLabel}>Next Big Milestone</Text>
              </View>
              <Text style={styles.nextMilestoneTitle}>{nextMilestone.name}</Text>
              <Text style={styles.nextMilestoneBody}>
                In {nextMilestone.in} day{nextMilestone.in === 1 ? '' : 's'}
                {nextMilestone.body ? ` — ${nextMilestone.body}` : '.'}
              </Text>
            </View>
          )}

          <View style={styles.tipCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="bulb-outline" size={18} color={colors.primary} />
              <Text style={styles.tipLabel}>Care Tip of the Day</Text>
            </View>
            <Text style={styles.tipBody}>"{tipForToday(today)}"</Text>
            <Pressable
              hitSlop={8}
              style={{ marginTop: 8 }}
              onPress={() =>
                Alert.alert(
                  'All care tips',
                  CARE_TIPS.map((t, i) => `${i + 1}. ${t}`).join('\n\n'),
                )
              }
            >
              <Text style={styles.tipLink}>See All Tips →</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  phaseCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: spacing.lg,
  },
  phaseIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  phaseLabel: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  phaseName: { color: colors.textStrong, fontSize: 22, fontWeight: '800', marginTop: 4 },
  phaseBody: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 8 },
  phaseBar: { height: 6, backgroundColor: colors.cardElev, borderRadius: 3, marginTop: spacing.md, overflow: 'hidden' },
  phaseFill: { height: '100%', backgroundColor: colors.primary },
  phaseStartEnd: { color: colors.textMuted, fontSize: 12 },

  calHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calTitle: { color: colors.textStrong, fontSize: 18, fontWeight: '700' },
  weekHead: { flexDirection: 'row', marginTop: spacing.md, paddingHorizontal: 4 },
  weekHeadText: { color: colors.textMuted, fontSize: 11, fontWeight: '600', width: `${100 / 7}%`, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  cellBubble: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cellText: { color: colors.text, fontSize: 13 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: { flexDirection: 'row', gap: 14, marginTop: spacing.md, paddingTop: 12, borderTopWidth: 1, borderColor: colors.borderSoft },

  smallTitle: { color: colors.textStrong, fontSize: 20, fontWeight: '700' },
  dateLabel: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  fieldLabel: { color: colors.text, fontSize: 13 },
  sensChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.cardElev },
  sensChipOn: { backgroundColor: colors.primary },
  sensText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  sensTextOn: { color: '#fff' },
  notes: {
    backgroundColor: colors.bgElev,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    minHeight: 70,
    marginTop: 6,
  },

  nextMilestone: {
    backgroundColor: colors.successSoft,
    borderRadius: 18,
    padding: spacing.lg,
  },
  nextMilestoneLabel: { color: colors.successText, fontSize: 12, fontWeight: '700' },
  nextMilestoneTitle: { color: colors.successText, fontSize: 20, fontWeight: '800', marginTop: 6 },
  nextMilestoneBody: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 6 },

  tipCard: { backgroundColor: colors.cardSolid, borderRadius: 18, padding: spacing.lg, gap: 4 },
  tipLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
  tipBody: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', lineHeight: 19, marginTop: 6 },
  tipLink: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
