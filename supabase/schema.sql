-- ============================================================
-- FOLIO — Complete Production Supabase Schema v2
-- ============================================================
-- Run this entire file in:
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
-- COVERS:
--   albums, photos, frames, profiles, ai_usage, exports,
--   service_orders, videos, qr_codes, print_waitlist,
--   notifications, album_shares
--
-- All tables have RLS. Triggers auto-create profiles.
-- Views for quota enforcement.
-- Sample test data at the bottom.
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- enables fast ILIKE search on titles


-- ============================================================
-- CORE TABLES
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- TABLE: profiles
-- Extended user profile. Auto-created on signup via trigger.
-- ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id                uuid references auth.users(id) on delete cascade primary key,
  display_name      text,
  avatar_url        text,
  language          text default 'en'   check (language in ('en', 'sq')),
  plan              text default 'free' check (plan in ('free', 'pro', 'studio')),
  plan_expires_at   timestamptz,
  -- Monthly quota tracking (reset each billing cycle)
  tier3_used        integer default 0,
  tier3_reset_at    timestamptz default date_trunc('month', now()) + interval '1 month',
  -- Notification preferences
  notify_service_updates  boolean default true,
  notify_print_ready      boolean default true,
  -- Onboarding
  onboarding_done   boolean default false,
  -- Marketing
  print_waitlist    boolean default false,
  created_at        timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on profiles for update
  using  (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users insert own profile"
  on profiles for insert
  with check (auth.uid() = id);


-- ──────────────────────────────────────────────────────────────
-- TRIGGER: auto-create profile on signup
-- ──────────────────────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ──────────────────────────────────────────────────────────────
-- TABLE: albums
-- Core table. Each row is one photo product project.
-- ──────────────────────────────────────────────────────────────
create table if not exists albums (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  title           text not null default 'Untitled Album',
  cover_url       text,
  pages           jsonb default '[]'::jsonb,
  -- Category drives canvas size, tools, AI hint
  -- photo-book | photo-cards | wall-art | framed-photo |
  -- photo-strip | edited-photo | instagram-post | calendar
  category        text default 'photo-book',
  -- Style setup answers (from onboarding overlay)
  style_occasion  text,   -- wedding | birthday | travel | family | other
  style_mood      text,   -- warm-golden | dark-moody | clean-minimal | vibrant-bold
  -- Sharing
  is_public       boolean default false,
  share_token     text unique,  -- random token for shareable link
  -- Mobile-generated flag (simplified flow)
  mobile_created  boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table albums enable row level security;

-- Users see their own albums always
create policy "Users manage own albums"
  on albums for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anyone can read a public album via share_token
-- (used by QR code scanner flow — no auth required)
create policy "Public albums readable by share token"
  on albums for select
  using (is_public = true);

-- Index for fast dashboard queries
create index if not exists albums_user_id_updated on albums (user_id, updated_at desc);
-- Index for share token lookup (QR code landing page)
create index if not exists albums_share_token on albums (share_token) where share_token is not null;
-- Full-text search index on title
create index if not exists albums_title_trgm on albums using gin (title gin_trgm_ops);


-- ──────────────────────────────────────────────────────────────
-- TRIGGER: auto-update albums.updated_at
-- ──────────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists albums_updated_at on albums;
create trigger albums_updated_at
  before update on albums
  for each row execute function update_updated_at();


-- ──────────────────────────────────────────────────────────────
-- TABLE: photos
-- Images uploaded by a user for use in albums.
-- ──────────────────────────────────────────────────────────────
create table if not exists photos (
  id              uuid default gen_random_uuid() primary key,
  album_id        uuid references albums(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade not null,
  url             text not null,
  cloudinary_id   text,
  width           integer default 0,
  height          integer default 0,
  -- Dominant colours extracted client-side (hex array JSON)
  -- e.g. '["#2a1a08","#c8842e","#f4f0ea"]'
  dominant_colors jsonb,
  -- Optional alt text / AI-generated description
  description     text,
  created_at      timestamptz default now()
);

alter table photos enable row level security;

create policy "Users manage own photos"
  on photos for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists photos_album_id on photos (album_id);
create index if not exists photos_user_id  on photos (user_id);


-- ──────────────────────────────────────────────────────────────
-- TABLE: videos
-- Short video clips (≤30s) uploaded for use inside album pages.
-- In digital view: autoplays silently on canvas.
-- In print view: thumbnail frame extracted and rendered instead.
-- ──────────────────────────────────────────────────────────────
create table if not exists videos (
  id              uuid default gen_random_uuid() primary key,
  album_id        uuid references albums(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade not null,
  url             text not null,          -- Cloudinary video URL
  thumbnail_url   text,                   -- Extracted first-frame thumbnail
  cloudinary_id   text,
  duration_sec    numeric(6,2),           -- Clip length in seconds (max 30)
  width           integer default 0,
  height          integer default 0,
  -- Original filename for display
  filename        text,
  -- Format: mp4 | mov | webm
  format          text,
  created_at      timestamptz default now()
);

alter table videos enable row level security;

create policy "Users manage own videos"
  on videos for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists videos_album_id on videos (album_id);
create index if not exists videos_user_id  on videos (user_id);


-- ──────────────────────────────────────────────────────────────
-- TABLE: frames
-- PNG/WebP overlay assets with transparency.
-- Borders, decorative stickers, watermarks.
-- album_id nullable = global to user (not per-album).
-- ──────────────────────────────────────────────────────────────
create table if not exists frames (
  id              uuid default gen_random_uuid() primary key,
  album_id        uuid references albums(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade not null,
  name            text not null default 'Frame',
  url             text not null,
  cloudinary_id   text,
  width           integer default 0,
  height          integer default 0,
  created_at      timestamptz default now()
);

alter table frames enable row level security;

create policy "Users manage own frames"
  on frames for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────────
-- TABLE: qr_codes
-- QR codes generated for physical albums.
-- Scanning opens the album's public digital viewer on mobile.
-- Each QR code links to: /view/[album_id]?token=[share_token]
-- ──────────────────────────────────────────────────────────────
create table if not exists qr_codes (
  id              uuid default gen_random_uuid() primary key,
  album_id        uuid references albums(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  -- Resolved URL this QR code points to
  target_url      text not null,
  -- SVG or PNG data URL of the QR code image (stored after generation)
  qr_image_url    text,
  -- Optional: which page to embed this QR on
  page_index      integer,
  -- Position on canvas when placed as an element (stored in pages JSON too,
  -- but kept here for reference/regeneration)
  canvas_x        integer,
  canvas_y        integer,
  canvas_size     integer default 120,
  -- Scan analytics
  scan_count      integer default 0,
  last_scanned_at timestamptz,
  created_at      timestamptz default now()
);

alter table qr_codes enable row level security;

create policy "Users manage own qr_codes"
  on qr_codes for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists qr_codes_album_id on qr_codes (album_id);


-- ──────────────────────────────────────────────────────────────
-- TABLE: qr_scans
-- Each time a QR code is scanned, a row is inserted here.
-- Enables scan count analytics in the dashboard.
-- No RLS on insert — public (scanner has no auth).
-- Select restricted to album owner.
-- ──────────────────────────────────────────────────────────────
create table if not exists qr_scans (
  id              uuid default gen_random_uuid() primary key,
  qr_code_id      uuid references qr_codes(id) on delete cascade not null,
  album_id        uuid references albums(id) on delete cascade not null,
  -- Anonymous device info for analytics
  user_agent      text,
  country_code    text,
  scanned_at      timestamptz default now()
);

alter table qr_scans enable row level security;

-- Public can insert (scanner is unauthenticated)
create policy "Anyone can log qr scan"
  on qr_scans for insert
  with check (true);

-- Only album owner can read their scan data
create policy "Users read own qr_scans"
  on qr_scans for select
  using (
    album_id in (
      select id from albums where user_id = auth.uid()
    )
  );

create index if not exists qr_scans_qr_code_id on qr_scans (qr_code_id);
create index if not exists qr_scans_album_id   on qr_scans (album_id);


-- ──────────────────────────────────────────────────────────────
-- TABLE: album_shares
-- Shareable link + optional password for a specific album.
-- Used for the QR code landing page and direct share links.
-- ──────────────────────────────────────────────────────────────
create table if not exists album_shares (
  id              uuid default gen_random_uuid() primary key,
  album_id        uuid references albums(id) on delete cascade not null unique,
  user_id         uuid references auth.users(id) on delete cascade not null,
  share_token     text not null unique default encode(gen_random_bytes(16), 'hex'),
  -- Optional password protection (hashed if set)
  password_hash   text,
  -- Optional expiry
  expires_at      timestamptz,
  -- Whether recipients can leave voice notes / written messages
  allow_messages  boolean default false,
  -- View count
  view_count      integer default 0,
  created_at      timestamptz default now()
);

alter table album_shares enable row level security;

create policy "Users manage own album_shares"
  on album_shares for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public can read share config to validate token (needed for QR landing)
create policy "Anyone can read share by token"
  on album_shares for select
  using (true);

create index if not exists album_shares_token on album_shares (share_token);


-- ──────────────────────────────────────────────────────────────
-- TABLE: album_messages
-- Voice notes or written messages left by QR code scanners.
-- Album owner can read. Commenter is anonymous (no auth required).
-- ──────────────────────────────────────────────────────────────
create table if not exists album_messages (
  id              uuid default gen_random_uuid() primary key,
  album_id        uuid references albums(id) on delete cascade not null,
  share_token     text not null,
  -- Message content (text or voice note URL)
  message_type    text default 'text' check (message_type in ('text', 'voice')),
  body            text,           -- text content or Cloudinary audio URL
  sender_name     text,           -- optional display name
  created_at      timestamptz default now()
);

alter table album_messages enable row level security;

-- Anyone with the share token can post a message
create policy "Anyone can post album message"
  on album_messages for insert
  with check (true);

-- Only album owner can read messages
create policy "Album owner reads messages"
  on album_messages for select
  using (
    album_id in (
      select id from albums where user_id = auth.uid()
    )
  );

create index if not exists album_messages_album_id on album_messages (album_id);


-- ============================================================
-- AI & MONETISATION TABLES
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- TABLE: ai_usage
-- Tracks every AI call per user for quota enforcement.
--
-- tier 1 = micro-AI (caption suggest, colour match) — no quota
-- tier 2 = session AI (restyle, batch caption) — counts for plan
-- tier 3 = full generation (album layout from scratch) — hard quota
--          free=3/month, pro=50/month, studio=unlimited
-- ──────────────────────────────────────────────────────────────
create table if not exists ai_usage (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  tier          integer not null check (tier in (1, 2, 3)),
  model         text not null,
  tokens_used   integer default 0,
  album_id      uuid references albums(id) on delete set null,
  -- 'generate' | 'refine' | 'caption' | 'palette' | 'tone' |
  -- 'per-page' | 'style-setup' | 'balance-check'
  action        text,
  used_at       timestamptz default now()
);

alter table ai_usage enable row level security;

create policy "Users read own ai_usage"
  on ai_usage for select
  using (auth.uid() = user_id);

create policy "Users insert own ai_usage"
  on ai_usage for insert
  with check (auth.uid() = user_id);

-- Critical index for quota queries: "tier-3 calls this month for this user"
create index if not exists ai_usage_quota_check
  on ai_usage (user_id, tier, used_at);


-- ──────────────────────────────────────────────────────────────
-- TABLE: exports
-- Tracks every PDF and physical print export job.
-- paid=false  → watermarked PDF, 72 dpi
-- paid=true   → clean PDF, 300 dpi
-- ──────────────────────────────────────────────────────────────
create table if not exists exports (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  album_id      uuid references albums(id) on delete cascade not null,
  -- pdf-a4-landscape | pdf-a4-portrait | pdf-square | physical
  format        text not null,
  resolution    integer default 72,
  paid          boolean default false,
  payment_ref   text,       -- Stripe payment intent ID (future)
  -- For physical: fulfilment partner ref
  fulfilment_ref text,
  fulfilment_status text default 'pending'
    check (fulfilment_status in ('pending', 'sent_to_printer', 'printed', 'shipped', 'delivered')),
  -- Download URL (set after PDF is generated server-side in future)
  download_url  text,
  download_expires_at timestamptz,
  created_at    timestamptz default now()
);

alter table exports enable row level security;

create policy "Users manage own exports"
  on exports for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists exports_user_id   on exports (user_id);
create index if not exists exports_album_id  on exports (album_id);


-- ──────────────────────────────────────────────────────────────
-- TABLE: service_orders
-- Done-for-you service inquiries AND print waitlist entries.
-- Not linked to auth.users — submitted before or without signup.
-- No RLS — public insert, admin reads via service role key.
-- ──────────────────────────────────────────────────────────────
create table if not exists service_orders (
  id            uuid default gen_random_uuid() primary key,
  -- Linked user account (optional — only set if they were signed in)
  user_id       uuid references auth.users(id) on delete set null,
  name          text,
  email         text not null,
  phone         text,
  -- photo-book | wall-art | photo-cards | calendar | other
  product_type  text,
  -- Style preferences collected in inquiry form
  style_notes   text,
  photo_count   integer,
  deadline_date date,
  -- inquiry | in_progress | design_review | delivered | paid | print_waitlist
  status        text default 'inquiry'
    check (status in (
      'inquiry', 'in_progress', 'design_review',
      'delivered', 'paid', 'print_waitlist'
    )),
  -- Internal admin notes
  admin_notes   text,
  -- Price quoted / charged
  price_quoted  numeric(8,2),
  price_paid    numeric(8,2),
  payment_ref   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- No RLS on service_orders (public inquiry form).
-- Admin access via Supabase service-role key only.
-- To lock down: enable RLS + service-role policy.


-- ──────────────────────────────────────────────────────────────
-- TABLE: print_waitlist
-- Captures emails from the "physical print coming soon" CTA.
-- ──────────────────────────────────────────────────────────────
create table if not exists print_waitlist (
  id            uuid default gen_random_uuid() primary key,
  email         text not null unique,
  user_id       uuid references auth.users(id) on delete set null,
  product_type  text,   -- what kind of print they want
  notified_at   timestamptz,  -- when we emailed them the launch notification
  created_at    timestamptz default now()
);

-- No RLS — public insert (pre-auth signup), admin reads via service role.


-- ──────────────────────────────────────────────────────────────
-- TABLE: upgrade_events
-- Tracks when users see upgrade prompts and whether they converted.
-- Used to measure conversion funnel.
-- ──────────────────────────────────────────────────────────────
create table if not exists upgrade_events (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  -- 'tier3_quota_hit' | 'export_watermark' | 'export_300dpi' | 'manual_visit'
  trigger       text not null,
  -- 'shown' | 'dismissed' | 'upgraded'
  outcome       text default 'shown' check (outcome in ('shown', 'dismissed', 'upgraded')),
  plan_before   text,
  plan_after    text,
  created_at    timestamptz default now()
);

alter table upgrade_events enable row level security;

create policy "Users manage own upgrade_events"
  on upgrade_events for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────────
-- TABLE: notifications
-- In-app notifications for the user.
-- e.g. "Your service order is ready to review", "Print shipped"
-- ──────────────────────────────────────────────────────────────
create table if not exists notifications (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  type          text not null,
    -- 'service_update' | 'print_shipped' | 'export_ready' |
    -- 'album_message' | 'qr_scan_milestone' | 'plan_expiring'
  title         text not null,
  body          text,
  link          text,       -- route to navigate to on click
  read          boolean default false,
  created_at    timestamptz default now()
);

alter table notifications enable row level security;

create policy "Users manage own notifications"
  on notifications for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists notifications_user_unread
  on notifications (user_id, read, created_at desc);


-- ============================================================
-- MOBILE-SPECIFIC TABLES
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- TABLE: mobile_sessions
-- Tracks mobile-created albums so we know which were made via
-- the simplified mobile flow vs. the full desktop editor.
-- Also stores the AI prompt used in the mobile flow.
-- ──────────────────────────────────────────────────────────────
create table if not exists mobile_sessions (
  id              uuid default gen_random_uuid() primary key,
  album_id        uuid references albums(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  -- The AI style prompt entered on mobile
  ai_prompt       text,
  -- Device info
  device_type     text,   -- 'ios' | 'android' | 'mobile-web'
  -- How they proceeded after import
  -- 'ai_only' | 'manual' | 'both'
  flow_type       text default 'ai_only',
  -- Whether they eventually opened in desktop editor
  opened_desktop  boolean default false,
  created_at      timestamptz default now()
);

alter table mobile_sessions enable row level security;

create policy "Users manage own mobile_sessions"
  on mobile_sessions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- VIEWS FOR APPLICATION USE
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- VIEW: monthly_ai_tier3_usage
-- Call before every Tier 3 AI request to check quota.
-- Usage in API route:
--   SELECT count FROM monthly_ai_tier3_usage WHERE user_id = $1
-- ──────────────────────────────────────────────────────────────
create or replace view monthly_ai_tier3_usage as
select
  user_id,
  count(*)::integer  as count,
  date_trunc('month', now()) as period_start
from ai_usage
where
  tier = 3
  and used_at >= date_trunc('month', now())
group by user_id;


-- ──────────────────────────────────────────────────────────────
-- VIEW: user_quota_status
-- Full quota snapshot for a user.
-- Used by the editor to show usage badge and block Tier 3 calls.
-- ──────────────────────────────────────────────────────────────
create or replace view user_quota_status as
select
  p.id                                      as user_id,
  p.plan,
  p.plan_expires_at,
  -- Tier 3 limit by plan
  case p.plan
    when 'free'   then 3
    when 'pro'    then 50
    when 'studio' then 999999
    else 3
  end                                       as tier3_limit,
  -- Actual Tier 3 usage this month
  coalesce(u.count, 0)                      as tier3_used,
  -- Remaining calls
  greatest(
    case p.plan
      when 'free'   then 3
      when 'pro'    then 50
      when 'studio' then 999999
      else 3
    end - coalesce(u.count, 0),
    0
  )                                         as tier3_remaining,
  -- True if they've hit their limit
  (coalesce(u.count, 0) >= case p.plan
    when 'free'   then 3
    when 'pro'    then 50
    when 'studio' then 999999
    else 3
  end)                                      as tier3_exhausted,
  -- Days until quota resets
  extract(day from
    date_trunc('month', now()) + interval '1 month' - now()
  )::integer                                as days_until_reset
from profiles p
left join monthly_ai_tier3_usage u on u.user_id = p.id;


-- ──────────────────────────────────────────────────────────────
-- VIEW: album_summary
-- Lightweight album list for the dashboard grid.
-- Returns only what the card needs — no full pages JSON.
-- ──────────────────────────────────────────────────────────────
create or replace view album_summary as
select
  a.id,
  a.user_id,
  a.title,
  a.cover_url,
  a.category,
  a.is_public,
  a.share_token,
  a.mobile_created,
  a.style_occasion,
  a.style_mood,
  jsonb_array_length(a.pages)          as page_count,
  (
    select count(*) from photos p where p.album_id = a.id
  )::integer                           as photo_count,
  (
    select count(*) from videos v where v.album_id = a.id
  )::integer                           as video_count,
  (
    select count(*) from qr_codes q where q.album_id = a.id
  )::integer                           as qr_count,
  a.created_at,
  a.updated_at
from albums a;


-- ──────────────────────────────────────────────────────────────
-- VIEW: qr_code_stats
-- Scan analytics per QR code with album title.
-- ──────────────────────────────────────────────────────────────
create or replace view qr_code_stats as
select
  q.id,
  q.album_id,
  q.user_id,
  a.title                          as album_title,
  q.target_url,
  q.page_index,
  q.canvas_size,
  q.scan_count,
  q.last_scanned_at,
  q.created_at,
  -- Scans in last 7 days
  (
    select count(*) from qr_scans s
    where s.qr_code_id = q.id
    and s.scanned_at >= now() - interval '7 days'
  )::integer                       as scans_last_7d
from qr_codes q
join albums a on a.id = q.album_id;


-- ──────────────────────────────────────────────────────────────
-- FUNCTION: increment_qr_scan_count
-- Called by the QR landing page API to bump scan_count
-- and log the scan event atomically.
-- ──────────────────────────────────────────────────────────────
create or replace function increment_qr_scan_count(
  p_qr_code_id  uuid,
  p_album_id    uuid,
  p_user_agent  text default null,
  p_country     text default null
)
returns void as $$
begin
  -- Bump counter on qr_codes
  update qr_codes
  set
    scan_count      = scan_count + 1,
    last_scanned_at = now()
  where id = p_qr_code_id;

  -- Insert scan event row
  insert into qr_scans (qr_code_id, album_id, user_agent, country_code)
  values (p_qr_code_id, p_album_id, p_user_agent, p_country);
end;
$$ language plpgsql security definer;


-- ──────────────────────────────────────────────────────────────
-- FUNCTION: get_or_create_album_share
-- Called when user clicks "Share" or generates a QR code.
-- Creates album_shares row if it doesn't exist, returns the token.
-- Also marks the album as is_public.
-- ──────────────────────────────────────────────────────────────
create or replace function get_or_create_album_share(
  p_album_id    uuid,
  p_user_id     uuid,
  p_allow_msgs  boolean default false
)
returns text as $$
declare
  v_token text;
begin
  -- Check ownership
  if not exists (
    select 1 from albums where id = p_album_id and user_id = p_user_id
  ) then
    raise exception 'Album not found or access denied';
  end if;

  -- Upsert share row
  insert into album_shares (album_id, user_id, allow_messages)
  values (p_album_id, p_user_id, p_allow_msgs)
  on conflict (album_id) do update
    set allow_messages = excluded.allow_messages
  returning share_token into v_token;

  -- Mark album public
  update albums
  set is_public = true, share_token = v_token
  where id = p_album_id;

  return v_token;
end;
$$ language plpgsql security definer;


-- ============================================================
-- INDEXES (additional for performance)
-- ============================================================

create index if not exists ai_usage_user_month
  on ai_usage (user_id, used_at desc);

create index if not exists exports_paid_user
  on exports (user_id, paid, created_at desc);

create index if not exists album_messages_album
  on album_messages (album_id, created_at desc);

create index if not exists notifications_unread
  on notifications (user_id) where read = false;


-- ============================================================
-- SAMPLE TEST DATA
-- ============================================================
-- These rows use placeholder UUIDs. Replace the user UUIDs with
-- real ones from Supabase Dashboard → Authentication → Users
-- before testing RLS cross-user isolation.
--
-- Test Users:
--   User A (Pro):    00000000-0000-0000-0000-000000000001
--   User B (Free):   00000000-0000-0000-0000-000000000002
--   User C (Studio): 00000000-0000-0000-0000-000000000003
-- ============================================================

-- ── profiles ──
insert into profiles (id, display_name, language, plan, plan_expires_at, onboarding_done)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'Arjeta Krasniqi',
    'sq', 'pro',
    now() + interval '30 days',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Bleron Morina',
    'en', 'free',
    null,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Studio Admin',
    'en', 'studio',
    now() + interval '365 days',
    true
  )
on conflict (id) do nothing;


-- ── albums ──
insert into albums (id, user_id, title, cover_url, pages, category, style_occasion, style_mood, is_public, share_token)
values
  (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Summer Wedding 2024',
    'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/beach-boat.jpg',
    '[{"id":"p1","background":"#1a1208","elements":[]}]'::jsonb,
    'photo-book',
    'wedding',
    'dark-moody',
    true,
    'test-share-token-abc123'
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'Bali Travel Diary',
    'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/nature-mountains.jpg',
    '[{"id":"p1","background":"#0d1a2a","elements":[]},{"id":"p2","background":"#0d1a2a","elements":[]}]'::jsonb,
    'photo-book',
    'travel',
    'warm-golden',
    false,
    null
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'Birthday Card for Ana',
    null,
    '[{"id":"p1","background":"#fff8f0","elements":[]}]'::jsonb,
    'photo-cards',
    'birthday',
    'vibrant-bold',
    false,
    null
  ),
  (
    'aaaaaaaa-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    'Phone Album — Quick Memories',
    null,
    '[]'::jsonb,
    'photo-book',
    'family',
    'warm-golden',
    false,
    null
  )
on conflict (id) do nothing;


-- ── photos ──
insert into photos (id, album_id, user_id, url, cloudinary_id, width, height, dominant_colors)
values
  (
    'bbbbbbbb-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'https://res.cloudinary.com/demo/image/upload/v1/samples/couple.jpg',
    'samples/couple',
    1920, 1280,
    '["#2a1a08","#c8842e","#f4f0ea"]'::jsonb
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'https://res.cloudinary.com/demo/image/upload/v1/samples/landscapes/nature-mountains.jpg',
    'samples/landscapes/nature-mountains',
    2560, 1440,
    '["#0d1a2a","#4a8a6e","#e8d4a0"]'::jsonb
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'https://res.cloudinary.com/demo/image/upload/v1/samples/people/smiling-man.jpg',
    'samples/people/smiling-man',
    800, 800,
    '["#f5c842","#e8734a","#ffffff"]'::jsonb
  ),
  (
    'bbbbbbbb-0000-0000-0000-000000000004',
    'aaaaaaaa-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    'https://res.cloudinary.com/demo/image/upload/v1/samples/food/dish.jpg',
    'samples/food/dish',
    1080, 1080,
    '["#e85d2a","#f4d06e","#2a1808"]'::jsonb
  )
on conflict (id) do nothing;


-- ── videos ──
insert into videos (id, album_id, user_id, url, thumbnail_url, cloudinary_id, duration_sec, width, height, format)
values
  (
    'vvvvvvvv-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'https://res.cloudinary.com/demo/video/upload/v1/samples/elephants.mp4',
    'https://res.cloudinary.com/demo/video/upload/v1/samples/elephants.jpg',
    'samples/elephants',
    14.5,
    1920, 1080,
    'mp4'
  ),
  (
    'vvvvvvvv-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'https://res.cloudinary.com/demo/video/upload/v1/samples/sea-turtle.mp4',
    'https://res.cloudinary.com/demo/video/upload/v1/samples/sea-turtle.jpg',
    'samples/sea-turtle',
    28.0,
    1280, 720,
    'mp4'
  )
on conflict (id) do nothing;


-- ── qr_codes ──
insert into qr_codes (id, album_id, user_id, target_url, page_index, canvas_x, canvas_y, canvas_size, scan_count)
values
  (
    'qqqqqqqq-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'https://folio.co/view/aaaaaaaa-0000-0000-0000-000000000001?token=test-share-token-abc123',
    7,   -- last page of wedding album
    640, 460,  -- bottom-right area of canvas
    120,
    34
  )
on conflict (id) do nothing;


-- ── album_shares ──
insert into album_shares (id, album_id, user_id, share_token, allow_messages, view_count)
values
  (
    'ssssssss-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'test-share-token-abc123',
    true,
    47
  )
on conflict (id) do nothing;


-- ── album_messages ──
insert into album_messages (id, album_id, share_token, message_type, body, sender_name)
values
  (
    'mmmmmmmm-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'test-share-token-abc123',
    'text',
    'So beautiful! I cried happy tears seeing these 😭❤️',
    'Aunt Mirsada'
  ),
  (
    'mmmmmmmm-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'test-share-token-abc123',
    'text',
    'The photos came out amazing. Who did the editing?',
    null
  )
on conflict (id) do nothing;


-- ── ai_usage ──
insert into ai_usage (id, user_id, tier, model, tokens_used, album_id, action)
values
  (
    'cccccccc-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    3, 'claude-haiku-4-5-20251001', 1842,
    'aaaaaaaa-0000-0000-0000-000000000001',
    'generate'
  ),
  (
    'cccccccc-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    2, 'claude-haiku-4-5-20251001', 412,
    'aaaaaaaa-0000-0000-0000-000000000001',
    'refine'
  ),
  (
    'cccccccc-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    1, 'claude-haiku-4-5-20251001', 88,
    'aaaaaaaa-0000-0000-0000-000000000002',
    'caption'
  ),
  (
    'cccccccc-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    3, 'claude-haiku-4-5-20251001', 2100,
    'aaaaaaaa-0000-0000-0000-000000000004',
    'generate'  -- User B (free) has used 1 of 3 this month
  )
on conflict (id) do nothing;


-- ── exports ──
insert into exports (id, user_id, album_id, format, resolution, paid, payment_ref)
values
  (
    'dddddddd-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'pdf-a4-landscape', 300, true, 'pi_test_abc123'
  ),
  (
    'dddddddd-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'aaaaaaaa-0000-0000-0000-000000000002',
    'pdf-square', 72, false, null
  ),
  (
    'dddddddd-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'aaaaaaaa-0000-0000-0000-000000000003',
    'physical', 300, false, null
  )
on conflict (id) do nothing;


-- ── service_orders ──
insert into service_orders (id, user_id, name, email, phone, product_type, style_notes, photo_count, status, price_quoted)
values
  (
    'eeeeeeee-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Arjeta Krasniqi',
    'arjeta@example.com',
    '+383 44 111 222',
    'photo-book',
    'Wedding album, dark moody style with gold accents, Playfair font. Need it in 2 weeks.',
    52,
    'in_progress',
    49.00
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000002',
    null,
    'Bleron Morina',
    'bleron@example.com',
    null,
    'wall-art',
    'Family portrait, A3 print, minimalist white frame style.',
    1,
    'inquiry',
    null
  ),
  (
    'eeeeeeee-0000-0000-0000-000000000003',
    null,
    null,
    'printfan@example.com',
    null, null, null, null,
    'print_waitlist',
    null
  )
on conflict (id) do nothing;


-- ── print_waitlist ──
insert into print_waitlist (email, product_type)
values
  ('printfan@example.com',   'photo-book'),
  ('anotherfan@example.com', 'wall-art'),
  ('kosovofan@example.com',  'photo-cards')
on conflict (email) do nothing;


-- ── notifications ──
insert into notifications (id, user_id, type, title, body, link, read)
values
  (
    'nnnnnnnn-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'qr_scan_milestone',
    'Your album was scanned 50 times 🎉',
    '"Summer Wedding 2024" has been scanned 50 times via QR code.',
    '/album/aaaaaaaa-0000-0000-0000-000000000001/edit',
    false
  ),
  (
    'nnnnnnnn-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'album_message',
    'New message on your wedding album',
    'Aunt Mirsada left a message on "Summer Wedding 2024".',
    '/album/aaaaaaaa-0000-0000-0000-000000000001/edit',
    false
  ),
  (
    'nnnnnnnn-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'plan_expiring',
    'You have 2 of 3 free AI designs left this month',
    'Upgrade to Pro for 50 AI layouts per month.',
    '/pricing',
    true
  )
on conflict (id) do nothing;


-- ── mobile_sessions ──
insert into mobile_sessions (id, album_id, user_id, ai_prompt, device_type, flow_type)
values
  (
    'mobiiiiii-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    'Warm and cosy family memories from summer',
    'android',
    'ai_only'
  )
on conflict (id) do nothing;


-- ============================================================
-- SCHEMA SUMMARY
-- ============================================================
--
-- TABLE               RLS  PURPOSE
-- ─────────────────────────────────────────────────────────────────────
-- profiles            YES  Plan, language, onboarding state
-- albums              YES  Photo product projects (+ public share)
-- photos              YES  Uploaded images
-- videos              YES  Short video clips (≤30s, for digital albums)
-- frames              YES  PNG overlay assets
-- qr_codes            YES  QR codes linking physical→digital album
-- qr_scans            YES  Anonymous scan log + analytics
-- album_shares        YES  Share token + password + message settings
-- album_messages      YES  Voice/text notes left by QR scanners
-- ai_usage            YES  AI call log for quota enforcement
-- exports             YES  PDF and physical print job log
-- service_orders      NO   Done-for-you inquiry form (public insert)
-- print_waitlist      NO   Physical print launch email capture
-- upgrade_events      YES  Conversion funnel tracking
-- notifications       YES  In-app notification inbox
-- mobile_sessions     YES  Mobile flow analytics
--
-- VIEWS (no RLS — inherit from base tables):
--   monthly_ai_tier3_usage   → Quota check before Tier 3 calls
--   user_quota_status        → Full quota snapshot (used in editor header)
--   album_summary            → Dashboard card data (no full pages JSON)
--   qr_code_stats            → QR scan analytics with 7-day window
--
-- FUNCTIONS:
--   increment_qr_scan_count()   → Atomic QR scan counter + log
--   get_or_create_album_share() → Share token upsert + make album public
--   handle_new_user()           → Auto-create profile on signup
--   update_updated_at()         → Auto-update albums.updated_at
--
-- ============================================================
-- HOW TO TEST RLS (two-user isolation)
-- ============================================================
-- 1. Supabase Dashboard → Authentication → Users
-- 2. Create user_a@test.com and user_b@test.com
-- 3. Replace 00000000-...-000000000001 with User A UUID
--    and 00000000-...-000000000002 with User B UUID above
-- 4. Re-run this script
-- 5. Sign in as User A → albums query → sees only their albums
-- 6. Sign in as User B → albums query → sees only their albums
-- 7. User A cannot read, update, or delete User B's data
-- ============================================================