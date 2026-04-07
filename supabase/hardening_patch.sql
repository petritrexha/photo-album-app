-- ============================================================
-- FOLIO HARDENING PATCH (RUN ON EXISTING SUPABASE PROJECT)
-- Date: 2026-04-02
-- ============================================================

begin;

create extension if not exists "pgcrypto";

-- Remove permissive public read policies that exposed share tokens/metadata.
drop policy if exists "albums_public_read" on albums;
drop policy if exists "share_public_read" on album_shares;

-- Ensure ownership fields are strict where applicable.
alter table photos alter column album_id set not null;
alter table photos alter column user_id set not null;
alter table frames alter column user_id set not null;
alter table qr_codes alter column album_id set not null;
alter table qr_codes alter column user_id set not null;
alter table qr_scans alter column qr_code_id set not null;
alter table qr_scans alter column album_id set not null;
alter table album_shares alter column user_id set not null;
alter table album_messages alter column album_id set not null;
alter table ai_usage alter column user_id set not null;

-- Tighten qr_scans insert validation to prevent album mismatch.
drop policy if exists "qr_scan_insert_valid" on qr_scans;
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

-- Only allow messages when sharing actually allows messages.
drop policy if exists "message_insert_valid" on album_messages;
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

-- Performance indexes for common filters/joins.
create index if not exists idx_albums_user_id on albums(user_id);
create index if not exists idx_albums_updated_at on albums(updated_at desc);
create index if not exists idx_photos_album_id on photos(album_id);
create index if not exists idx_photos_user_id on photos(user_id);
create index if not exists idx_frames_album_id on frames(album_id);
create index if not exists idx_frames_user_id on frames(user_id);
create index if not exists idx_qr_codes_album_id on qr_codes(album_id);
create index if not exists idx_qr_codes_user_id on qr_codes(user_id);
create index if not exists idx_qr_scans_album_id on qr_scans(album_id);
create index if not exists idx_qr_scans_qr_code_id on qr_scans(qr_code_id);
create index if not exists idx_album_messages_album_id on album_messages(album_id);
create index if not exists idx_ai_usage_user_used_at on ai_usage(user_id, used_at desc);

commit;

