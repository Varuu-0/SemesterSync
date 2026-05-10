-- SemesterSync schema. Run this in the Supabase SQL editor.
-- Tables, RLS policies, realtime, and storage bucket + policies.

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Tables --------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  pdf_storage_path text,
  pdf_file_name text,
  syllabus_text text,
  created_at timestamptz not null default now()
);

create index if not exists courses_user_id_idx on public.courses(user_id);

-- Keep schema additive for projects already created from an earlier version.
alter table public.courses add column if not exists syllabus_text text;

create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  due_at timestamptz not null,
  category text,
  source_snippet text,
  completed_at timestamptz,
  google_event_id text,
  created_at timestamptz not null default now()
);

-- Keep schema additive for projects already created from an earlier version.
alter table public.deadlines add column if not exists category text;
alter table public.deadlines add column if not exists completed_at timestamptz;
alter table public.deadlines add column if not exists google_event_id text;

create index if not exists deadlines_user_course_idx on public.deadlines(user_id, course_id);
create index if not exists deadlines_due_at_idx on public.deadlines(due_at);
create index if not exists deadlines_user_completed_idx on public.deadlines(user_id, completed_at);

create table if not exists public.syllabus_cache (
  content_hash text primary key,
  parsed_json jsonb not null,
  created_at timestamptz not null default now()
);

-- Per-user settings, including Google Calendar integration state.
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_refresh_token text,
  google_calendar_id text,
  google_connected_at timestamptz,
  show_gcal_events boolean not null default true,
  last_sync_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "settings owner select" on public.user_settings;
drop policy if exists "settings owner insert" on public.user_settings;
drop policy if exists "settings owner update" on public.user_settings;
drop policy if exists "settings owner delete" on public.user_settings;

create policy "settings owner select" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "settings owner insert" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "settings owner update" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "settings owner delete" on public.user_settings
  for delete using (auth.uid() = user_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  role text not null default 'user',
  user_name text,
  user_photo text,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_course_idx on public.chat_messages(course_id, created_at);
create index if not exists chat_messages_user_idx on public.chat_messages(user_id, created_at);

-- Keep schema additive for projects already created from an earlier version.
alter table public.chat_messages add column if not exists role text not null default 'user';
alter table public.chat_messages alter column course_id drop not null;

-- Row Level Security --------------------------------------------------------
alter table public.courses enable row level security;
alter table public.deadlines enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "courses owner select" on public.courses;
drop policy if exists "courses owner insert" on public.courses;
drop policy if exists "courses owner update" on public.courses;
drop policy if exists "courses owner delete" on public.courses;

create policy "courses owner select" on public.courses
  for select using (auth.uid() = user_id);
create policy "courses owner insert" on public.courses
  for insert with check (auth.uid() = user_id);
create policy "courses owner update" on public.courses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "courses owner delete" on public.courses
  for delete using (auth.uid() = user_id);

drop policy if exists "deadlines owner select" on public.deadlines;
drop policy if exists "deadlines owner insert" on public.deadlines;
drop policy if exists "deadlines owner update" on public.deadlines;
drop policy if exists "deadlines owner delete" on public.deadlines;

create policy "deadlines owner select" on public.deadlines
  for select using (auth.uid() = user_id);
create policy "deadlines owner insert" on public.deadlines
  for insert with check (auth.uid() = user_id);
create policy "deadlines owner update" on public.deadlines
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "deadlines owner delete" on public.deadlines
  for delete using (auth.uid() = user_id);

drop policy if exists "chat owner select" on public.chat_messages;
drop policy if exists "chat owner insert" on public.chat_messages;
drop policy if exists "chat owner delete" on public.chat_messages;

create policy "chat owner select" on public.chat_messages
  for select using (auth.uid() = user_id);
create policy "chat owner insert" on public.chat_messages
  for insert with check (auth.uid() = user_id);
create policy "chat owner delete" on public.chat_messages
  for delete using (auth.uid() = user_id);

-- Realtime ------------------------------------------------------------------
-- Add tables to the realtime publication so the client can subscribe via
-- supabase.channel(...).on('postgres_changes', ...).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'courses'
  ) then
    execute 'alter publication supabase_realtime add table public.courses';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'deadlines'
  ) then
    execute 'alter publication supabase_realtime add table public.deadlines';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.chat_messages';
  end if;
end $$;

-- Storage -------------------------------------------------------------------
-- Private bucket 'syllabi'. Object paths are namespaced by user id:
--   <uid>/courses/<course_id>/<timestamp>-<filename>.pdf
insert into storage.buckets (id, name, public)
values ('syllabi', 'syllabi', false)
on conflict (id) do nothing;

drop policy if exists "syllabi owner select" on storage.objects;
drop policy if exists "syllabi owner insert" on storage.objects;
drop policy if exists "syllabi owner update" on storage.objects;
drop policy if exists "syllabi owner delete" on storage.objects;

create policy "syllabi owner select" on storage.objects
  for select using (
    bucket_id = 'syllabi'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "syllabi owner insert" on storage.objects
  for insert with check (
    bucket_id = 'syllabi'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "syllabi owner update" on storage.objects
  for update using (
    bucket_id = 'syllabi'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "syllabi owner delete" on storage.objects
  for delete using (
    bucket_id = 'syllabi'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
