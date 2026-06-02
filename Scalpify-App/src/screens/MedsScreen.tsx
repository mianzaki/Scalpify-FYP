import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Pill, PrimaryButton } from '../components/ui';
import { AppHeader, PageTitle } from '../components/Header';
import { ProgressRing } from '../components/charts';
import { colors, shadow, spacing } from '../theme';
import { ensureNotificationPermission, sendTestReminder } from '../notifications';
import {
  addMed,
  adherenceStreak,
  editDoseTime,
  formatTime,
  getMedLog,
  isDoneToday,
  markDone,
  removeMed,
  statusForToday,
  updateMed,
  useMeds,
  useMedsRevision,
  type Med,
  type MedLogEntry,
} from '../medsStore';

const ICON_PALETTE: { icon: Med['icon']; color: string; bg: string }[] = [
  { icon: 'medical', color: colors.primary, bg: colors.primarySoft },
  { icon: 'flask', color: colors.successText, bg: colors.successSoft },
  { icon: 'water', color: colors.primary, bg: colors.primarySoft },
  { icon: 'leaf', color: colors.successText, bg: colors.successSoft },
];

function pickPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return ICON_PALETTE[hash % ICON_PALETTE.length];
}

export default function MedsScreen() {
  const meds = useMeds();
  useMedsRevision(); // re-render instantly when a med is marked done/undone or added
  const [adding, setAdding] = useState(false);
  const [editMed, setEditMed] = useState<Med | null>(null);
  const [editingDose, setEditingDose] = useState<MedLogEntry | null>(null);
  // Also refresh once a minute so time-based status (upcoming → due) updates on its own.
  const [, force] = useState(0);
  React.useEffect(() => {
    const id = setInterval(() => force(n => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const todayList = meds.map(m => ({ ...m, status: statusForToday(m) }));
  const dueToday = todayList.filter(m => m.status !== 'upcoming').length;
  const doneToday = todayList.filter(m => m.status === 'done').length;
  const adherencePct = dueToday === 0 ? 0 : Math.round((doneToday / dueToday) * 100);
  const streak = adherenceStreak();
  const log = getMedLog();

  async function handleTestReminder() {
    const ok = await sendTestReminder();
    Alert.alert(
      ok ? 'Test reminder scheduled' : 'Notifications are off',
      ok
        ? 'A test notification will appear in ~5 seconds. Lock your screen or background the app to see the banner.'
        : 'Enable notifications for Scalpify in your device Settings, then try again. (Reminders also require a dev build, not Expo Go.)',
    );
  }

  function openMedMenu(med: Med) {
    Alert.alert(med.name, 'Edit or remove this medication.', [
      { text: 'Edit', onPress: () => setEditMed(med) },
      { text: 'Remove', style: 'destructive', onPress: () => confirmRemove(med) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function confirmRemove(med: Med) {
    Alert.alert(
      'Remove medication?',
      `${med.name} and its reminder will be deleted. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMed(med.id) },
      ],
    );
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
              todayList.map(m => <MedCard key={m.id} med={m} onMenu={() => openMedMenu(m)} />)
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
                      <Text style={[styles.checkText, { flex: 1 }, done && { textDecorationLine: 'line-through', color: colors.textMuted }]}>
                        {m.type} {m.name} ({formatTime(m.time)})
                      </Text>
                      {m.reminderEnabled && (
                        <Ionicons name="notifications" size={14} color={colors.textDim} />
                      )}
                    </Pressable>
                  );
                })
              )}
            </View>
          </Card>

          <Pressable onPress={handleTestReminder} style={styles.testReminderBtn}>
            <Ionicons name="notifications-outline" size={16} color={colors.primary} />
            <Text style={styles.testReminderText}>Send a test reminder</Text>
          </Pressable>

          {/* Dose history — exact date & time each dose was logged */}
          {log.length > 0 && (
            <Card>
              <Text style={styles.cardTitle}>Dose History</Text>
              <Text style={styles.reminderSub}>Tap a dose to adjust when it was taken.</Text>
              <View style={{ marginTop: spacing.md }}>
                {log.map((e, i) => (
                  <Pressable
                    key={e.key}
                    onPress={() => setEditingDose(e)}
                    style={({ pressed }) => [
                      styles.logRow,
                      i === log.length - 1 && { borderBottomWidth: 0 },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <View style={styles.logDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logName}>{e.medName}</Text>
                      {e.medType ? <Text style={styles.logType}>{e.medType}</Text> : null}
                    </View>
                    <Text style={styles.logWhen}>{formatLogStamp(e.takenAt)}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textDim} style={{ marginLeft: 4 }} />
                  </Pressable>
                ))}
              </View>
            </Card>
          )}
        </View>
      </ScrollView>

      <Pressable onPress={() => setAdding(true)} style={styles.fabWrap}>
        <View style={styles.fab}>
          <Ionicons name="add" size={26} color="#fff" />
        </View>
      </Pressable>

      <MedModal
        visible={adding || !!editMed}
        editMed={editMed}
        onDismiss={() => {
          setAdding(false);
          setEditMed(null);
        }}
      />

      <DoseTimeModal entry={editingDose} onDismiss={() => setEditingDose(null)} />
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

function MedCard({ med, onMenu }: { med: Med & { status: 'done' | 'now' | 'upcoming' }; onMenu: () => void }) {
  const isDone = med.status === 'done';
  const isNow = med.status === 'now';
  const isUp = med.status === 'upcoming';

  return (
    <Pressable
      onLongPress={onMenu}
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
      {/* Always-visible menu (Edit / Remove) so deletion is discoverable. */}
      <Pressable onPress={onMenu} style={styles.menuBtn} hitSlop={10}>
        <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

function fromHHMM(s: string): Date {
  const [h, m] = (s || '').split(':').map(n => parseInt(n, 10));
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}
function toHHMM(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
function timeLabel(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function MedModal({
  visible,
  editMed,
  onDismiss,
}: {
  visible: boolean;
  editMed: Med | null;
  onDismiss: () => void;
}) {
  const isEdit = !!editMed;
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [timeDate, setTimeDate] = useState<Date>(() => fromHHMM('08:00'));
  const [showPicker, setShowPicker] = useState(false);
  const [reminder, setReminder] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from the med when opening for edit, or blank for a new med.
  useEffect(() => {
    if (!visible) return;
    setName(editMed?.name ?? '');
    setType(editMed?.type ?? '');
    setTimeDate(fromHHMM(editMed?.time ?? '08:00'));
    setReminder(editMed?.reminderEnabled ?? true);
    setShowPicker(false);
  }, [visible, editMed]);

  function onTimeChange(_e: unknown, selected?: Date) {
    if (Platform.OS !== 'ios') setShowPicker(false);
    if (selected) setTimeDate(selected);
  }

  async function handleSave() {
    if (!name.trim()) return Alert.alert('Missing name', 'Enter the medication name.');
    setSubmitting(true);
    try {
      // If a reminder is wanted, get notification permission first.
      let reminderEnabled = reminder;
      if (reminderEnabled) {
        const granted = await ensureNotificationPermission();
        if (!granted) {
          reminderEnabled = false;
          Alert.alert(
            'Reminders off',
            'Notifications are disabled, so this medication was saved without a reminder. You can enable notifications in Settings.',
          );
        }
      }
      const fields = {
        name: name.trim(),
        type: type.trim() || 'Daily',
        time: toHHMM(timeDate),
        reminderEnabled,
      };
      if (editMed) {
        await updateMed(editMed.id, fields); // keeps id → adherence + dose log preserved
      } else {
        const palette = pickPalette(name);
        await addMed({
          ...fields,
          weeklyPct: 0,
          icon: palette.icon,
          iconColor: palette.color,
          iconBg: palette.bg,
        });
      }
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
            <Text style={styles.modalTitle}>{isEdit ? 'Edit Medication' : 'Add Medication'}</Text>
            <Pressable onPress={onDismiss} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ModalField label="Name" placeholder="e.g. Minoxidil 5%" value={name} onChangeText={setName} />
          <ModalField label="Type" placeholder="e.g. Topical solution" value={type} onChangeText={setType} />

          <View style={{ gap: 6 }}>
            <Text style={styles.modalLabel}>Reminder time</Text>
            <Pressable onPress={() => setShowPicker(s => !s)} style={styles.timeSelect}>
              <Ionicons name="time-outline" size={18} color={colors.textDim} />
              <Text style={styles.timeSelectText}>{timeLabel(timeDate)}</Text>
              <Ionicons name={showPicker ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textDim} />
            </Pressable>
            {showPicker && (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={timeDate}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                />
                {Platform.OS === 'ios' && (
                  <Pressable onPress={() => setShowPicker(false)} style={styles.pickerDone}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          <View style={styles.reminderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Ionicons name="notifications-outline" size={18} color={colors.primary} />
              <View>
                <Text style={styles.reminderLabel}>Daily reminder</Text>
                <Text style={styles.reminderSub}>Get a notification at this time</Text>
              </View>
            </View>
            <Switch
              value={reminder}
              onValueChange={setReminder}
              thumbColor="#fff"
              trackColor={{ false: colors.cardElev, true: colors.primary }}
            />
          </View>

          <PrimaryButton
            label={isEdit ? 'Save changes' : 'Save'}
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

// "Jun 1 · 9:05 AM" (uses "Today"/"Yesterday" for recent dates)
function formatLogStamp(ts: number): string {
  const d = new Date(ts);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(d); that.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86_400_000);
  const day = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday'
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

function DoseTimeModal({ entry, onDismiss }: { entry: MedLogEntry | null; onDismiss: () => void }) {
  const [dt, setDt] = useState<Date>(() => new Date());
  const [picker, setPicker] = useState<'none' | 'date' | 'time'>('none');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setDt(new Date(entry.takenAt));
      setPicker('none');
    }
  }, [entry]);

  function onChange(_e: unknown, selected?: Date) {
    if (Platform.OS !== 'ios') setPicker('none');
    if (selected) setDt(selected);
  }

  async function save() {
    if (!entry) return;
    setSaving(true);
    try {
      await editDoseTime(entry.medId, entry.dateKey, dt.getTime());
      onDismiss();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={!!entry} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.modalBackdrop} onPress={onDismiss}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Edit dose time</Text>
            <Pressable onPress={onDismiss} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {entry ? <Text style={styles.doseMedName}>{entry.medName}</Text> : null}

          <View style={{ gap: 6 }}>
            <Text style={styles.modalLabel}>Date</Text>
            <Pressable onPress={() => setPicker(p => (p === 'date' ? 'none' : 'date'))} style={styles.timeSelect}>
              <Ionicons name="calendar-outline" size={18} color={colors.textDim} />
              <Text style={styles.timeSelectText}>
                {dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </Text>
              <Ionicons name={picker === 'date' ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textDim} />
            </Pressable>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.modalLabel}>Time</Text>
            <Pressable onPress={() => setPicker(p => (p === 'time' ? 'none' : 'time'))} style={styles.timeSelect}>
              <Ionicons name="time-outline" size={18} color={colors.textDim} />
              <Text style={styles.timeSelectText}>{timeLabel(dt)}</Text>
              <Ionicons name={picker === 'time' ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textDim} />
            </Pressable>
          </View>

          {picker !== 'none' && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={dt}
                mode={picker === 'date' ? 'date' : 'time'}
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChange}
              />
              {Platform.OS === 'ios' && (
                <Pressable onPress={() => setPicker('none')} style={styles.pickerDone}>
                  <Text style={styles.pickerDoneText}>Done</Text>
                </Pressable>
              )}
            </View>
          )}

          <PrimaryButton
            label="Save"
            loading={saving}
            disabled={saving}
            onPress={save}
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
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardElev,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: spacing.md,
  },
  reminderLabel: { color: colors.textStrong, fontSize: 14, fontWeight: '600' },
  reminderSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },

  timeSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  timeSelectText: { flex: 1, color: colors.textStrong, fontSize: 16, fontWeight: '600' },
  pickerWrap: { backgroundColor: colors.cardElev, borderRadius: 12, marginTop: 6, overflow: 'hidden' },
  pickerDone: { alignSelf: 'flex-end', paddingHorizontal: 18, paddingVertical: 10 },
  pickerDoneText: { color: colors.primary, fontSize: 15, fontWeight: '700' },

  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  logName: { color: colors.textStrong, fontSize: 15, fontWeight: '600' },
  logType: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  logWhen: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  doseMedName: { color: colors.primary, fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  testReminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  testReminderText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
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
    backgroundColor: colors.cardSolid,
    borderRadius: 18,
    padding: spacing.lg,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
  menuBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },

  empty: {
    backgroundColor: colors.cardSolid,
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
    backgroundColor: colors.cardSolid,
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
