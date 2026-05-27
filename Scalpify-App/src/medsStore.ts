import React, { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = 'scalpify.meds.v1';
const DONE_KEY = 'scalpify.meds.done.v1';
const LAST_MARKED_KEY = 'scalpify.meds.lastMarked.v1';

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
};

let meds: Med[] = [];
let hydrated = false;
// Set of "${medId}|${YYYY-MM-DD}" entries marking a dose as completed.
let doneSet: Set<string> = new Set();
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
  if (lastMarkedAt !== null) {
    await AsyncStorage.setItem(LAST_MARKED_KEY, String(lastMarkedAt));
  }
}

function emit() {
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
  lastMarkedAt = Date.now();
  emit();
  await persistDone();
}

export function isDoneToday(medId: string): boolean {
  return doneSet.has(doneKey(medId));
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
  const item: Med = { ...med, id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}` };
  meds = [...meds, item];
  emit();
  await persist();
  return item;
}

export async function removeMed(id: string): Promise<void> {
  meds = meds.filter(m => m.id !== id);
  emit();
  await persist();
}

export async function clearMeds(): Promise<void> {
  meds = [];
  emit();
  await persist();
}

export function useMeds(): Med[] {
  return useSyncExternalStore(subscribe, () => meds, () => meds);
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
  if (diffMin > 60) return 'done';
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
