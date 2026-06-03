import { useSyncExternalStore } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import type { AnalyzeResponse } from './api';
import { supabase, onAuthUser } from './supabase';

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

function rowToRecord(r: any): ScanRecord {
  return {
    id: r.id,
    data: r.data,
    photoUri: r.photo_uri,
    capturedAt: Number(r.captured_at) || 0,
    context: r.context ?? undefined,
  };
}

async function loadScans(): Promise<void> {
  if (!uid) {
    state = { history: [], hydrated: true };
    emit();
    return;
  }
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .order('captured_at', { ascending: false })
    .limit(MAX_HISTORY);
  state = { history: error || !data ? [] : data.map(rowToRecord), hydrated: true };
  emit();
}

// Reload on sign-in, clear on sign-out.
onAuthUser(u => {
  uid = u;
  void loadScans();
});

/** Upload a local scan photo to the public `uploads` bucket; returns the public URL or null. */
async function uploadPhoto(localUri: string, id: string): Promise<string | null> {
  if (!uid) return null;
  try {
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
    const path = `${uid}/${id}.jpg`;
    const { error } = await supabase.storage
      .from('uploads')
      .upload(path, decode(base64), { contentType: 'image/jpeg', upsert: true });
    if (error) return null;
    return supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

async function persistScan(record: ScanRecord, localUri: string): Promise<void> {
  if (!uid) return;
  const publicUrl = await uploadPhoto(localUri, record.id);
  const photoUri = publicUrl ?? localUri;
  await supabase.from('scans').insert({
    id: record.id,
    user_id: uid,
    photo_uri: photoUri,
    captured_at: record.capturedAt,
    data: record.data,
    context: record.context ?? null,
  });
  if (publicUrl) {
    // Swap the optimistic local uri for the durable cloud URL.
    state = {
      ...state,
      history: state.history.map(s => (s.id === record.id ? { ...s, photoUri: publicUrl } : s)),
    };
    emit();
  }
}

export function setLatestScan(data: AnalyzeResponse, photoUri: string, context?: ScanContext) {
  const record: ScanRecord = {
    id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    data,
    photoUri, // shown immediately; swapped for the cloud URL once uploaded
    capturedAt: Date.now(),
    context,
  };
  state = { ...state, history: [record, ...state.history].slice(0, MAX_HISTORY) };
  emit();
  void persistScan(record, photoUri);
}

export async function clearScans(): Promise<void> {
  if (uid) await supabase.from('scans').delete().eq('user_id', uid);
  state = { ...state, history: [] };
  emit();
}

export async function removeScan(id: string): Promise<void> {
  const next = state.history.filter(s => s.id !== id);
  if (next.length === state.history.length) return;
  state = { ...state, history: next };
  emit();
  await supabase.from('scans').delete().eq('id', id);
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
