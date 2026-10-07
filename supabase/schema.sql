-- FINB — Fake International Bank · Supabase schema (optional cloud layer)
--
-- FINB is a fictional game-bank. This schema stores *game* data only: a
-- username, fake Credits, Liberals, card tier, streak, aggregate stats and the
-- public activity feed. It has no real money, no payment instruments, no
-- government identifiers and no contact details. Never add those columns.
--
-- Apply with:
--   supabase db push                     # or: psql "$DATABASE_URL" -f supabase/schema.sql
--
-- The browser client only ever holds the public anon key. Row Level Security
-- keeps every write scoped to the owning identity (auth.uid()), and the
-- leaderboard is read-only for anonymous clients.

-- ---------------------------------------------------------------------------
-- 1. Profiles: one row per linked player, keyed by the Supabase auth user.
-- ---------------------------------------------------------------------------
-- Note: `id` is the Supabase auth user id (auth.uid()) supplied by the client, but
-- it is intentionally NOT a foreign key into auth.users: operators frequently seed
-- a fictional ladder, and fixtures have no auth user behind them. Delete a profile
-- row whenever you delete the matching auth user.
create table if not exists public.profiles (
  id            uuid primary key,
  username      text not null check (char_length(username) between 3 and 24),
  credits       bigint not null default 0 check (credits >= 0),
  liberals      integer not null default 0 check (liberals >= 0),
  card_tier     text not null default 'regular'
                  check (card_tier in ('regular','bass','gold','me','platinum','series')),
  streak        integer not null default 0 check (streak >= 0),
  level         integer not null default 1,
  games_played  integer not null default 0,
  games_won     integer not null default 0,
  multiplayer_won integer not null default 0,
  perfect_strikes integer not null default 0,
  season_id     text,
  linked_play_games boolean not null default false,
  stats         jsonb not null default '{}'::jsonb,
  combo         jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists profiles_username_key on public.profiles (lower(username));
create index if not exists profiles_credits_idx on public.profiles (credits desc);
create index if not exists profiles_liberals_idx on public.profiles (liberals desc);

-- ---------------------------------------------------------------------------
-- 2. Activity feed: the shared "floor" wall used by the Friends Zone.
-- ---------------------------------------------------------------------------
create table if not exists public.activity (
  id          bigserial primary key,
  player_id   uuid references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('game','reward','achievement','social','transfer','referral','season','card','trade','business')),
  title       text not null check (char_length(title) <= 160),
  amount      bigint,
  created_at  timestamptz not null default now()
);

create index if not exists activity_created_idx on public.activity (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Friendships: directed links, unique per pair. Presence is derived from
--    `last_seen_at` so we never need a separate presence table.
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  id          bigserial primary key,
  player_id   uuid not null references public.profiles(id) on delete cascade,
  friend_id   uuid not null references public.profiles(id) on delete cascade,
  favourite   boolean not null default false,
  emote       text,
  created_at  timestamptz not null default now(),
  constraint friendships_not_self check (player_id <> friend_id),
  constraint friendships_unique unique (player_id, friend_id)
);

