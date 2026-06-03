import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced early so a missing .env is obvious during development.
  console.warn('Supabase env not set — set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    storage: AsyncStorage,        // persist the auth session on-device
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,    // no URL-based session in React Native
  },
});

/**
 * Subscribe to the current auth user id. Fires immediately with the current
 * session (or null), then on every auth change. Returns an unsubscribe fn.
 * Every data store uses this to (re)load that user's rows and clear on sign-out.
 */
export function onAuthUser(cb: (userId: string | null) => void): () => void {
  supabase.auth.getSession().then(({ data }) => cb(data.session?.user?.id ?? null));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user?.id ?? null);
  });
  return () => data.subscription.unsubscribe();
}

/** Current signed-in user id, or null. */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}
