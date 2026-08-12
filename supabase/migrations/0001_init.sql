-- NYC Lines — Supabase schema, security (RLS), realtime, and seed data.
-- Run this once in your Supabase project (SQL Editor → paste → Run, or via the
-- Supabase CLI `supabase db push`).

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Public profile, 1:1 with Supabase Auth users.
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  username       text unique not null,
  avatar_initial text not null,
  created_at     timestamptz not null default now()
);

create table if not exists public.bars (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  address         text not null,
  latitude        double precision not null,
  longitude       double precision not null,
  rating          double precision not null default 0,
  distance        double precision not null default 0,
  google_place_id text unique,
  verified        boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  bar_id     uuid not null references public.bars (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  wait_min   int  not null check (wait_min >= 0 and wait_min <= 240),
  created_at timestamptz not null default now()
);
create index if not exists reports_bar_created_idx on public.reports (bar_id, created_at desc);

create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.profiles (id) on delete cascade,
  to_user    uuid not null references public.profiles (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (from_user, to_user)
);

create table if not exists public.friend_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  bar_id     uuid not null references public.bars (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists fn_user_created_idx on public.friend_notifications (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-create a profile when a user signs up (username comes from signUp meta).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_initial)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data ->> 'username', new.email), 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.bars enable row level security;
alter table public.reports enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_notifications enable row level security;

-- profiles: everyone (signed-in) can read; you can update your own
create policy "profiles_read"   on public.profiles for select to authenticated using (true);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

-- bars: readable by all signed-in users. Inserts happen ONLY via the
-- submit-place Edge Function (service role) after Google verification, so there
-- is intentionally no client INSERT policy.
create policy "bars_read" on public.bars for select to authenticated using (true);

-- reports: readable by all; you may insert your own
create policy "reports_read"   on public.reports for select to authenticated using (true);
create policy "reports_insert" on public.reports for insert to authenticated with check (auth.uid() = user_id);

-- friendships: see ones you're part of; request as yourself; accept ones sent to you
create policy "friendships_read"   on public.friendships for select to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);
create policy "friendships_insert" on public.friendships for insert to authenticated
  with check (auth.uid() = from_user);
create policy "friendships_update" on public.friendships for update to authenticated
  using (auth.uid() = to_user);

-- friend check-ins: insert your own; read your own + accepted friends'
create policy "fn_insert" on public.friend_notifications for insert to authenticated
  with check (auth.uid() = user_id);
create policy "fn_read" on public.friend_notifications for select to authenticated using (
  user_id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.from_user = auth.uid() and f.to_user = friend_notifications.user_id)
        or (f.to_user   = auth.uid() and f.from_user = friend_notifications.user_id))
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime (replaces Socket.io): broadcast row changes on these tables.
-- ─────────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.reports;
alter publication supabase_realtime add table public.bars;
alter publication supabase_realtime add table public.friend_notifications;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: ~15 real East Village / LES bars (verified).
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.bars (name, address, latitude, longitude, rating, distance, verified) values
  ('The Wren', '64 E 1st St', 40.72335, -73.99056, 4.5, 0.2, true),
  ('Pouring Ribbons', '225 Avenue B', 40.72705, -73.97874, 4.6, 0.6, true),
  ('Death & Co', '433 E 6th St', 40.72627, -73.98372, 4.7, 0.4, true),
  ('Amor y Amargo', '443 E 6th St', 40.72637, -73.98347, 4.4, 0.4, true),
  ('Rue B', '188 Avenue B', 40.72563, -73.97897, 4.3, 0.6, true),
  ('Please Don''t Tell', '113 St Marks Pl', 40.72732, -73.98463, 4.6, 0.5, true),
  ('Angel''s Share', '8 Stuyvesant St', 40.72967, -73.98893, 4.5, 0.6, true),
  ('Attaboy', '134 Eldridge St', 40.71903, -73.99124, 4.7, 0.7, true),
  ('Mr. Purple', '180 Orchard St', 40.72122, -73.98825, 4.2, 0.5, true),
  ('The Wayland', '700 E 9th St', 40.72595, -73.97763, 4.4, 0.7, true),
  ('Niagara', '112 Avenue A', 40.72588, -73.98392, 4.1, 0.4, true),
  ('Berlin', '25 Avenue A', 40.72268, -73.98742, 4.2, 0.3, true),
  ('Boilermaker', '13 First Ave', 40.72402, -73.98826, 4.0, 0.3, true),
  ('Bar Goto', '245 Eldridge St', 40.72236, -73.98968, 4.5, 0.4, true),
  ('Ten Bells', '247 Broome St', 40.71803, -73.99069, 4.4, 0.8, true)
on conflict do nothing;
