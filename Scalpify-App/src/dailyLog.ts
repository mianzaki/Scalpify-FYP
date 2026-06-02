import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'scalpify.dailyLog.v1';

export type Sensation = 'normal' | 'itchy' | 'tender';

export type DailyEntry = {
  date: string; // YYYY-MM-DD
  sensation: Sensation;
  notes: string;
  savedAt: number;
};

let entries: Record<string, DailyEntry> = {};
let hydrated = false;
const listeners = new Set<() => void>();

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
  await AsyncStorage.setItem(KEY, JSON.stringify(entries));
}

export async function hydrateDailyLog(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    entries = raw ? (JSON.parse(raw) as Record<string, DailyEntry>) : {};
  } catch {
    entries = {};
  }
  hydrated = true;
  emit();
}

/** Wipe all daily-log entries (used when switching/clearing accounts). */
export async function clearDailyLog(): Promise<void> {
  entries = {};
  emit();
  await AsyncStorage.removeItem(KEY);
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function saveEntry(date: Date, sensation: Sensation, notes: string): Promise<void> {
  const k = dateKey(date);
  entries = { ...entries, [k]: { date: k, sensation, notes, savedAt: Date.now() } };
  emit();
  await persist();
}

export function getEntry(date: Date): DailyEntry | null {
  return entries[dateKey(date)] ?? null;
}

export function useDailyEntries(): Record<string, DailyEntry> {
  return useSyncExternalStore(subscribe, () => entries, () => entries);
}

export function useDailyLogHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => hydrated);
}
