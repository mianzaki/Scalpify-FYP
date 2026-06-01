import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'scalpify.user.v1';

export type Sex = 'male' | 'female' | 'other' | 'prefer-not-to-say';
export type FamilyHistory = 'none' | 'maternal' | 'paternal' | 'both' | 'unknown';
export type SurgeryTechnique = 'FUE' | 'FUT' | 'none';
export type Medication =
  | 'finasteride'
  | 'dutasteride'
  | 'minoxidil_topical'
  | 'minoxidil_oral'
  | 'spironolactone';

// --- Onboarding questionnaire types ---
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
// Goals the app can genuinely deliver: assess, track, visualize, stage, plan.
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
  // Onboarding questionnaire (collected after sign-up)
  treatmentDone: boolean | null;   // has had a hair transplant → branch selector
  ethnicity: Ethnicity | null;
  adherence: Adherence | null;                // done branch
  treatmentIntent: TreatmentIntent | null;    // not-done branch
  goals: Goal[];                              // not-done branch
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

function getSnapshot() {
  return state;
}

async function persist(user: UserProfile | null) {
  if (user) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function hydrateUser(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const user = raw ? (JSON.parse(raw) as UserProfile) : null;
    state = { user, hydrated: true };
  } catch {
    state = { user: null, hydrated: true };
  }
  emit();
}

export type SignUpInput = {
  fullName: string;
  email: string;
  surgeryDate?: string | null;
};

export async function signUp(input: SignUpInput): Promise<UserProfile> {
  const user: UserProfile = {
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    surgeryDate: input.surgeryDate?.trim() || null,
    createdAt: Date.now(),
  };
  state = { ...state, user };
  emit();
  await persist(user);
  return user;
}

export async function signIn(email: string): Promise<UserProfile | null> {
  const target = email.trim().toLowerCase();
  const existing = state.user;
  if (existing && existing.email === target) {
    return existing;
  }
  return null;
}

export async function signOut(): Promise<void> {
  state = { ...state, user: null };
  emit();
  await persist(null);
}

export async function updateUser(patch: Partial<UserProfile>): Promise<void> {
  if (!state.user) return;
  const updated: UserProfile = { ...state.user, ...patch };
  state = { ...state, user: updated };
  emit();
  await persist(updated);
}

/** Patch individual medical/onboarding fields (used by the step-by-step onboarding). */
export async function updateMedical(patch: Partial<MedicalProfile>): Promise<void> {
  if (!state.user) return;
  const medical: MedicalProfile = { ...EMPTY_MEDICAL_PROFILE, ...state.user.medical, ...patch };
  const updated: UserProfile = { ...state.user, medical };
  state = { ...state, user: updated };
  emit();
  await persist(updated);
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
