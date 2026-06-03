import { useSyncExternalStore } from 'react';
import { supabase, onAuthUser } from './supabase';

export type Sensation = 'normal' | 'itchy' | 'tender';

export type DailyEntry = {
  date: string; // YYYY-MM-DD
  sensation: Sensation;
  notes: string;
  savedAt: number;
};

let entries: Record<string, DailyEntry> = {};
let hydrated = false;
let uid: string | null = null;
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

async function loadEntries(): Promise<void> {
  if (!uid) {
    entries = {};
    hydrated = true;
    emit();
    return;
  }
  const { data } = await supabase.from('daily_logs').select('*');
  const next: Record<string, DailyEntry> = {};
  for (const r of data ?? []) {
    next[r.date_key] = {
      date: r.date_key,
      sensation: r.sensation,
      notes: r.notes ?? '',
      savedAt: Number(r.saved_at) || 0,
    };
  }
  entries = next;
  hydrated = true;
  emit();
}

onAuthUser(u => {
  uid = u;
  void loadEntries();
});

/** Clear local entries (kept for API compatibility; deletes the user's rows). */
export async function clearDailyLog(): Promise<void> {
  if (uid) await supabase.from('daily_logs').delete().eq('user_id', uid);
  entries = {};
  emit();
}

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function saveEntry(date: Date, sensation: Sensation, notes: string): Promise<void> {
  const k = dateKey(date);
  const entry: DailyEntry = { date: k, sensation, notes, savedAt: Date.now() };
  entries = { ...entries, [k]: entry };
  emit();
  if (uid) {
    await supabase.from('daily_logs').upsert({
      user_id: uid,
      date_key: k,
      sensation,
      notes,
      saved_at: entry.savedAt,
    });
  }
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
