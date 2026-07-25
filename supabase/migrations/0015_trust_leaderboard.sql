-- v2: trust scoring, accuracy rating, submit bans, and leaderboard.
-- See docs/v2-trust-leaderboard.md for the design.

-- ── schema ────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists trust_score        int  not null default 0,
  add column if not exists accuracy_rating    numeric,               -- 1.00–5.00, null until >=5 scored
  add column if not exists scored_reports     int  not null default 0,
  add column if not exists accurate_reports   int  not null default 0,
  add column if not exists submit_banned_until timestamptz;

alter table public.reports
  add column if not exists consensus_wait numeric,
  add column if not exists accuracy       text not null default 'unscored',  -- accurate|off|neutral|unscored
  add column if not exists points_awarded int  not null default 0,
  add column if not exists scored_at      timestamptz;

create index if not exists reports_unscored_idx on public.reports (created_at) where accuracy = 'unscored';

-- The displayed wait is a TRUST-WEIGHTED aggregate of recent reports: the app
-- joins each recent report to its reporter's profiles.trust_score and weights
-- proven reporters more (see lib/waittime.js). This index keeps that join fast.
create index if not exists reports_user_idx on public.reports (user_id);

-- ── ban enforcement (defense in depth; client also checks) ──────────────────
create or replace function public.block_banned_reports()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.profiles p
    where p.id = new.user_id and p.submit_banned_until is not null and p.submit_banned_until > now()
  ) then
    raise exception 'submit_banned';
  end if;
  return new;
end;
$$;
drop trigger if exists reports_ban_guard on public.reports;
create trigger reports_ban_guard before insert on public.reports
  for each row execute function public.block_banned_reports();

-- ── scoring engine ──────────────────────────────────────────────────────────
-- Idempotent: scores reports that have settled (>=15 min old) against the median
-- of peer reports at the same venue within +/-30 min. Safe to call often; only
-- touches still-unscored rows. Returns how many it newly resolved.
create or replace function public.score_reports()
returns int
language plpgsql security definer set search_path = public as $$
declare
  r record; peer_count int; consensus numeric; err numeric; pts int; verdict text; n int := 0;
begin
  for r in
    select * from public.reports
    where accuracy = 'unscored' and created_at <= now() - interval '15 minutes'
    order by created_at asc
    limit 300
  loop
    select count(*), percentile_cont(0.5) within group (order by wait_min)
      into peer_count, consensus
    from public.reports p
    where p.bar_id = r.bar_id
      and p.user_id <> r.user_id
      and p.created_at between r.created_at - interval '30 minutes'
                          and r.created_at + interval '30 minutes';

    if peer_count < 3 then
      -- not enough peers; retire (no penalty) only once the report is a day old
      if r.created_at <= now() - interval '24 hours' then
        update public.reports set accuracy = 'neutral', scored_at = now(), points_awarded = 0 where id = r.id;
        n := n + 1;
      end if;
      continue;
    end if;

    err := abs(r.wait_min - consensus);
    if err <= greatest(8, 0.25 * consensus) then
      verdict := 'accurate'; pts := 10;
    elsif err >= greatest(20, 0.60 * consensus) then
      verdict := 'off'; pts := -15;
    else
      verdict := 'neutral'; pts := 0;
    end if;

    update public.reports
      set accuracy = verdict, consensus_wait = consensus, points_awarded = pts, scored_at = now()
      where id = r.id;

    update public.profiles
      set trust_score      = trust_score + pts,
          scored_reports   = scored_reports + 1,
          accurate_reports = accurate_reports + (case when verdict = 'accurate' then 1 else 0 end),
          accuracy_rating  = round(
            1 + 4 * (accurate_reports + (case when verdict = 'accurate' then 1 else 0 end))::numeric
                  / (scored_reports + 1), 2)
      where id = r.user_id;

    n := n + 1;
  end loop;

  -- ban repeat offenders: trust floor, or >=5 'off' reports in the last 7 days
  update public.profiles pr
    set submit_banned_until = now() + interval '30 days',
        trust_score = greatest(trust_score, 5)
  where (pr.submit_banned_until is null or pr.submit_banned_until < now())
    and (
      pr.trust_score <= -50
      or (select count(*) from public.reports rr
          where rr.user_id = pr.id and rr.accuracy = 'off'
            and rr.scored_at >= now() - interval '7 days') >= 5
    );

  return n;
end;
$$;
grant execute on function public.score_reports() to authenticated;

-- ── leaderboard ─────────────────────────────────────────────────────────────
-- timeframe: 'week' (points earned since Monday) or 'all' (lifetime trust).
create or replace function public.leaderboard(p_timeframe text default 'all', lim int default 100)
returns table (id uuid, username text, avatar_initial text, trust_score int,
               accuracy_rating numeric, scored_reports int, points int)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.username, pr.avatar_initial, pr.trust_score, pr.accuracy_rating, pr.scored_reports,
    (case when p_timeframe = 'week'
      then coalesce((select sum(rp.points_awarded) from public.reports rp
                     where rp.user_id = pr.id and rp.scored_at >= date_trunc('week', now())), 0)
      else pr.trust_score end)::int as points
  from public.profiles pr
  where pr.scored_reports > 0
  order by points desc, pr.accuracy_rating desc nulls last, pr.username asc
  limit lim;
$$;
grant execute on function public.leaderboard(text, int) to authenticated, anon;

-- Optional automation (enable pg_cron in Supabase → Database → Extensions):
--   select cron.schedule('score-reports','*/5 * * * *',$$select public.score_reports()$$);
-- Until then the app calls score_reports() opportunistically after check-ins.