-- ---------------------------------------------------------------------------
-- 4. Challenges: friend-vs-friend score targets on a specific cabinet.
-- ---------------------------------------------------------------------------
create table if not exists public.challenges (
  id           uuid primary key default gen_random_uuid(),
  game_id      text not null,
  metric       text not null default 'score' check (metric in ('score','wins','credits')),
  target       integer not null check (target > 0),
  reward       integer not null default 50 check (reward between 0 and 1000),
  created_by   uuid not null references public.profiles(id) on delete cascade,
  opponent_id  uuid not null references public.profiles(id) on delete cascade,
  state        text not null default 'open' check (state in ('open','won','lost','expired')),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create index if not exists challenges_opponent_idx on public.challenges (opponent_id, state);

-- ---------------------------------------------------------------------------
-- 5. Private rooms: invite codes for player-run lobbies (chat stays ephemeral).
-- ---------------------------------------------------------------------------
create table if not exists public.rooms (
  code        text primary key check (code ~ '^[A-Z0-9-]{4,12}$'),
  name        text not null check (char_length(name) <= 60),
  host_id     uuid not null references public.profiles(id) on delete cascade,
  mode        text not null,
  members     integer not null default 1 check (members between 1 and 13),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. Seasonal scores: the 14-day event ladder.
-- ---------------------------------------------------------------------------
create table if not exists public.season_scores (
  player_id   uuid not null references public.profiles(id) on delete cascade,
  season_id   text not null,
  credits     bigint not null default 0,
  liberals    integer not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (player_id, season_id)
);

-- ---------------------------------------------------------------------------
-- 7. Row Level Security — the whole point of the anon key being public.
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.activity      enable row level security;
alter table public.friendships   enable row level security;
alter table public.challenges    enable row level security;
alter table public.rooms         enable row level security;
alter table public.season_scores enable row level security;

-- profiles: anyone may read the ladder, only the owner may write their row.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert with check (auth.uid() = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- activity: readable by all, writable only as yourself.
drop policy if exists activity_read on public.activity;
create policy activity_read on public.activity for select using (true);

drop policy if exists activity_insert_self on public.activity;
create policy activity_insert_self on public.activity for insert with check (auth.uid() = player_id);

-- friendships: you only see and manage your own edges.
drop policy if exists friendships_rw_self on public.friendships;
create policy friendships_rw_self on public.friendships for all using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- challenges: both sides can read, only the creator can open one.
drop policy if exists challenges_read_participants on public.challenges;
create policy challenges_read_participants on public.challenges for select using (auth.uid() in (created_by, opponent_id));

drop policy if exists challenges_insert_self on public.challenges;
create policy challenges_insert_self on public.challenges for insert with check (auth.uid() = created_by);

drop policy if exists challenges_update_participants on public.challenges;
create policy challenges_update_participants on public.challenges for update using (auth.uid() in (created_by, opponent_id));

-- rooms: hosts own their room rows.
drop policy if exists rooms_rw_host on public.rooms;
create policy rooms_rw_host on public.rooms for all using (auth.uid() = host_id) with check (auth.uid() = host_id);

-- season scores: public ladder, self-only writes.
drop policy if exists season_read on public.season_scores;
create policy season_read on public.season_scores for select using (true);

drop policy if exists season_write_self on public.season_scores;
create policy season_write_self on public.season_scores for all using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- ---------------------------------------------------------------------------
-- 8. Touch updated_at on profile writes.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 9. Leaderboard view used by the app's Live Ranks screen.
-- ---------------------------------------------------------------------------
create or replace view public.leaderboard as
select
  p.id,
  p.username,
  p.credits,
  p.liberals,
  p.card_tier,
  p.level,
  p.linked_play_games,
  rank() over (order by p.credits desc) as credit_rank,
  rank() over (order by p.liberals desc) as liberal_rank
from public.profiles p;

comment on view public.leaderboard is 'FINB fictional ladder — Credits and Liberals are game points with no cash value.';

-- ---------------------------------------------------------------------------
-- 10. Simulation note for operators.
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- 11. Market ticks: an append-only feed of the (fictional) exchange snapshots.
--     Written by signed-in devices only; read-back is optional and cheap.
-- ---------------------------------------------------------------------------
create table if not exists public.market_ticks (
  id          bigserial primary key,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists market_ticks_created_idx on public.market_ticks (created_at desc);

alter table public.market_ticks enable row level security;

drop policy if exists market_ticks_read on public.market_ticks;
create policy market_ticks_read on public.market_ticks for select using (true);

-- Only authenticated (including anonymous-session) devices may append ticks.
drop policy if exists market_ticks_insert_auth on public.market_ticks;
create policy market_ticks_insert_auth on public.market_ticks for insert to authenticated with check (true);

comment on table public.market_ticks is
  'Random-walk snapshots of the fictional FINB exchange. Prices are game numbers, not securities.';

comment on table public.profiles is
  'FINB game profiles. Fictional simulation: no real money, no card data, no PII beyond a chosen username.';
