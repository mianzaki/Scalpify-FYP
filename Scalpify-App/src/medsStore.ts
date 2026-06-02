import React, { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ionicons } from '@expo/vector-icons';
import { scheduleDailyMedReminder, cancelMedReminder } from './notifications';

const STORAGE_KEY = 'scalpify.meds.v1';
const DONE_KEY = 'scalpify.meds.done.v1';
const LAST_MARKED_KEY = 'scalpify.meds.lastMarked.v1';
const DONE_TIMES_KEY = 'scalpify.meds.doneTimes.v1';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export type Med = {
  id: string;
  name: string;
  type: string;
  time: string;
  weeklyPct: number;
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
  reminderEnabled?: boolean;       // schedule a daily local notification at `time`
  notificationId?: string | null;  // the scheduled notification's id (to cancel/reschedule)
};

let meds: Med[] = [];
let hydrated = false;
// Bumped on EVERY change (add/remove/mark-done) so components can subscribe to
// completion-state changes too — useMeds() alone only reacts to the list changing.
let revision = 0;
// Set of "${medId}|${YYYY-MM-DD}" entries marking a dose as completed.
let doneSet: Set<string> = new Set();
// "${medId}|${YYYY-MM-DD}" → exact timestamp the dose was marked taken (for the log).
let doneTimes: Record<string, number> = {};
// Timestamp of the most recent markDone toggle (for "Last logged: …" UI).
let lastMarkedAt: number | null = null;
const listeners = new Set<() => void>();

function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function doneKey(medId: string, date: Date = new Date()): string {
  return `${medId}|${dateKey(date)}`;
}

async function persistDone() {
  await AsyncStorage.setItem(DONE_KEY, JSON.stringify(Array.from(doneSet)));
  await AsyncStorage.setItem(DONE_TIMES_KEY, JSON.stringify(doneTimes));
  if (lastMarkedAt !== null) {
    await AsyncStorage.setItem(LAST_MARKED_KEY, String(lastMarkedAt));
  }
}

function emit() {
  revision += 1;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

async function persist() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(meds));
}

export async function hydrateMeds(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    meds = raw ? (JSON.parse(raw) as Med[]) : [];
  } catch {
    meds = [];
  }
  try {
    const rawDone = await AsyncStorage.getItem(DONE_KEY);
    doneSet = new Set(rawDone ? (JSON.parse(rawDone) as string[]) : []);
  } catch {
    doneSet = new Set();
  }
  try {
    const rawTimes = await AsyncStorage.getItem(DONE_TIMES_KEY);
    doneTimes = rawTimes ? (JSON.parse(rawTimes) as Record<string, number>) : {};
  } catch {
    doneTimes = {};
  }
  try {
    const raw = await AsyncStorage.getItem(LAST_MARKED_KEY);
    lastMarkedAt = raw ? Number(raw) : null;
    if (!Number.isFinite(lastMarkedAt as number)) lastMarkedAt = null;
  } catch {
    lastMarkedAt = null;
  }
  hydrated = true;
  emit();
}

export function getLastMarkedAt(): number | null {
  return lastMarkedAt;
}

export async function markDone(medId: string, done: boolean = true): Promise<void> {
  const key = doneKey(medId);
  const prevSize = doneSet.size;
  if (done) doneSet.add(key);
  else doneSet.delete(key);
  if (doneSet.size === prevSize) return;
  doneSet = new Set(doneSet); // new ref so external store callers re-render
  // Record/clear the exact time the dose was taken (for the dose log).
  if (done) doneTimes[key] = Date.now();
  else delete doneTimes[key];
  lastMarkedAt = Date.now();
  emit();
  await persistDone();
}

/**
 * Adjust the actual date/time a logged dose was taken. If the new time falls on a
 * different calendar day, the dose record moves to that day (so adherence for the
 * right day stays correct). No-op if the dose isn't logged.
 */
export async function editDoseTime(
  medId: string,
  currentDateKey: string,
  newTakenAt: number,
): Promise<void> {
  const oldKey = `${medId}|${currentDateKey}`;
  if (!doneSet.has(oldKey)) return;
  const newKey = `${medId}|${dateKey(new Date(newTakenAt))}`;

  doneSet = new Set(doneSet);
  doneSet.delete(oldKey);
  doneSet.add(newKey);
  delete doneTimes[oldKey];
  doneTimes[newKey] = newTakenAt;
  lastMarkedAt = Date.now();
  emit();
  await persistDone();
}

export type MedLogEntry = {
  key: string;
  medId: string;
  medName: string;
  medType: string;
  dateKey: string;   // YYYY-MM-DD the dose was for
  takenAt: number;   // exact timestamp it was marked taken
};

