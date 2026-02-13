-- Enable UUID support
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key,
  username text not null unique,
  email text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key,
  host_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('waiting', 'playing', 'finished')) default 'waiting',
  created_at timestamptz not null default now()
);

create table if not exists public.room_participants (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('host', 'guest', 'spectator')) default 'spectator',
  hand_raised boolean not null default false,
  is_approved_player boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.games (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  board jsonb not null,
  turn text not null check (turn in ('X', 'O')),
  winner text,
  status text not null check (status in ('playing', 'finished')) default 'playing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rooms_host_id on public.rooms(host_id);
create index if not exists idx_rooms_status on public.rooms(status);
create index if not exists idx_room_participants_room on public.room_participants(room_id);
create index if not exists idx_room_participants_user on public.room_participants(user_id);
create index if not exists idx_games_room_id on public.games(room_id);
create index if not exists idx_games_status on public.games(status);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_games_updated_at on public.games;
create trigger trg_games_updated_at
before update on public.games
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.games enable row level security;

-- Backend calls come through Socket/API server using anon key.
-- For stricter production security, switch backend to service role key and tighten policies.
create policy "public users policy"
on public.users for all
using (true)
with check (true);

create policy "public rooms policy"
on public.rooms for all
using (true)
with check (true);

create policy "public room participants policy"
on public.room_participants for all
using (true)
with check (true);

create policy "public games policy"
on public.games for all
using (true)
with check (true);
