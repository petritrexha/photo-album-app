-- ============================================================
-- FOLIO — PRODUCTION SCHEMA (SECURED + FINAL)
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
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
create policy "profiles_select_own" on profiles for
select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for
insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for
update using (auth.uid() = id);
-- AUTO PROFILE
create or replace function handle_new_user() returns trigger as $$ begin
insert into profiles (id)
values (new.id) on conflict do nothing;
return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after
insert on auth.users for each row execute function handle_new_user();
-- ============================================================
-- ALBUMS
-- ============================================================
create table if not exists albums (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default 'Untitled Album',
  cover_url text,
  pages jsonb default '[]',
  is_public boolean default false,
  share_token text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table albums enable row level security;
create policy "albums_owner_full" on albums for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- 🔐 FIXED PUBLIC ACCESS
create policy "albums_public_read" on albums for
select using (
    is_public = true
    AND share_token IS NOT NULL
  );
create or replace function update_updated_at() returns trigger as $$ begin new.updated_at = now();
return new;
end;
$$ language plpgsql;
create trigger albums_updated_at before
update on albums for each row execute function update_updated_at();
-- ============================================================
-- PHOTOS
-- ============================================================
create table if not exists photos (
  id uuid default gen_random_uuid() primary key,
  album_id uuid references albums(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  url text not null,
  created_at timestamptz default now()
);
alter table photos enable row level security;
create policy "photos_owner" on photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ============================================================
-- QR CODES
-- ============================================================
create table if not exists qr_codes (
  id uuid default gen_random_uuid() primary key,
  album_id uuid references albums(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  target_url text,
  scan_count integer default 0,
  created_at timestamptz default now()
);
alter table qr_codes enable row level security;
create policy "qr_owner" on qr_codes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ============================================================
-- QR SCANS (SECURED)
-- ============================================================
create table if not exists qr_scans (
  id uuid default gen_random_uuid() primary key,
  qr_code_id uuid references qr_codes(id) on delete cascade,
  album_id uuid references albums(id) on delete cascade,
  scanned_at timestamptz default now()
);
alter table qr_scans enable row level security;
-- 🔐 FIXED
create policy "qr_scan_insert_valid" on qr_scans for
insert with check (
    exists (
      select 1
      from qr_codes q
      where q.id = qr_scans.qr_code_id
    )
  );
create policy "qr_scan_owner_read" on qr_scans for
select using (
    album_id in (
      select id
      from albums
      where user_id = auth.uid()
    )
  );
-- ============================================================
-- ALBUM SHARES
-- ============================================================
create table if not exists album_shares (
  album_id uuid references albums(id) on delete cascade primary key,
  user_id uuid references auth.users(id),
  share_token text unique,
  allow_messages boolean default false
);
alter table album_shares enable row level security;
create policy "share_owner" on album_shares for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "share_public_read" on album_shares for
select using (true);
-- ============================================================
-- ALBUM MESSAGES (SECURED)
-- ============================================================
create table if not exists album_messages (
  id uuid default gen_random_uuid() primary key,
  album_id uuid references albums(id),
  share_token text,
  body text,
  created_at timestamptz default now()
);
alter table album_messages enable row level security;
-- 🔐 FIXED
create policy "message_insert_valid" on album_messages for
insert with check (
    exists (
      select 1
      from album_shares s
      where s.album_id = album_messages.album_id
        and s.share_token = album_messages.share_token
    )
  );
create policy "message_owner_read" on album_messages for
select using (
    album_id in (
      select id
      from albums
      where user_id = auth.uid()
    )
  );
-- ============================================================
-- AI USAGE
-- ============================================================
create table if not exists ai_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  tier int,
  used_at timestamptz default now()
);
alter table ai_usage enable row level security;
create policy "ai_usage_owner" on ai_usage for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ============================================================
-- SERVICE ORDERS (LOCKED DOWN)
-- ============================================================
create table if not exists service_orders (
  id uuid default gen_random_uuid() primary key,
  email text,
  created_at timestamptz default now()
);
alter table service_orders enable row level security;
create policy "service_orders_insert_only" on service_orders for
insert with check (true);
-- ============================================================
-- PRINT WAITLIST (LOCKED DOWN)
-- ============================================================
create table if not exists print_waitlist (
  id uuid default gen_random_uuid() primary key,
  email text unique,
  created_at timestamptz default now()
);
alter table print_waitlist enable row level security;
create policy "print_waitlist_insert_only" on print_waitlist for
insert with check (true);
-- ============================================================
-- SAMPLE DATA (REAL USERS)
-- ============================================================
insert into profiles (id, display_name, plan)
values (
    '3154586c-dbd1-40d7-816d-680f5ba1496e',
    'User A',
    'pro'
  ),
  (
    'a904492f-f5cc-4df7-9446-c24c24715d9e',
    'User B',
    'free'
  ) on conflict do nothing;
insert into albums (id, user_id, title, is_public, share_token)
values (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '3154586c-dbd1-40d7-816d-680f5ba1496e',
    'User A Album',
    true,
    'token-a'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    'a904492f-f5cc-4df7-9446-c24c24715d9e',
    'User B Album',
    false,
    null
  ) on conflict do nothing;
insert into album_shares (album_id, user_id, share_token, allow_messages)
values (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '3154586c-dbd1-40d7-816d-680f5ba1496e',
    'token-a',
    true
  ) on conflict do nothing;