/** Timestamped log of taken doses, newest first. Joins med name from the current list. */
export function getMedLog(limit = 60): MedLogEntry[] {
  const entries: MedLogEntry[] = Object.entries(doneTimes).map(([key, takenAt]) => {
    const [medId, dk] = key.split('|');
    const med = meds.find(m => m.id === medId);
    return {
      key,
      medId,
      medName: med?.name ?? 'Medication',
      medType: med?.type ?? '',
      dateKey: dk ?? '',
      takenAt,
    };
  });
  entries.sort((a, b) => b.takenAt - a.takenAt);
  return entries.slice(0, limit);
}

export function isDoneToday(medId: string): boolean {
  return doneSet.has(doneKey(medId));
}

// Real adherence (% of current meds marked done) for a given calendar day.
// Uses the current med list as the denominator for past days.
export function adherencePctForDate(d: Date): number {
  if (meds.length === 0) return 0;
  const k = dateKey(d);
  const done = meds.filter(m => doneSet.has(`${m.id}|${k}`)).length;
  return Math.round((done / meds.length) * 100);
}

// Streak: number of consecutive past days (ending today) where AT LEAST ONE
// med dose was marked done. Caps at 60.
export function adherenceStreak(): number {
  if (meds.length === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 60; i++) {
    const k = dateKey(cursor);
    const hit = meds.some(m => doneSet.has(`${m.id}|${k}`));
    if (!hit) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function addMed(med: Omit<Med, 'id'>): Promise<Med> {
  let item: Med = { ...med, id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}` };
  // Schedule the daily reminder if requested (permission is asked by the UI first).
  if (item.reminderEnabled) {
    const notificationId = await scheduleDailyMedReminder(item);
    item = { ...item, notificationId };
  }
  meds = [...meds, item];
  emit();
  await persist();
  return item;
}

export function getMedById(id: string): Med | undefined {
  return meds.find(m => m.id === id);
}

/**
 * Edit an existing med IN PLACE (keeps the same id, so its adherence history and dose
 * log are preserved). If the time or reminder toggle changed, the daily reminder is
 * cancelled and re-scheduled to match.
 */
export async function updateMed(id: string, patch: Partial<Omit<Med, 'id'>>): Promise<void> {
  const prev = meds.find(m => m.id === id);
  if (!prev) return;
  let next: Med = { ...prev, ...patch };

  const timeChanged = patch.time !== undefined && patch.time !== prev.time;
  const reminderChanged =
    patch.reminderEnabled !== undefined && patch.reminderEnabled !== prev.reminderEnabled;

  if (timeChanged || reminderChanged) {
    await cancelMedReminder(prev.notificationId);
    const notificationId = next.reminderEnabled ? await scheduleDailyMedReminder(next) : null;
    next = { ...next, notificationId };
  }

  meds = meds.map(m => (m.id === id ? next : m));
  emit();
  await persist();
}

export async function removeMed(id: string): Promise<void> {
  const target = meds.find(m => m.id === id);
  await cancelMedReminder(target?.notificationId);
  meds = meds.filter(m => m.id !== id);
  emit();
  await persist();
}

export async function clearMeds(): Promise<void> {
  meds = [];
  emit();
  await persist();
}

/** Full reset: meds list + completion history + last-marked (used on account change). */
export async function clearAllMeds(): Promise<void> {
  // Cancel any scheduled reminders so they don't fire for the next account.
  await Promise.all(meds.map(m => cancelMedReminder(m.notificationId)));
  meds = [];
  doneSet = new Set();
  doneTimes = {};
  lastMarkedAt = null;
  emit();
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY),
    AsyncStorage.removeItem(DONE_KEY),
    AsyncStorage.removeItem(DONE_TIMES_KEY),
    AsyncStorage.removeItem(LAST_MARKED_KEY),
  ]);
}

export function useMeds(): Med[] {
  return useSyncExternalStore(subscribe, () => meds, () => meds);
}

/** Subscribe to ANY meds change (list OR completion state). Returns a revision number;
 * call it in a component to re-render when meds are marked done/undone or added/removed. */
export function useMedsRevision(): number {
  return useSyncExternalStore(subscribe, () => revision, () => revision);
}

export function useMedsHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => hydrated);
}

export function nextDoseFor(med: Med, now: Date = new Date()): Date {
  const [hh, mm] = med.time.split(':').map(n => parseInt(n, 10));
  const d = new Date(now);
  d.setHours(hh || 0, mm || 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

export function statusForToday(med: Med, now: Date = new Date()): 'done' | 'now' | 'upcoming' {
  // Explicit mark always wins.
  if (isDoneToday(med.id)) return 'done';
  const [hh, mm] = med.time.split(':').map(n => parseInt(n, 10));
  const dose = new Date(now);
  dose.setHours(hh || 0, mm || 0, 0, 0);
  const diffMin = (now.getTime() - dose.getTime()) / 60_000;
  if (diffMin < -15) return 'upcoming';
  // Past its time and not marked → stays "due" (counts against adherence until taken).
  // No more auto-"done": a skipped dose is genuinely missed.
  return 'now';
}

export function formatTime(t: string): string {
  const [hhStr, mmStr] = t.split(':');
  const hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return t;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`;
}
