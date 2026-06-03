-- ============================================================================
-- Scalpify — Supabase schema for cloud accounts + per-user data (Option B).
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> paste -> Run.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLES (all keyed to auth.users; one row-owner per row)
-- ---------------------------------------------------------------------------

-- 1:1 profile + medical info for each authenticated user
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  email        text,
  surgery_date text,
  medical      jsonb default '{}'::jsonb,
  created_at   timestamptz default now()
);

-- scalp scans (the heavy AnalyzeResponse + context are stored as jsonb)
create table if not exists public.scans (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  photo_uri   text,
  captured_at bigint,
  data        jsonb,
  context     jsonb,
  created_at  timestamptz default now()
);
create index if not exists scans_user_idx on public.scans(user_id, captured_at desc);

-- medications + reminder metadata
create table if not exists public.medications (
  id               text primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text,
  type             text,
  time             text,
  weekly_pct       int default 0,
  icon             text,
  icon_color       text,
  icon_bg          text,
  reminder_enabled boolean default false,
  notification_id  text,
  created_at       timestamptz default now()
);
create index if not exists meds_user_idx on public.medications(user_id);

-- one row per logged dose; id = "${medId}|${YYYY-MM-DD}"
create table if not exists public.dose_logs (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  medication_id text not null,
  date_key      text not null,
  taken_at      bigint
);
create index if not exists dose_user_idx on public.dose_logs(user_id);

-- daily recovery log; one row per (user, day)
create table if not exists public.daily_logs (
  user_id   uuid not null references auth.users(id) on delete cascade,
  date_key  text not null,
  sensation text,
  notes     text,
  saved_at  bigint,
  primary key (user_id, date_key)
);

-- assistant chat history
create table if not exists public.chat_messages (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text,
  content    text,
  created_at bigint
);
create index if not exists chat_user_idx on public.chat_messages(user_id, created_at);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY — each user can only see/modify their own rows
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.scans         enable row level security;
alter table public.medications   enable row level security;
alter table public.dose_logs     enable row level security;
alter table public.daily_logs    enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "own profile"   on public.profiles;
drop policy if exists "own scans"     on public.scans;
drop policy if exists "own meds"      on public.medications;
drop policy if exists "own doses"     on public.dose_logs;
drop policy if exists "own dailylogs" on public.daily_logs;
drop policy if exists "own chats"     on public.chat_messages;

create policy "own profile"   on public.profiles      for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own scans"     on public.scans         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own meds"      on public.medications   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own doses"     on public.dose_logs     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own dailylogs" on public.daily_logs    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own chats"     on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- STORAGE — let authenticated users upload scan photos to the public 'uploads' bucket
-- (public read is already enabled on the bucket; this adds write access).
-- ---------------------------------------------------------------------------
drop policy if exists "auth insert uploads" on storage.objects;
drop policy if exists "auth update uploads" on storage.objects;
create policy "auth insert uploads" on storage.objects for insert to authenticated with check (bucket_id = 'uploads');
create policy "auth update uploads" on storage.objects for update to authenticated using (bucket_id = 'uploads');
