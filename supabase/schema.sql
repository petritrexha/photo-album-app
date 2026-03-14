-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Albums table
create table if not exists albums (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Untitled Album',
  cover_url text,
  pages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Photos table
create table if not exists photos (
  id uuid default gen_random_uuid() primary key,
  album_id uuid references albums(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  cloudinary_id text,
  width integer default 0,
  height integer default 0,
  created_at timestamptz default now()
);

-- Row Level Security (users only see their own data)
alter table albums enable row level security;
alter table photos enable row level security;

create policy "Users manage own albums"
  on albums for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own photos"
  on photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Frames table (PNG/WebP assets with transparency: borders, overlays, stickers)
create table if not exists frames (
  id uuid default gen_random_uuid() primary key,
  album_id uuid references albums(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  cloudinary_id text,
  name text not null default 'Frame',
  width integer default 0,
  height integer default 0,
  created_at timestamptz default now()
);

alter table frames enable row level security;

create policy "Users manage own frames"
  on frames for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at on album save
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger albums_updated_at
  before update on albums
  for each row execute function update_updated_at();
