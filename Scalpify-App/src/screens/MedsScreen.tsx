import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Pill, PrimaryButton } from '../components/ui';
import { AppHeader, PageTitle } from '../components/Header';
import { ProgressRing } from '../components/charts';
import { colors, shadow, spacing } from '../theme';
import {
  addMed,
  adherenceStreak,
  formatTime,
  isDoneToday,
  markDone,
  removeMed,
  statusForToday,
  useMeds,
  type Med,
} from '../medsStore';

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const ICON_PALETTE: { icon: Med['icon']; color: string; bg: string }[] = [
  { icon: 'medical', color: colors.primary, bg: colors.primarySoft },
  { icon: 'flask', color: colors.successText, bg: colors.successSoft },
  { icon: 'water', color: colors.primary, bg: '#DCE9F8' },
  { icon: 'leaf', color: colors.successText, bg: colors.successSoft },
];

function pickPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return ICON_PALETTE[hash % ICON_PALETTE.length];
}

export default function MedsScreen() {
  const meds = useMeds();
  const [adding, setAdding] = useState(false);
  // Trigger re-render whenever a med is marked done/undone (markDone emits).
  const [, force] = useState(0);
  React.useEffect(() => {
    const id = setInterval(() => force(n => n + 1), 60_000); // refresh status every minute
    return () => clearInterval(id);
  }, []);

  const todayList = meds.map(m => ({ ...m, status: statusForToday(m) }));
  const dueToday = todayList.filter(m => m.status !== 'upcoming').length;
  const doneToday = todayList.filter(m => m.status === 'done').length;
  const adherencePct = dueToday === 0 ? 0 : Math.round((doneToday / dueToday) * 100);
  const streak = adherenceStreak();

  function confirmRemove(med: Med) {
    Alert.alert('Remove medication', `Remove ${med.name} from your protocol?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMed(med.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <PageTitle title="My Medications" subtitle="Manage your daily hair restoration routine" />

        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg }}>
          <Card>
            <Text style={styles.cardTitle}>Daily Adherence</Text>
            <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
              <AdherenceRing pct={adherencePct} />
            </View>
            <View style={{ marginTop: spacing.xl }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.weeklyLabel}>Weekly Streak</Text>
                <Text style={styles.weeklyDays}>{streak} Days</Text>
              </View>
              <View style={styles.streakBar}>
                <View style={[styles.streakFill, { width: `${(streak / 7) * 100}%` }]} />
              </View>
            </View>
          </Card>

          <View style={styles.activeHead}>
            <Text style={styles.sectionLabel}>ACTIVE REGIMEN</Text>
            <Pressable onPress={() => setAdding(true)} style={styles.addBtn} hitSlop={8}>
              <Ionicons name="add" size={22} color={colors.primary} />
            </Pressable>
          </View>

          <View style={{ gap: 12 }}>
            {todayList.length === 0 ? (
              <Pressable onPress={() => setAdding(true)} style={styles.empty}>
                <Text style={styles.emptyTitle}>No medications yet</Text>
                <Text style={styles.emptySub}>Tap + to add your first medication.</Text>
              </Pressable>
            ) : (
              todayList.map(m => <MedCard key={m.id} med={m} onLongPress={() => confirmRemove(m)} />)
            )}
          </View>

          <Card>
            <Text style={styles.checklistHead}>DAILY CHECKLIST</Text>
            <View style={{ marginTop: spacing.md, gap: 12 }}>
              {todayList.length === 0 ? (
                <Text style={{ color: colors.textMuted }}>Add a medication to populate today's checklist.</Text>
              ) : (
                todayList.map(m => {
                  const done = isDoneToday(m.id);
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => markDone(m.id, !done)}
                      style={styles.checkRow}
                    >
                      <View style={[styles.checkbox, done && styles.checkboxOn]}>
                        {done && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text style={[styles.checkText, done && { textDecorationLine: 'line-through', color: colors.textMuted }]}>
                        {m.type} {m.name} ({formatTime(m.time)})
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </Card>
        </View>
      </ScrollView>

      <Pressable onPress={() => setAdding(true)} style={styles.fabWrap}>
        <View style={styles.fab}>
          <Ionicons name="add" size={26} color="#fff" />
        </View>
      </Pressable>

      <AddMedModal visible={adding} onDismiss={() => setAdding(false)} />
    </SafeAreaView>
  );
}

function AdherenceRing({ pct }: { pct: number }) {
  return (
    <ProgressRing pct={pct} size={190} stroke={14}>
      <Text style={styles.ringPct}>{pct}%</Text>
      <Text style={styles.ringSub}>Completed</Text>
    </ProgressRing>
  );
}

function MedCard({ med, onLongPress }: { med: Med & { status: 'done' | 'now' | 'upcoming' }; onLongPress: () => void }) {
  const isDone = med.status === 'done';
  const isNow = med.status === 'now';
  const isUp = med.status === 'upcoming';

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[
        styles.medCard,
        isNow && { borderColor: colors.primary, borderWidth: 2 },
        isUp && { backgroundColor: colors.cardElev },
      ]}
    >
      <View style={[styles.medIcon, { backgroundColor: med.iconBg }]}>
        <Ionicons name={med.icon} size={22} color={med.iconColor} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.medName, isUp && { color: colors.textMuted }]}>{med.name}</Text>
        <Text style={styles.medType}>{med.type} · {formatTime(med.time)}</Text>
        {isDone && <Pill label="✓ Done" variant="success" />}
        {isNow && <Pill label="⏱ Now" variant="primary" />}
        {isUp && <Pill label="Upcoming" variant="default" />}
      </View>
      {isNow && (
        <Pressable onPress={() => markDone(med.id, true)} style={styles.markBtn} hitSlop={6}>
          <Text style={styles.markBtnText}>Mark{'\n'}Done</Text>
        </Pressable>
      )}
      {isDone && (
        <Pressable onPress={() => markDone(med.id, false)} style={styles.undoBtn} hitSlop={6}>
          <Ionicons name="arrow-undo" size={16} color={colors.textMuted} />
        </Pressable>
      )}
      {isUp && (
        <View style={styles.lockBox}>
          <Ionicons name="lock-closed" size={14} color={colors.textDim} />
        </View>
      )}
    </Pressable>
  );
}

function AddMedModal({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName('');
    setType('');
    setTime('');
  }

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Missing name', 'Enter the medication name.');
    if (!TIME_RE.test(time.trim())) {
      return Alert.alert('Invalid time', 'Use 24-hour HH:MM format, e.g. 08:00.');
    }
    setSubmitting(true);
    try {
      const palette = pickPalette(name);
      await addMed({
        name: name.trim(),
        type: type.trim() || 'Daily',
        time: time.trim(),
        weeklyPct: 0,
        icon: palette.icon,
        iconColor: palette.color,
        iconBg: palette.bg,
      });
      reset();
      onDismiss();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Add Medication</Text>
            <Pressable onPress={onDismiss} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ModalField label="Name" placeholder="e.g. Minoxidil 5%" value={name} onChangeText={setName} />
          <ModalField label="Type" placeholder="e.g. Topical solution" value={type} onChangeText={setType} />
          <ModalField
            label="Time (HH:MM, 24h)"
            placeholder="08:00"
            keyboardType="numbers-and-punctuation"
            value={time}
            onChangeText={setTime}
          />

          <PrimaryButton
            label="Save"
            loading={submitting}
            disabled={submitting}
            onPress={handleSave}
            style={{ marginTop: spacing.sm }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ModalField({
  label,
  ...rest
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.modalLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={styles.modalInput}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  cardTitle: { color: colors.textStrong, fontSize: 22, fontWeight: '800' },
  ringPct: { color: colors.primary, fontSize: 42, fontWeight: '800' },
  ringSub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },

  weeklyLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  weeklyDays: { color: colors.successText, fontSize: 14, fontWeight: '700' },
  streakBar: { height: 6, backgroundColor: colors.cardElev, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  streakFill: { height: '100%', backgroundColor: colors.success },

  activeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  sectionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: spacing.lg,
    gap: 14,
    ...shadow.card,
  },
  medIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  medName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  medType: { color: colors.textMuted, fontSize: 13 },
  markBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  markBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  undoBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.cardElev,
    alignItems: 'center', justifyContent: 'center',
  },
  lockBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cardElev,
    alignItems: 'center',
    justifyContent: 'center',
  },

  empty: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },

  checklistHead: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { color: colors.text, fontSize: 14, flex: 1 },

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

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  modalTitle: { color: colors.textStrong, fontSize: 20, fontWeight: '800' },
  modalLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  modalInput: {
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
