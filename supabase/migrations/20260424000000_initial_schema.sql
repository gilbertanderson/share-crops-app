-- ShareCrops relational schema replacing the single kv_store_dd877831 JSONB table.
-- Run with: supabase db push

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text not null default '',
  bio         text,
  social_url  text,
  profile_photo_url text,
  password_hash text not null,
  created_at  timestamptz not null default now()
);

create index if not exists users_email_idx on users (email);

-- ============================================================
-- COMMUNITIES
-- ============================================================
create table if not exists communities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  zip_code    text not null,
  created_by  uuid not null references users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists communities_zip_idx on communities (zip_code);

-- ============================================================
-- COMMUNITY MEMBERS
-- ============================================================
create table if not exists community_members (
  community_id uuid not null references communities (id) on delete cascade,
  user_id      uuid not null references users (id) on delete cascade,
  is_active    boolean not null default true,
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index if not exists community_members_user_idx on community_members (user_id);

-- ============================================================
-- LISTINGS
-- ============================================================
create table if not exists listings (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references users (id) on delete cascade,
  community_id  uuid references communities (id) on delete set null,
  zip_code      text not null default '',
  title         text not null,
  description   text not null default '',
  quantity      text,
  looking_for   text,
  photos        text[] not null default '{}',
  status        text not null default 'active' check (status in ('active', 'completed', 'expired')),
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

create index if not exists listings_seller_idx     on listings (seller_id);
create index if not exists listings_community_idx  on listings (community_id);
create index if not exists listings_status_idx     on listings (status);
create index if not exists listings_expires_at_idx on listings (expires_at);

-- ============================================================
-- OFFERS
-- ============================================================
create table if not exists offers (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references listings (id) on delete cascade,
  buyer_id         uuid not null references users (id) on delete cascade,
  seller_id        uuid not null references users (id) on delete cascade,
  offered_produce  text not null,
  message          text,
  status           text not null default 'pending'
                     check (status in ('pending', 'accepted', 'declined', 'completed')),
  accepted_at      timestamptz,
  declined_at      timestamptz,
  completed_at     timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists offers_listing_idx on offers (listing_id);
create index if not exists offers_buyer_idx   on offers (buyer_id);
create index if not exists offers_seller_idx  on offers (seller_id);
create index if not exists offers_status_idx  on offers (status);

-- ============================================================
-- THREADS (chat threads, one per listing × buyer pair)
-- ============================================================
create table if not exists threads (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references listings (id) on delete cascade,
  last_message    text,
  last_message_at timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists threads_listing_idx on threads (listing_id);

-- ============================================================
-- THREAD PARTICIPANTS
-- ============================================================
create table if not exists thread_participants (
  thread_id uuid not null references threads (id) on delete cascade,
  user_id   uuid not null references users (id) on delete cascade,
  primary key (thread_id, user_id)
);

create index if not exists thread_participants_user_idx on thread_participants (user_id);

-- ============================================================
-- MESSAGES
-- ============================================================
create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references threads (id) on delete cascade,
  sender_id  uuid not null references users (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_idx     on messages (thread_id);
create index if not exists messages_thread_time_idx on messages (thread_id, created_at);

-- ============================================================
-- RATINGS
-- ============================================================
create table if not exists ratings (
  id            uuid primary key default gen_random_uuid(),
  offer_id      uuid not null references offers (id) on delete cascade,
  rated_user_id uuid not null references users (id) on delete cascade,
  rater_user_id uuid not null references users (id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now(),
  -- one rating per rater per offer
  unique (offer_id, rater_user_id)
);

create index if not exists ratings_rated_user_idx on ratings (rated_user_id);

-- ============================================================
-- AGGREGATE RATING CACHE
-- Updated by trigger so reads are O(1) without aggregating ratings table.
-- ============================================================
alter table users
  add column if not exists rating       numeric(3,2) not null default 0,
  add column if not exists rating_count int          not null default 0;

create or replace function update_user_rating() returns trigger language plpgsql as $$
begin
  update users
  set
    rating_count = (select count(*) from ratings where rated_user_id = NEW.rated_user_id),
    rating       = (select coalesce(avg(rating), 0) from ratings where rated_user_id = NEW.rated_user_id)
  where id = NEW.rated_user_id;
  return NEW;
end;
$$;

drop trigger if exists ratings_after_insert on ratings;
create trigger ratings_after_insert
  after insert on ratings
  for each row execute function update_user_rating();

-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS; the Edge Function service-role key bypasses it.
-- These policies protect direct client access if ever enabled.
-- ============================================================
alter table users              enable row level security;
alter table communities        enable row level security;
alter table community_members  enable row level security;
alter table listings           enable row level security;
alter table offers             enable row level security;
alter table threads            enable row level security;
alter table thread_participants enable row level security;
alter table messages           enable row level security;
alter table ratings            enable row level security;

-- Allow service role full access (used by Edge Functions)
-- Individual user policies would be added here when switching to
-- direct Supabase client auth rather than the Edge Function API layer.
