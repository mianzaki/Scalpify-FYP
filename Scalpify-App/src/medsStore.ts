import React, { useSyncExternalStore } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { scheduleDailyMedReminder, cancelMedReminder } from './notifications';
import { supabase, onAuthUser } from './supabase';

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
  reminderEnabled?: boolean;
  notificationId?: string | null;
};

let meds: Med[] = [];
let hydrated = false;
let revision = 0;
let uid: string | null = null;
// Set of "${medId}|${YYYY-MM-DD}" entries marking a dose as completed.
let doneSet: Set<string> = new Set();
// "${medId}|${YYYY-MM-DD}" → exact timestamp the dose was marked taken (for the log).
let doneTimes: Record<string, number> = {};
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

function rowToMed(r: any): Med {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    time: r.time,
    weeklyPct: r.weekly_pct ?? 0,
    icon: r.icon,
    iconColor: r.icon_color,
    iconBg: r.icon_bg,
    reminderEnabled: r.reminder_enabled ?? false,
    notificationId: r.notification_id ?? null,
  };
}

function medToRow(m: Med) {
  return {
    id: m.id,
    user_id: uid,
    name: m.name,
    type: m.type,
    time: m.time,
    weekly_pct: m.weeklyPct,
    icon: m.icon,
    icon_color: m.iconColor,
    icon_bg: m.iconBg,
    reminder_enabled: m.reminderEnabled ?? false,
    notification_id: m.notificationId ?? null,
  };
}

async function loadAll(): Promise<void> {
  if (!uid) {
    meds = [];
    doneSet = new Set();
    doneTimes = {};
    lastMarkedAt = null;
    hydrated = true;
    emit();
    return;
  }
  const [{ data: medRows }, { data: doseRows }] = await Promise.all([
    supabase.from('medications').select('*').order('created_at', { ascending: true }),
    supabase.from('dose_logs').select('*'),
  ]);
  meds = (medRows ?? []).map(rowToMed);
  doneSet = new Set();
  doneTimes = {};
  let maxTaken = 0;
  for (const r of doseRows ?? []) {
    doneSet.add(r.id);
    if (r.taken_at != null) {
      doneTimes[r.id] = Number(r.taken_at);
      if (Number(r.taken_at) > maxTaken) maxTaken = Number(r.taken_at);
    }
  }
  lastMarkedAt = maxTaken || null;
  hydrated = true;
  emit();
}

onAuthUser(u => {
  uid = u;
  void loadAll();
});

export function getLastMarkedAt(): number | null {
  return lastMarkedAt;
}

export async function markDone(medId: string, done: boolean = true): Promise<void> {
  const key = doneKey(medId);
  const prevSize = doneSet.size;
  if (done) doneSet.add(key);
  else doneSet.delete(key);
  if (doneSet.size === prevSize) return;
  doneSet = new Set(doneSet);
  if (done) doneTimes[key] = Date.now();
  else delete doneTimes[key];
  lastMarkedAt = Date.now();
  emit();

  if (!uid) return;
  if (done) {
    await supabase.from('dose_logs').upsert({
      id: key,
      user_id: uid,
      medication_id: medId,
      date_key: dateKey(),
      taken_at: doneTimes[key],
    });
  } else {
    await supabase.from('dose_logs').delete().eq('id', key);
  }
}

export async function editDoseTime(
  medId: string,
  currentDateKey: string,
  newTakenAt: number,
): Promise<void> {
  const oldKey = `${medId}|${currentDateKey}`;
  if (!doneSet.has(oldKey)) return;
  const newDk = dateKey(new Date(newTakenAt));
  const newKey = `${medId}|${newDk}`;

  doneSet = new Set(doneSet);
  doneSet.delete(oldKey);
  doneSet.add(newKey);
  delete doneTimes[oldKey];
  doneTimes[newKey] = newTakenAt;
  lastMarkedAt = Date.now();
  emit();

  if (!uid) return;
  await supabase.from('dose_logs').delete().eq('id', oldKey);
  await supabase.from('dose_logs').upsert({
    id: newKey,
    user_id: uid,
    medication_id: medId,
    date_key: newDk,
    taken_at: newTakenAt,
  });
}

export type MedLogEntry = {
  key: string;
  medId: string;
  medName: string;
  medType: string;
  dateKey: string;
  takenAt: number;
};

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

export function adherencePctForDate(d: Date): number {
  if (meds.length === 0) return 0;
  const k = dateKey(d);
  const done = meds.filter(m => doneSet.has(`${m.id}|${k}`)).length;
  return Math.round((done / meds.length) * 100);
}

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
  if (item.reminderEnabled) {
    const notificationId = await scheduleDailyMedReminder(item);
    item = { ...item, notificationId };
  }
  meds = [...meds, item];
  emit();
  if (uid) await supabase.from('medications').insert(medToRow(item));
  return item;
}

export function getMedById(id: string): Med | undefined {
  return meds.find(m => m.id === id);
}

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
  if (uid) await supabase.from('medications').update(medToRow(next)).eq('id', id);
}

export async function removeMed(id: string): Promise<void> {
  const target = meds.find(m => m.id === id);
  await cancelMedReminder(target?.notificationId);
  meds = meds.filter(m => m.id !== id);
  emit();
  if (uid) {
    await supabase.from('dose_logs').delete().eq('medication_id', id);
    await supabase.from('medications').delete().eq('id', id);
  }
}

export async function clearMeds(): Promise<void> {
  await Promise.all(meds.map(m => cancelMedReminder(m.notificationId)));
  meds = [];
  emit();
  if (uid) await supabase.from('medications').delete().eq('user_id', uid);
}

/** Full reset: meds + completion history (kept for API compatibility). */
export async function clearAllMeds(): Promise<void> {
  await Promise.all(meds.map(m => cancelMedReminder(m.notificationId)));
  meds = [];
  doneSet = new Set();
  doneTimes = {};
  lastMarkedAt = null;
  emit();
  if (uid) {
    await supabase.from('dose_logs').delete().eq('user_id', uid);
    await supabase.from('medications').delete().eq('user_id', uid);
  }
}

export function useMeds(): Med[] {
  return useSyncExternalStore(subscribe, () => meds, () => meds);
}

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
  if (isDoneToday(med.id)) return 'done';
  const [hh, mm] = med.time.split(':').map(n => parseInt(n, 10));
  const dose = new Date(now);
  dose.setHours(hh || 0, mm || 0, 0, 0);
  const diffMin = (now.getTime() - dose.getTime()) / 60_000;
  if (diffMin < -15) return 'upcoming';
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
