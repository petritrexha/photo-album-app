-- ============================================================
-- FOLIO - REFERENCE SCHEMA (HARDENED)
-- ============================================================
-- This file is a safe reference snapshot.
-- For existing projects, apply `supabase/hardening_patch.sql`.

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  language text default 'en' check (language in ('en', 'sq')),
  plan text default 'free' check (plan in ('free', 'pro', 'studio')),
  plan_expires_at timestamptz,
  tier3_used integer default 0,
  tier3_reset_at timestamptz default date_trunc('month', now()) + interval '1 month',
  onboarding_done boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- ============================================================
-- ALBUMS
-- ============================================================
create table if not exists albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default 'Untitled Album',
  cover_url text,
  pages jsonb default '[]'::jsonb,
  is_public boolean default false,
  share_token text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table albums enable row level security;
drop policy if exists "albums_owner_full" on albums;
drop policy if exists "albums_public_read" on albums;
create policy "albums_owner_full" on albums
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function update_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists albums_updated_at on albums;
create trigger albums_updated_at
before update on albums
for each row execute function update_updated_at();

create index if not exists idx_albums_user_id on albums(user_id);
create index if not exists idx_albums_updated_at on albums(updated_at desc);

-- ============================================================
-- PHOTOS
-- ============================================================
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  cloudinary_id text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz default now()
);

alter table photos enable row level security;
drop policy if exists "photos_owner" on photos;
create policy "photos_owner" on photos
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_photos_album_id on photos(album_id);
create index if not exists idx_photos_user_id on photos(user_id);

-- ============================================================
-- FRAMES
-- ============================================================
create table if not exists frames (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  album_id uuid references albums(id) on delete cascade,
  name text,
  url text not null,
  cloudinary_id text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz default now()
);

alter table frames enable row level security;
drop policy if exists "frames_owner" on frames;
create policy "frames_owner" on frames
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_frames_album_id on frames(album_id);
create index if not exists idx_frames_user_id on frames(user_id);

-- ============================================================
-- QR CODES
-- ============================================================
create table if not exists qr_codes (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  target_url text,
  scan_count integer default 0,
  created_at timestamptz default now()
);

alter table qr_codes enable row level security;
drop policy if exists "qr_owner" on qr_codes;
create policy "qr_owner" on qr_codes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_qr_codes_album_id on qr_codes(album_id);
create index if not exists idx_qr_codes_user_id on qr_codes(user_id);

-- ============================================================
-- QR SCANS
-- ============================================================
create table if not exists qr_scans (
  id uuid primary key default gen_random_uuid(),
  qr_code_id uuid not null references qr_codes(id) on delete cascade,
  album_id uuid not null references albums(id) on delete cascade,
  scanned_at timestamptz default now()
);

alter table qr_scans enable row level security;
drop policy if exists "qr_scan_insert_valid" on qr_scans;
drop policy if exists "qr_scan_owner_read" on qr_scans;
create policy "qr_scan_insert_valid" on qr_scans
for insert
with check (
  exists (
    select 1
    from qr_codes q
    where q.id = qr_scans.qr_code_id
      and q.album_id = qr_scans.album_id
  )
);
create policy "qr_scan_owner_read" on qr_scans
for select
using (
  album_id in (select id from albums where user_id = auth.uid())
);

create index if not exists idx_qr_scans_album_id on qr_scans(album_id);
create index if not exists idx_qr_scans_qr_code_id on qr_scans(qr_code_id);

-- ============================================================
-- ALBUM SHARES
-- ============================================================
create table if not exists album_shares (
  album_id uuid primary key references albums(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  share_token text unique,
  allow_messages boolean default false
);

alter table album_shares enable row level security;
drop policy if exists "share_owner" on album_shares;
drop policy if exists "share_public_read" on album_shares;
create policy "share_owner" on album_shares
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================================
-- ALBUM MESSAGES
-- ============================================================
create table if not exists album_messages (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references albums(id),
  share_token text,
  body text,
  created_at timestamptz default now()
);

alter table album_messages enable row level security;
drop policy if exists "message_insert_valid" on album_messages;
drop policy if exists "message_owner_read" on album_messages;
create policy "message_insert_valid" on album_messages
for insert
with check (
  exists (
    select 1
    from album_shares s
    where s.album_id = album_messages.album_id
      and s.share_token = album_messages.share_token
      and s.allow_messages = true
  )
);
create policy "message_owner_read" on album_messages
for select
using (
  album_id in (select id from albums where user_id = auth.uid())
);

create index if not exists idx_album_messages_album_id on album_messages(album_id);

-- ============================================================
-- AI USAGE
-- ============================================================
create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  tier int,
  used_at timestamptz default now()
);

alter table ai_usage enable row level security;
drop policy if exists "ai_usage_owner" on ai_usage;
create policy "ai_usage_owner" on ai_usage
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_ai_usage_user_used_at on ai_usage(user_id, used_at desc);

-- ============================================================
-- SERVICE ORDERS
-- ============================================================
create table if not exists service_orders (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz default now()
);

alter table service_orders enable row level security;
drop policy if exists "service_orders_insert_only" on service_orders;
create policy "service_orders_insert_only" on service_orders
for insert
with check (true);

-- ============================================================
-- PRINT WAITLIST
-- ============================================================
create table if not exists print_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz default now()
);

alter table print_waitlist enable row level security;
drop policy if exists "print_waitlist_insert_only" on print_waitlist;
create policy "print_waitlist_insert_only" on print_waitlist
for insert
with check (true);

