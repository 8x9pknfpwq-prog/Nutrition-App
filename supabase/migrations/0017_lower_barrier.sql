-- Lower the barrier to entry for earning credit and appearing on the leaderboard.
--
-- The v1 rules assumed density that doesn't exist yet: a report only scored when
-- >=3 OTHER people reported the same bar within +/-30 min, and the leaderboard
-- only listed users who'd already been scored. Early on that means nobody earns
-- anything and the board is empty — a classic cold-start trap.
--
-- Changes:
--   1. Peer requirement to JUDGE accuracy drops 3 -> 2.
--   2. When there still aren't enough peers, a settled report now earns small
--      PARTICIPATION points immediately (instead of nothing), so every honest
--      report counts. Participation builds trust_score but does NOT affect the
--      accuracy rating (which still requires judged reports), so ratings stay
--      meaningful.
--   3. The leaderboard includes anyone with any points or any scored report,
--      not only the already-scored — so it fills up from day one.
--
-- Idempotent: safe to run more than once (CREATE OR REPLACE).

create or replace function public.score_reports()
returns int
language plpgsql security definer set search_path = public as $$
declare
  r record; peer_count int; consensus numeric; err numeric; pts int; verdict text; n int := 0;
  participation constant int := 3;   -- points for simply showing up and reporting
  min_peers    constant int := 2;    -- peers needed to JUDGE accuracy (was 3)
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

    if peer_count < min_peers then
      -- Not enough peers to judge accuracy — but the report still counts.
      -- Award participation points and finalize (so it isn't re-scored forever).
      -- Does NOT touch scored_reports/accurate_reports, so the accuracy rating
      -- stays based only on reports we could actually judge.
      update public.reports
        set accuracy = 'neutral', consensus_wait = null,
            points_awarded = participation, scored_at = now()
        where id = r.id;
      update public.profiles
        set trust_score = trust_score + participation
        where id = r.user_id;
      n := n + 1;
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

  -- Ban repeat offenders (unchanged): trust floor, or >=5 'off' in the last 7 days.
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

-- Leaderboard now includes anyone who has earned any trust or been scored,
-- so participants appear immediately (was: only users with scored_reports > 0).
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
  where pr.trust_score <> 0 or pr.scored_reports > 0
  order by points desc, pr.accuracy_rating desc nulls last, pr.username asc
  limit lim;
$$;
grant execute on function public.leaderboard(text, int) to authenticated, anon;
