import { useSyncExternalStore } from 'react';
import type { ChatRole } from './api';
import { supabase, onAuthUser } from './supabase';

const MAX_MESSAGES = 100;

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

let messages: ChatMessage[] = [];
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

async function loadMessages(): Promise<void> {
  if (!uid) {
    messages = [];
    hydrated = true;
    emit();
    return;
  }
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(MAX_MESSAGES);
  messages = (data ?? []).map(r => ({
    id: r.id,
    role: r.role as ChatRole,
    content: r.content,
    createdAt: Number(r.created_at) || 0,
  }));
  hydrated = true;
  emit();
}

onAuthUser(u => {
  uid = u;
  void loadMessages();
});

function newId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function appendMessage(role: ChatRole, content: string): ChatMessage {
  const msg: ChatMessage = { id: newId(), role, content, createdAt: Date.now() };
  messages = [...messages, msg].slice(-MAX_MESSAGES);
  emit();
  if (uid) {
    void supabase.from('chat_messages').insert({
      id: msg.id,
      user_id: uid,
      role: msg.role,
      content: msg.content,
      created_at: msg.createdAt,
    });
  }
  return msg;
}

export function updateMessage(id: string, content: string): void {
  messages = messages.map(m => (m.id === id ? { ...m, content } : m));
  emit();
  if (uid) void supabase.from('chat_messages').update({ content }).eq('id', id);
}

export function removeMessage(id: string): void {
  messages = messages.filter(m => m.id !== id);
  emit();
  if (uid) void supabase.from('chat_messages').delete().eq('id', id);
}

export async function clearChat(): Promise<void> {
  messages = [];
  emit();
  if (uid) await supabase.from('chat_messages').delete().eq('user_id', uid);
}

export function useChatMessages(): ChatMessage[] {
  return useSyncExternalStore(subscribe, () => messages, () => messages);
}

export function useChatHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => hydrated);
}
