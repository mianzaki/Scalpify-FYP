import { useSyncExternalStore } from 'react';
import { supabase, onAuthUser } from './supabase';

/**
 * Cloud-backed user store (Supabase Auth + a per-user `profiles` row).
 * Auth is real email/password; each user's profile + medical info lives in the
 * `profiles` table and is isolated by Row-Level Security. No device-local copy.
 */

export type Sex = 'male' | 'female' | 'other' | 'prefer-not-to-say';
export type FamilyHistory = 'none' | 'maternal' | 'paternal' | 'both' | 'unknown';
export type SurgeryTechnique = 'FUE' | 'FUT' | 'none';
export type Medication =
  | 'finasteride'
  | 'dutasteride'
  | 'minoxidil_topical'
  | 'minoxidil_oral'
  | 'spironolactone';

export type Ethnicity =
  | 'black'
  | 'east_asian'
  | 'hispanic'
  | 'mena'
  | 'south_asian'
  | 'southeast_asian'
  | 'white'
  | 'other';
export type Adherence = 'never' | 'sometimes' | 'often';
export type TreatmentIntent = 'have' | 'planning' | 'deciding' | 'none';
export type Goal = 'understand' | 'track' | 'visualize' | 'severity' | 'decide';

export type MedicalProfile = {
  age: number | null;
  sex: Sex | null;
  familyHistory: FamilyHistory | null;
  ageOfOnset: number | null;
  surgeryTechnique: SurgeryTechnique | null;
  graftCount: number | null;
  medications: Medication[];
  smoker: boolean;
  hasThyroidIssue: boolean;
  hasPCOS: boolean;
  recentMajorIllness: boolean;
  highStress: boolean;
  vitaminDeficiency: boolean;
  treatmentDone: boolean | null;
  ethnicity: Ethnicity | null;
  adherence: Adherence | null;
  treatmentIntent: TreatmentIntent | null;
  goals: Goal[];
};

export const EMPTY_MEDICAL_PROFILE: MedicalProfile = {
  age: null,
  sex: null,
  familyHistory: null,
  ageOfOnset: null,
  surgeryTechnique: null,
  graftCount: null,
  medications: [],
  smoker: false,
  hasThyroidIssue: false,
  hasPCOS: false,
  recentMajorIllness: false,
  highStress: false,
  vitaminDeficiency: false,
  treatmentDone: null,
  ethnicity: null,
  adherence: null,
  treatmentIntent: null,
  goals: [],
};

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  surgeryDate: string | null;
  createdAt: number;
  medical?: MedicalProfile;
};

type State = {
  user: UserProfile | null;
  hydrated: boolean;
};

let state: State = { user: null, hydrated: false };
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

function rowToUser(data: any): UserProfile {
  return {
    id: data.id,
    fullName: data.full_name ?? '',
    email: data.email ?? '',
    surgeryDate: data.surgery_date ?? null,
    createdAt: data.created_at ? Date.parse(data.created_at) : Date.now(),
    medical: { ...EMPTY_MEDICAL_PROFILE, ...(data.medical ?? {}) },
  };
}

/** Fetch (or lazily create) the user's profile row and publish it to the store. */
async function loadProfile(uid: string): Promise<UserProfile> {
  let { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw new Error(error.message);

  if (!data) {
    // First sign-in (e.g. after email confirmation) — create the profile, pulling
    // the name/surgery date the user entered at sign-up from their auth metadata.
    const { data: auth } = await supabase.auth.getUser();
    const meta = (auth.user?.user_metadata ?? {}) as { full_name?: string; surgery_date?: string | null };
    const row = {
      id: uid,
      full_name: meta.full_name ?? '',
      email: auth.user?.email ?? '',
      surgery_date: meta.surgery_date ?? null,
      medical: EMPTY_MEDICAL_PROFILE,
      created_at: new Date().toISOString(),
    };
    const { error: insErr } = await supabase.from('profiles').upsert(row);
    if (insErr) throw new Error(insErr.message);
    data = row;
  }

  const user = rowToUser(data);
  state = { user, hydrated: true };
  emit();
  return user;
}

// Keep the store in sync with auth: load the profile on sign-in, clear on sign-out.
onAuthUser(async uid => {
  if (!uid) {
    state = { user: null, hydrated: true };
    emit();
    return;
  }
  try {
    await loadProfile(uid);
  } catch {
    state = { user: null, hydrated: true };
    emit();
  }
});

/** Resolve the initial session before the app renders (called from App.tsx). */
export async function hydrateUser(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id ?? null;
    if (uid) await loadProfile(uid);
    else {
      state = { user: null, hydrated: true };
      emit();
    }
  } catch {
    state = { user: null, hydrated: true };
    emit();
  }
}

