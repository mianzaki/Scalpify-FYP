import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnalyzeResponse } from './api';

const HISTORY_KEY = 'scalpify.scans.v1';
const MAX_HISTORY = 60;

export type ScanContext = {
  stressLevel: 1 | 2 | 3 | 4 | 5;
  sleepHours: number;
  newSheddingNoticed: 'none' | 'normal' | 'increased';
  daysSinceWashed: number | null;
  pregnantOrPostpartum?: boolean;
};

export type ScanRecord = {
  id: string;
  data: AnalyzeResponse;
  photoUri: string;
  capturedAt: number;
  context?: ScanContext;
};

type State = {
  history: ScanRecord[];
  hydrated: boolean;
};

let state: State = { history: [], hydrated: false };
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
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
  } catch {
    // best-effort persistence — don't crash the UI
  }
}

export async function hydrateScans(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as ScanRecord[]) : [];
    state = { history: parsed, hydrated: true };
  } catch {
    state = { history: [], hydrated: true };
  }
  emit();
}

export function setLatestScan(data: AnalyzeResponse, photoUri: string, context?: ScanContext) {
  const record: ScanRecord = {
    id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    data,
    photoUri,
    capturedAt: Date.now(),
    context,
  };
  state = { ...state, history: [record, ...state.history].slice(0, MAX_HISTORY) };
  emit();
  void persist();
}

export async function clearScans(): Promise<void> {
  state = { ...state, history: [] };
  emit();
  await persist();
}

export async function removeScan(id: string): Promise<void> {
  const next = state.history.filter(s => s.id !== id);
  if (next.length === state.history.length) return;
  state = { ...state, history: next };
  emit();
  await persist();
}

export function useLatestScan(): AnalyzeResponse | null {
  return useSyncExternalStore(subscribe, () => state.history[0]?.data ?? null, () => state.history[0]?.data ?? null);
}

export function useLatestScanFull(): ScanRecord | null {
  return useSyncExternalStore(subscribe, () => state.history[0] ?? null, () => state.history[0] ?? null);
}

export function useScanHistory(): ScanRecord[] {
  return useSyncExternalStore(subscribe, () => state.history, () => state.history);
}
