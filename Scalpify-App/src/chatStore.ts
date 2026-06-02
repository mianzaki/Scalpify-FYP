import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatRole } from './api';

const KEY = 'scalpify.chat.v1';
const MAX_MESSAGES = 100;

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

let messages: ChatMessage[] = [];
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
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(messages));
  } catch {
    // best-effort
  }
}

export async function hydrateChat(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    messages = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    messages = [];
  }
  hydrated = true;
  emit();
}

function newId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function appendMessage(role: ChatRole, content: string): ChatMessage {
  const msg: ChatMessage = { id: newId(), role, content, createdAt: Date.now() };
  messages = [...messages, msg].slice(-MAX_MESSAGES);
  emit();
  void persist();
  return msg;
}

/** Replace a message's content in place (used to swap a "typing…" placeholder for the reply). */
export function updateMessage(id: string, content: string): void {
  messages = messages.map(m => (m.id === id ? { ...m, content } : m));
  emit();
  void persist();
}

export function removeMessage(id: string): void {
  messages = messages.filter(m => m.id !== id);
  emit();
  void persist();
}

export async function clearChat(): Promise<void> {
  messages = [];
  emit();
  await AsyncStorage.removeItem(KEY);
}

export function useChatMessages(): ChatMessage[] {
  return useSyncExternalStore(subscribe, () => messages, () => messages);
}

export function useChatHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => hydrated);
}