export type SignUpInput = {
  fullName: string;
  email: string;
  surgeryDate?: string | null;
};

export type SignUpResult =
  | { needsConfirmation: true; user: null }
  | { needsConfirmation: false; user: UserProfile };

export async function signUp(input: SignUpInput, password: string): Promise<SignUpResult> {
  const email = input.email.trim().toLowerCase();
  // Stash the name/surgery date in auth metadata so they survive an email-confirmation
  // round-trip (no DB session exists until the user confirms + signs in).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: input.fullName.trim(), surgery_date: input.surgeryDate?.trim() || null } },
  });
  if (error) throw new Error(error.message);
  const uid = data.user?.id;
  if (!uid) throw new Error('Sign-up failed — no user returned.');

  // Email confirmation enabled → no session yet. The profile is created on first sign-in.
  if (!data.session) return { needsConfirmation: true, user: null };

  const row = {
    id: uid,
    full_name: input.fullName.trim(),
    email,
    surgery_date: input.surgeryDate?.trim() || null,
    medical: EMPTY_MEDICAL_PROFILE,
    created_at: new Date().toISOString(),
  };
  const { error: pErr } = await supabase.from('profiles').upsert(row);
  if (pErr) throw new Error(pErr.message);

  return { needsConfirmation: false, user: await loadProfile(uid) };
}

export async function signIn(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(error.message);
  return loadProfile(data.user.id);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  state = { user: null, hydrated: true };
  emit();
}

export async function updateUser(patch: Partial<UserProfile>): Promise<void> {
  if (!state.user) return;
  const updated: UserProfile = { ...state.user, ...patch };
  state = { ...state, user: updated };
  emit();
  await supabase
    .from('profiles')
    .update({ full_name: updated.fullName, surgery_date: updated.surgeryDate, email: updated.email })
    .eq('id', updated.id);
}

/** Patch individual medical/onboarding fields (used by the step-by-step onboarding). */
export async function updateMedical(patch: Partial<MedicalProfile>): Promise<void> {
  if (!state.user) return;
  const medical: MedicalProfile = { ...EMPTY_MEDICAL_PROFILE, ...state.user.medical, ...patch };
  const updated: UserProfile = { ...state.user, medical };
  state = { ...state, user: updated };
  emit();
  await supabase.from('profiles').update({ medical }).eq('id', updated.id);
}

export function useUser(): UserProfile | null {
  return useSyncExternalStore(subscribe, () => state.user, () => state.user);
}

export function useUserHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => state.hydrated, () => state.hydrated);
}

export function firstNameOf(user: UserProfile | null): string {
  if (!user) return '';
  return user.fullName.split(/\s+/)[0] ?? '';
}

export function initialsOf(user: UserProfile | null): string {
  if (!user) return '';
  const parts = user.fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function daysSinceSurgery(user: UserProfile | null): number | null {
  if (!user?.surgeryDate) return null;
  const t = Date.parse(user.surgeryDate);
  if (Number.isNaN(t)) return null;
  const ms = Date.now() - t;
  return Math.max(0, Math.floor(ms / 86_400_000));
}
